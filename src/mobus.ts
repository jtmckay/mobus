/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { runInAction, type ObservableMap } from 'mobx';
import { Observable, Subject, concatMap, filter, map, merge, mergeMap, share, switchMap } from 'rxjs';

export enum StoreOperation {
  delete = 'delete',
  mutate = 'mutate',
  set = 'set',
}

export enum MEventStatus {
  Complete = 'complete',
  Error = 'error',
  Pending = 'pending',
}

export type WithID = {
  id: string;
};

export type MEvent<Command> = {
  entityInStore: boolean;
  entityName: string;
  op: StoreOperation;
  payload: Command;
  status: MEventStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supplemental?: any;
  type: string;
};

export type CommandSubject<Entity extends WithID, Command> = {
  asyncEventHandler?: AsyncEntityEventHandler<Entity, Command>;
  eventHandler?: EntityEventHandler<Entity, Command>;
  eventType: string;
  op: StoreOperation;
  payload: Command;
  resolve: (entity: Entity) => void;
};

export type EntityEventHandler<Entity extends WithID, Command = Entity> = (
  entity: Entity | undefined,
  event: MEvent<Command>
) => Entity;

export type AsyncEntityEventHandler<Entity extends WithID, Command = Entity> = (
  entity: Entity | undefined,
  event: MEvent<Command>
) => Promise<Entity>;

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export function stateMachineFactory<Entity extends WithID>(
  entityType: string,
  store: ObservableMap<string, Entity>,
  { parallel = false } = {}
) {
  const command$ = new Subject() as Observable<CommandSubject<Entity, WithID>>;
  const entity$ = command$.pipe(
    // eslint-disable-next-line complexity
    (parallel ? mergeMap : concatMap)(async (command: CommandSubject<Entity, WithID>) => {
      const event: MEvent<WithID> = {
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
      const originalEntity = entity ? { ...entity } : undefined;
      let entityResult = entity;

      if (command.asyncEventHandler) {
        event.status = MEventStatus.Pending;
      }
      if (command.eventHandler) {
        try {
          if (command.op === StoreOperation.set) {
            entityResult = command.eventHandler(entity, event);
            runInAction(() => {
              store.set(entityResult!.id, entityResult!);
            });
          } else if (command.op === StoreOperation.delete) {
            runInAction(() => {
              store.delete(entityResult!.id);
            });
          } else {
            runInAction(() => {
              entityResult = command.eventHandler!(entity, event);
              if (!entity) {
                store.set(entityResult.id, entityResult);
              }
            });
          }
        } catch (err) {
          event.status = MEventStatus.Error;
          if (!originalEntity && entityResult) {
            runInAction(() => {
              store.delete(entityResult!.id);
            });
          } else if (originalEntity) {
            runInAction(() => {
              store.set(originalEntity.id, originalEntity);
            });
          }
        }
      }

      if (command.asyncEventHandler) {
        event.status = MEventStatus.Complete;
        try {
          if (command.op === StoreOperation.set) {
            entityResult = await command.asyncEventHandler(entity, event);
            runInAction(() => {
              store.set(entityResult!.id, entityResult!);
            });
          } else if (command.op === StoreOperation.delete) {
            runInAction(() => {
              store.delete(entityResult!.id);
            });
          } else {
            await runInAction(async () => {
              entityResult = await command.asyncEventHandler!(entity, event);
              if (!entity) {
                store.set(entityResult!.id, entityResult);
              }
            });
          }
        } catch (err) {
          event.status = MEventStatus.Error;
          if (!originalEntity && entityResult) {
            runInAction(() => {
              store.delete(entityResult!.id);
            });
          } else if (originalEntity) {
            runInAction(() => {
              store.set(originalEntity.id, originalEntity);
            });
          }
        }
      }

      if (!command.eventHandler && !command.asyncEventHandler && command.payload.id) {
        entityResult = command.payload as Entity;
        runInAction(() => {
          store.set(command.payload.id, command.payload as Entity);
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
    eventType: string;
    op: StoreOperation.set;
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
    eventType: string;
    op: StoreOperation.set | StoreOperation.mutate | StoreOperation.delete;
  }): (command: Command) => Promise<Entity>;

  // Implementation
  function commandFactory<Command extends WithID | void = Entity>({
    op = StoreOperation.set,
    eventType,
    eventHandler,
    asyncEventHandler,
  }: {
    asyncEventHandler?: AsyncEntityEventHandler<Entity, Command>;
    eventHandler?: EntityEventHandler<Entity, Command>;
    eventType: string;
    op: StoreOperation;
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

export function definedEntity<Entity extends WithID>(entity: Entity | undefined) {
  if (!entity) {
    throw new Error('Entity does not exist');
  }
  return entity;
}

export type AggregateEventHandler<Aggregate, Entity> = (
  aggregate: Aggregate,
  entity: Entity,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: MEvent<any>
) => void;

export function aggregateFactory<Aggregate>(store: Aggregate) {
  const aggregateInstance$$ = new Subject<Observable<Aggregate>>();
  const handledEntities$: Observable<Aggregate>[] = [];

  function handleEntity<Entity, Events extends string>({
    entity$,
    eventHandlers,
  }: {
    entity$: Observable<[Entity, MEvent<unknown>]>;
    eventHandlers: {
      [key in Events]?: AggregateEventHandler<Aggregate, Entity>;
    };
  }) {
    const entityHandler$: Observable<Aggregate> = entity$.pipe(
      filter(
        ([_entity, event]) =>
          !!(eventHandlers as { [key: string]: AggregateEventHandler<Aggregate, Entity> })[event.type]
      ),
      map(([entity, event]) => {
        runInAction(() =>
          (eventHandlers as { [key: string]: AggregateEventHandler<Aggregate, Entity> })[event.type](
            store,
            entity,
            event
          )
        );
        return store;
      })
    );
    handledEntities$.push(entityHandler$);

    aggregateInstance$$.next(merge(...handledEntities$).pipe(share()));
  }

  const aggregate$ = aggregateInstance$$.pipe(switchMap((i) => i));

  return {
    handleEntity,
    aggregate$,
    subscribe: () => aggregate$.subscribe(),
  };
}

export function effectFactory(useEffect: (anon: () => void, dependencyArray: unknown[]) => void) {
  return function useObservable<Entity>(entity$: Observable<Entity>, subscription?: (entity: Entity) => void) {
    useEffect(() => {
      const sub = entity$.subscribe(subscription);
      return () => {
        sub.unsubscribe();
      };
    }, [entity$, subscription]);
  };
}
