import { Observable, Subject, concatMap, mergeMap, share } from 'rxjs';
import { AsyncEntityEventHandler, AtLeastOne, CommandSubject, EntityEventHandler, MEvent, MEventStatus, StoreOperation, WithID } from './mobus';

function getEntity<Entity>(
  store: Map<string, Entity>,
  command: CommandSubject<Entity & WithID, WithID>,
  isSingleStore: boolean
) {
  const entity = isSingleStore ? store.get('') : command.payload ? store.get(command.payload.id) : undefined;
  const originalEntity = entity ? { ...entity } : undefined;
  return { originalEntity, entity } as {
    entity: (Entity & WithID) | undefined;
    originalEntity: (Entity & WithID) | undefined;
  };
}

function singleToMap<Entity>(singleStore: Entity) {
  const store = {
    _state: singleStore,
  };

  return {
    get: () => store._state,
    set: (_: string, state: Entity) => (store._state = state),
    delete: () => {
      throw new Error('Cannot delete in singleStore');
    },
  };
}

export function stateMachineFactory<EntityNoID>(
    entityName: string,
    {
      store,
      storeSingle,
      parallel = false,
      wrapper = (callback) => callback(),
    }: { parallel?: boolean; wrapper?: (callback: () => void) => void } & AtLeastOne<{
      store: Map<string, EntityNoID & WithID>;
      storeSingle: EntityNoID;
    }>
  ) {
    type Entity = EntityNoID & WithID;
    const command$ = new Subject() as Observable<CommandSubject<Entity, WithID>>;
    const storeAsMap = store || (singleToMap(storeSingle!) as unknown as Map<string, Entity>);
    const entity$ = command$.pipe(
      (parallel ? mergeMap : concatMap)(async (command: CommandSubject<Entity, WithID>) => {
        const event: MEvent<WithID> = {
          op: command.op,
          entityInStore: false,
          entityName,
          payload: command.payload,
          status: MEventStatus.Complete,
          type: command.eventType,
        };
        const { originalEntity, entity } = getEntity<EntityNoID>(storeAsMap, command, !!storeSingle);
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
                storeAsMap.set(entityResult!.id, entityResult!);
              });
            } else if (command.op === StoreOperation.delete) {
              wrapper(() => {
                storeAsMap.delete(entityResult!.id);
              });
            } else {
              wrapper(() => {
                entityResult = command.eventHandler!(entity, event);
                if (!entity) {
                  storeAsMap.set(entityResult.id, entityResult);
                }
              });
            }
          } catch (err) {
            event.status = MEventStatus.Error;
            if (!originalEntity && entityResult) {
              wrapper(() => {
                storeAsMap.delete(entityResult!.id);
              });
            } else if (originalEntity) {
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
              entityResult = await command.asyncEventHandler(entity, event);
              wrapper(() => {
                storeAsMap.set(entityResult!.id, entityResult!);
              });
            } else if (command.op === StoreOperation.delete) {
              wrapper(() => {
                storeAsMap.delete(entityResult!.id);
              });
            } else {
              await wrapper(async () => {
                entityResult = await command.asyncEventHandler!(entity, event);
                if (!entity) {
                  storeAsMap.set(entityResult!.id, entityResult);
                }
              });
            }
          } catch (err) {
            event.status = MEventStatus.Error;
            if (!originalEntity && entityResult) {
              wrapper(() => {
                storeAsMap.delete(entityResult!.id);
              });
            } else if (originalEntity) {
              wrapper(() => {
                storeAsMap.set(originalEntity.id, originalEntity);
              });
            }
          }
        }
  
        if (!command.eventHandler && !command.asyncEventHandler && command.payload.id) {
          entityResult = command.payload as Entity;
          wrapper(() => {
            storeAsMap.set(command.payload.id, command.payload as Entity);
          });
        }
        command.resolve(entityResult as Entity);
        return [entityResult, event] as [Entity, MEvent<WithID>];
      }),
      share()
    );
  
    // Overload No ID requires a handler
    function commandFactory<Command extends object | void>({
      op,
      eventType,
      eventHandler,
      asyncEventHandler,
    }: {
      eventType?: string;
      op?: StoreOperation.set;
    } & AtLeastOne<{
      asyncEventHandler: AsyncEntityEventHandler<Entity, Command>;
      eventHandler: EntityEventHandler<Entity, Command>;
    }>): (command: Command) => Promise<Entity>;
  
    // Overload WithID does not require a handler
    function commandFactory<Command extends WithID = Entity>({
      op,
      eventType,
      eventHandler,
      asyncEventHandler,
    }: {
      asyncEventHandler?: AsyncEntityEventHandler<Entity, Command>;
      eventHandler?: EntityEventHandler<Entity, Command>;
      eventType?: string;
      op?: StoreOperation;
    }): (command: Command) => Promise<Entity>;
  
    // Implementation
    function commandFactory<Command extends WithID | void = Entity>({
      op = StoreOperation.mutate,
      eventType,
      eventHandler,
      asyncEventHandler,
    }: {
      asyncEventHandler?: AsyncEntityEventHandler<Entity, Command>;
      eventHandler?: EntityEventHandler<Entity, Command>;
      eventType?: string;
      op?: StoreOperation;
    }): (command: Command) => Promise<Entity> {
      return function commandFunction(command: Command) {
        let resolve;
        const promise = new Promise<Entity>((r) => {
          resolve = r;
        });
        (command$ as Subject<unknown>).next({
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