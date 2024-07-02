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
function getEntity(store, command, isSingleStore) {
    const entity = isSingleStore ? store.get('') : command.payload ? store.get(command.payload.id) : undefined;
    const originalEntity = entity ? Object.assign({}, entity) : undefined;
    return { originalEntity, entity };
}
function singleToMap(singleStore) {
    const store = {
        _state: singleStore
    };
    return {
        get: () => store._state,
        set: (_, state) => store._state = state,
        delete: () => { throw new Error('Cannot delete in singleStore'); }
    };
}
function stateMachineFactory(entityName, { store, storeSingle, parallel = false, wrapper = (callback) => callback(), }) {
    const command$ = new rxjs_1.Subject();
    const storeAsMap = store ? store : singleToMap(storeSingle);
    const entity$ = command$.pipe(
    // eslint-disable-next-line complexity
    (parallel ? rxjs_1.mergeMap : rxjs_1.concatMap)((command) => __awaiter(this, void 0, void 0, function* () {
        const event = {
            op: command.op,
            entityInStore: false,
            entityName,
            payload: command.payload,
            status: MEventStatus.Complete,
            type: command.eventType,
        };
        const { originalEntity, entity } = getEntity(storeAsMap, command, !!storeSingle);
        if (originalEntity) {
            event.entityInStore = true;
        }
        let entityResult = entity;
        if (command.asyncEventHandler) {
            event.status = MEventStatus.Pending;
        }
        if (command.eventHandler) {
            try {
                if (command.op === StoreOperation.set) {
                    entityResult = command.eventHandler(entity, event);
                    wrapper(() => {
                        storeAsMap.set(entityResult.id, entityResult);
                    });
                }
                else if (command.op === StoreOperation.delete) {
                    wrapper(() => {
                        storeAsMap.delete(entityResult.id);
                    });
                }
                else {
                    wrapper(() => {
                        entityResult = command.eventHandler(entity, event);
                        if (!entity) {
                            storeAsMap.set(entityResult.id, entityResult);
                        }
                    });
                }
            }
            catch (err) {
                event.status = MEventStatus.Error;
                if (!originalEntity && entityResult) {
                    wrapper(() => {
                        storeAsMap.delete(entityResult.id);
                    });
                }
                else if (originalEntity) {
                    wrapper(() => {
                        storeAsMap.set(originalEntity.id, originalEntity);
                    });
                }
            }
        }
        if (command.asyncEventHandler) {
            event.status = MEventStatus.Complete;
            try {
                if (command.op === StoreOperation.set) {
                    entityResult = yield command.asyncEventHandler(entity, event);
                    wrapper(() => {
                        storeAsMap.set(entityResult.id, entityResult);
                    });
                }
                else if (command.op === StoreOperation.delete) {
                    wrapper(() => {
                        storeAsMap.delete(entityResult.id);
                    });
                }
                else {
                    yield wrapper(() => __awaiter(this, void 0, void 0, function* () {
                        entityResult = yield command.asyncEventHandler(entity, event);
                        if (!entity) {
                            storeAsMap.set(entityResult.id, entityResult);
                        }
                    }));
                }
            }
            catch (err) {
                event.status = MEventStatus.Error;
                if (!originalEntity && entityResult) {
                    wrapper(() => {
                        storeAsMap.delete(entityResult.id);
                    });
                }
                else if (originalEntity) {
                    wrapper(() => {
                        storeAsMap.set(originalEntity.id, originalEntity);
                    });
                }
            }
        }
        if (!command.eventHandler && !command.asyncEventHandler && command.payload.id) {
            entityResult = command.payload;
            wrapper(() => {
                storeAsMap.set(command.payload.id, command.payload);
            });
        }
        command.resolve(entityResult);
        return [entityResult, event];
    })), (0, rxjs_1.share)());
    // Implementation
    function commandFactory({ op = StoreOperation.mutate, eventType, eventHandler, asyncEventHandler, }) {
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
function aggregateFactory(aggregateName, store, { wrapper = (callback) => callback(), } = {}) {
    const aggregateInstance$$ = new rxjs_1.Subject();
    const handledEntities$ = [];
    function handleEntity({ entity$, eventHandlers, }) {
        const entityHandler$ = entity$.pipe((0, rxjs_1.filter)(([_entity, event]) => !!eventHandlers[event.type]), (0, rxjs_1.map)(([entity, event]) => {
            wrapper(() => eventHandlers[event.type](store, entity, event));
            return [store, { aggregateName, event }];
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