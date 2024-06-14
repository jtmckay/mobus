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
exports.definedEntity = exports.commandFactory = exports.deleteCommandFactory = exports.hydrateCommandFactory = exports.useEntity = exports.stateMachineFactory = exports.MEventStatus = exports.CUD = void 0;
/* eslint-disable @typescript-eslint/no-non-null-assertion */
const mobx_1 = require("mobx");
const rxjs_1 = require("rxjs");
var CUD;
(function (CUD) {
    CUD["create"] = "create";
    CUD["delete"] = "delete";
    CUD["update"] = "update";
})(CUD || (exports.CUD = CUD = {}));
var MEventStatus;
(function (MEventStatus) {
    MEventStatus["Complete"] = "complete";
    MEventStatus["Error"] = "error";
    MEventStatus["Pending"] = "pending";
})(MEventStatus || (exports.MEventStatus = MEventStatus = {}));
function stateMachineFactory(entityType, store, command$, { parallel = false } = {}) {
    return command$.pipe(
    // eslint-disable-next-line complexity
    (parallel ? rxjs_1.mergeMap : rxjs_1.concatMap)((command) => __awaiter(this, void 0, void 0, function* () {
        const event = {
            cud: command.cud,
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
                if (command.cud === CUD.create) {
                    entityResult = command.eventHandler(entity, event);
                    (0, mobx_1.runInAction)(() => {
                        store.set(entityResult.id, entityResult);
                    });
                }
                else if (command.cud === CUD.delete) {
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
                if (command.cud === CUD.create) {
                    entityResult = yield command.asyncEventHandler(entity, event);
                    (0, mobx_1.runInAction)(() => {
                        store.set(entityResult.id, entityResult);
                    });
                }
                else if (command.cud === CUD.delete) {
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
        return [entityResult, event];
    })), (0, rxjs_1.share)());
}
exports.stateMachineFactory = stateMachineFactory;
function useEntity(useEffect, entity$, subscription) {
    useEffect(() => {
        const sub = entity$
            .pipe((0, rxjs_1.filter)(([_entity, event]) => event.status !== MEventStatus.Error))
            .subscribe(subscription);
        return () => {
            sub.unsubscribe();
        };
    }, [entity$, subscription]);
}
exports.useEntity = useEntity;
function hydrateCommandFactory(command$, eventType) {
    function commandFunction(command) {
        command$.next({
            payload: command,
            cud: CUD.create,
            eventType,
        });
    }
    return commandFunction;
}
exports.hydrateCommandFactory = hydrateCommandFactory;
function deleteCommandFactory(command$, eventType) {
    function commandFunction(command) {
        command$.next({
            payload: command,
            cud: CUD.delete,
            eventType,
        });
    }
    return commandFunction;
}
exports.deleteCommandFactory = deleteCommandFactory;
function commandFactory({ command$, cud = CUD.create, eventType, eventHandler, asyncEventHandler, }) {
    function commandFunction(command) {
        command$.next({
            payload: command,
            cud,
            eventType,
            eventHandler,
            asyncEventHandler,
        });
    }
    return commandFunction;
}
exports.commandFactory = commandFactory;
function definedEntity(entity) {
    if (!entity) {
        throw new Error('Entity does not exist');
    }
    return entity;
}
exports.definedEntity = definedEntity;
//# sourceMappingURL=mobus.js.map