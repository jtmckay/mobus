import { type ObservableMap } from 'mobx';
import { type Observable, type Subject } from 'rxjs';
export declare enum CUD {
    create = "create",
    delete = "delete",
    update = "update"
}
export declare enum MEventStatus {
    Complete = "complete",
    Error = "error",
    Pending = "pending"
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
export type CommandSubject<Entity extends WithID, Command> = {
    asyncEventHandler?: AsyncEntityEventHandler<Entity, Command>;
    cud: CUD;
    eventHandler?: EntityEventHandler<Entity, Command>;
    eventType: string;
    payload: Command;
};
export type EntityEventHandler<Entity extends WithID, Command = Entity> = (entity: Entity | undefined, event: MEvent<Command>) => Entity;
export type AsyncEntityEventHandler<Entity extends WithID, Command = Entity> = (entity: Entity | undefined, event: MEvent<Command>) => Promise<Entity>;
export declare function stateMachineFactory<Entity extends WithID>(entityType: string, store: ObservableMap<string, Entity>, command$: Observable<CommandSubject<Entity, WithID>>, { parallel }?: {
    parallel?: boolean | undefined;
}): Observable<[Entity, MEvent<unknown>]>;
export declare function useEntity<Entity extends WithID>(useEffect: (anon: () => void, dependencyArray: any[]) => void, entity$: Observable<[Entity, MEvent<WithID>]>, subscription?: ([entity, event]: [Entity, MEvent<WithID>]) => void): void;
export declare function hydrateCommandFactory<Entity extends WithID, Command = Entity>(command$: Subject<CommandSubject<Entity, Command>>, eventType: string): (command: Command) => void;
export declare function deleteCommandFactory<Entity extends WithID, Command = Entity>(command$: Subject<CommandSubject<Entity, Command>>, eventType: string): (command: Command) => void;
export type AtLeastOne<T, U = {
    [K in keyof T]: Pick<T, K>;
}> = Partial<T> & U[keyof U];
export declare function commandFactory<Entity extends WithID, Command extends object | void = Entity>({ command$, cud, eventType, eventHandler, asyncEventHandler, }: {
    command$: Subject<CommandSubject<Entity, Command>>;
    cud?: CUD.create;
    eventType: string;
} & AtLeastOne<{
    asyncEventHandler: AsyncEntityEventHandler<Entity, Command>;
    eventHandler: EntityEventHandler<Entity, Command>;
}>): (command: Command) => void;
export declare function commandFactory<Entity extends WithID, Command extends WithID = Entity>({ command$, cud, eventType, eventHandler, asyncEventHandler, }: {
    command$: Subject<CommandSubject<Entity, Command>>;
    cud: CUD.update | CUD.delete;
    eventType: string;
} & AtLeastOne<{
    asyncEventHandler: AsyncEntityEventHandler<Entity, Command>;
    eventHandler: EntityEventHandler<Entity, Command>;
}>): (command: Command) => void;
export declare function definedEntity<Entity extends WithID>(entity: Entity | undefined): Entity;
//# sourceMappingURL=mobus.d.ts.map