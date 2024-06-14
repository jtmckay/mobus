/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { runInAction, type ObservableMap } from 'mobx';
import { concatMap, filter, mergeMap, share, type Observable, type Subject } from 'rxjs';

export enum CUD {
  create = 'create',
  delete = 'delete',
  update = 'update',
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
  cud: CUD;
  entityInStore: boolean;
  entityName: string;
  payload: Command;
  status: MEventStatus;
  type: string;
};

export type CommandSubject<Entity, Command> = {
  asyncEventHandler?: AsyncEntityEventHandler<Entity, Command>;
  cud: CUD;
  eventHandler?: EntityEventHandler<Entity, Command>;
  eventType: string;
  payload: Command;
};

export type EntityEventHandler<Entity, Command = Entity> = (
  entity: Entity | undefined,
  event: MEvent<Command>
) => Entity;

export type AsyncEntityEventHandler<Entity, Command = Entity> = (
  entity: Entity | undefined,
  event: MEvent<Command>
) => Promise<Entity>;

export function stateMachineFactory<Entity extends WithID>(
  entityType: string,
  store: ObservableMap<string, Entity>,
  command$: Observable<CommandSubject<Entity, WithID>>,
  { parallel = false } = {}
): Observable<[Entity, MEvent<unknown>]> {
  return command$.pipe(
    // eslint-disable-next-line complexity
    (parallel ? mergeMap : concatMap)(async (command: CommandSubject<Entity, WithID>) => {
      const event: MEvent<WithID> = {
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
      const originalEntity = entity ? { ...entity } : undefined;
      let entityResult = entity;

      if (command.asyncEventHandler) {
        event.status = MEventStatus.Pending;
      }
      if (command.eventHandler) {
        try {
          if (command.cud === CUD.create) {
            entityResult = command.eventHandler(entity, event);
            runInAction(() => {
              store.set(entityResult!.id, entityResult!);
            });
          } else if (command.cud === CUD.delete) {
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
          if (command.cud === CUD.create) {
            entityResult = await command.asyncEventHandler(entity, event);
            runInAction(() => {
              store.set(entityResult!.id, entityResult!);
            });
          } else if (command.cud === CUD.delete) {
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

      return [entityResult, event] as [Entity, MEvent<WithID>];
    }),
    share()
  );
}

export function useEntity<Entity>(
  useEffect: (anon: () => void, dependencyArray: any[]) => void,
  entity$: Observable<[Entity, MEvent<WithID>]>,
  subscription?: ([entity, event]: [Entity, MEvent<WithID>]) => void
) {
  useEffect(() => {
    const sub = entity$
      .pipe(filter(([_entity, event]: [Entity, MEvent<WithID>]) => event.status !== MEventStatus.Error))
      .subscribe(subscription);
    return () => {
      sub.unsubscribe();
    };
  }, [entity$, subscription]);
}

export function hydrateCommandFactory<Command, Entity = Command>(
  command$: Subject<CommandSubject<Entity, Command>>,
  eventType: string
): (command: Command) => void {
  function commandFunction(command: Command) {
    command$.next({
      payload: command,
      cud: CUD.create,
      eventType,
    });
  }

  return commandFunction;
}

export function deleteCommandFactory<Command extends WithID, Entity = Command>(
  command$: Subject<CommandSubject<Entity, Command>>,
  eventType: string
): (command: Command) => void {
  function commandFunction(command: Command) {
    command$.next({
      payload: command,
      cud: CUD.delete,
      eventType,
    });
  }

  return commandFunction;
}

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export function commandFactory<Command extends WithID | void, Entity = (Command | undefined) | undefined>({
  command$,
  cud = CUD.create,
  eventType,
  eventHandler,
  asyncEventHandler,
}: {
  command$: Subject<CommandSubject<Entity, Command>>;
  cud?: CUD;
  eventType: string;
} & AtLeastOne<{
  asyncEventHandler: AsyncEntityEventHandler<Entity, Command>;
  eventHandler: EntityEventHandler<Entity, Command>;
}>): (command: Command) => void {
  function commandFunction(command: Command) {
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

export function definedEntity<Entity>(entity: Entity | undefined) {
  if (!entity) {
    throw new Error('Entity does not exist');
  }
  return entity;
}
