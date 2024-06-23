"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectFactory = exports.aggregateFactory = exports.definedEntity = exports.stateMachineFactory = exports.MEventStatus = exports.StoreOperation = void 0;
/* eslint-disable @typescript-eslint/no-non-null-assertion */
const mobx_1 = require("mobx");
const rxjs_1 = require("rxjs");
var StoreOperation;
(function (StoreOperation) {
    StoreOperation["delete"] = "delete";
    StoreOperation["mutate"] = "mutate";
    StoreOperation["set"] = "set";
})(StoreOperation || (exports.StoreOperation = StoreOperation = {}));
var MEventStatus;
(function (MEventStatus) {
    MEventStatus["Complete"] = "complete";
    MEventStatus["Error"] = "error";
    MEventStatus["Pending"] = "pending";
})(MEventStatus || (exports.MEventStatus = MEventStatus = {}));
function stateMachineFactory(entityType, store, { parallel = false } = {}) {
    const command$ = new rxjs_1.Subject();
    const entity$ = command$.pipe(
    // eslint-disable-next-line complexity
    (parallel ? rxjs_1.mergeMap : rxjs_1.concatMap)((command) => __awaiter(this, void 0, void 0, function* () {
        const event = {
            op: command.op,
            entityInStore: false,
            entityName: entityType,
            payload: command.payload,
            status: MEventStatus.Complete,
            type: command.eventType,
        };
        const entity = command.payload ? store.get(command.payload.id) : undefined;
        if (entity) {
            event.entityInStore = true;
        }
        const originalEntity = entity ? Object.assign({}, entity) : undefined;
        let entityResult = entity;
        if (command.asyncEventHandler) {
            event.status = MEventStatus.Pending;
        }
        if (command.eventHandler) {
            try {
                if (command.op === StoreOperation.set) {
                    entityResult = command.eventHandler(entity, event);
                    (0, mobx_1.runInAction)(() => {
                        store.set(entityResult.id, entityResult);
                    });
                }
                else if (command.op === StoreOperation.delete) {
                    (0, mobx_1.runInAction)(() => {
                        store.delete(entityResult.id);
                    });
                }
                else {
                    (0, mobx_1.runInAction)(() => {
                        entityResult = command.eventHandler(entity, event);
                        if (!entity) {
                            store.set(entityResult.id, entityResult);
                        }
                    });
                }
            }
            catch (err) {
                event.status = MEventStatus.Error;
                if (!originalEntity && entityResult) {
                    (0, mobx_1.runInAction)(() => {
                        store.delete(entityResult.id);
                    });
                }
                else if (originalEntity) {
                    (0, mobx_1.runInAction)(() => {
                        store.set(originalEntity.id, originalEntity);
                    });
                }
            }
        }
        if (command.asyncEventHandler) {
            event.status = MEventStatus.Complete;
            try {
                if (command.op === StoreOperation.set) {
                    entityResult = yield command.asyncEventHandler(entity, event);
                    (0, mobx_1.runInAction)(() => {
                        store.set(entityResult.id, entityResult);
                    });
                }
                else if (command.op === StoreOperation.delete) {
                    (0, mobx_1.runInAction)(() => {
                        store.delete(entityResult.id);
                    });
                }
                else {
                    yield (0, mobx_1.runInAction)(() => __awaiter(this, void 0, void 0, function* () {
                        entityResult = yield command.asyncEventHandler(entity, event);
                        if (!entity) {
                            store.set(entityResult.id, entityResult);
                        }
                    }));
                }
            }
            catch (err) {
                event.status = MEventStatus.Error;
                if (!originalEntity && entityResult) {
                    (0, mobx_1.runInAction)(() => {
                        store.delete(entityResult.id);
                    });
                }
                else if (originalEntity) {
                    (0, mobx_1.runInAction)(() => {
                        store.set(originalEntity.id, originalEntity);
                    });
                }
            }
        }
        if (!command.eventHandler && !command.asyncEventHandler && command.payload.id) {
            entityResult = command.payload;
            (0, mobx_1.runInAction)(() => {
                store.set(command.payload.id, command.payload);
            });
        }
        command.resolve(entityResult);
        return [entityResult, event];
    })), (0, rxjs_1.share)());
    // Implementation
    function commandFactory({ op = StoreOperation.set, eventType, eventHandler, asyncEventHandler, }) {
        return function commandFunction(command) {
            let resolve;
            const promise = new Promise((r) => {
                resolve = r;
            });
            command$.next({
                payload: command,
                op,
                eventType,
                eventHandler,
                asyncEventHandler,
                resolve,
            });
            return promise;
        };
    }
    return {
        entity$,
        command$,
        commandFactory,
        subscribe: () => entity$.subscribe(),
    };
}
exports.stateMachineFactory = stateMachineFactory;
function definedEntity(entity) {
    if (!entity) {
        throw new Error('Entity does not exist');
    }
    return entity;
}
exports.definedEntity = definedEntity;
function aggregateFactory(store) {
    const aggregateInstance$$ = new rxjs_1.Subject();
    const handledEntities$ = [];
    function handleEntity({ entity$, eventHandlers, }) {
        const entityHandler$ = entity$.pipe((0, rxjs_1.filter)(([_entity, event]) => !!eventHandlers[event.type]), (0, rxjs_1.map)(([entity, event]) => {
            (0, mobx_1.runInAction)(() => eventHandlers[event.type](store, entity, event));
            return store;
        }));
        handledEntities$.push(entityHandler$);
        aggregateInstance$$.next((0, rxjs_1.merge)(...handledEntities$).pipe((0, rxjs_1.share)()));
    }
    const aggregate$ = aggregateInstance$$.pipe((0, rxjs_1.switchMap)((i) => i));
    return {
        handleEntity,
        aggregate$,
        subscribe: () => aggregate$.subscribe(),
    };
}
exports.aggregateFactory = aggregateFactory;
function effectFactory(useEffect) {
    return function useObservable(entity$, subscription) {
        useEffect(() => {
            const sub = entity$.subscribe(subscription);
            return () => {
                sub.unsubscribe();
            };
        }, [entity$, subscription]);
    };
}
exports.effectFactory = effectFactory;
//# sourceMappingURL=mobus.js.map