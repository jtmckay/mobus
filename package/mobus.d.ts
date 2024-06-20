import { type ObservableMap } from 'mobx';
import { type Observable } from 'rxjs';
export declare enum StoreOperation {
    set = "set",
    delete = "delete",
    mutate = "mutate"
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
    op: StoreOperation;
    entityInStore: boolean;
    entityName: string;
    payload: Command;
    status: MEventStatus;
    type: string;
};
export type CommandSubject<Entity extends WithID, Command> = {
    asyncEventHandler?: AsyncEntityEventHandler<Entity, Command>;
    op: StoreOperation;
    eventHandler?: EntityEventHandler<Entity, Command>;
    eventType: string;
    payload: Command;
};
export type EntityEventHandler<Entity extends WithID, Command = Entity> = (entity: Entity | undefined, event: MEvent<Command>) => Entity;
export type AsyncEntityEventHandler<Entity extends WithID, Command = Entity> = (entity: Entity | undefined, event: MEvent<Command>) => Promise<Entity>;
export type AtLeastOne<T, U = {
    [K in keyof T]: Pick<T, K>;
}> = Partial<T> & U[keyof U];
export declare function stateMachineFactory<Entity extends WithID>(entityType: string, store: ObservableMap<string, Entity>, { parallel }?: {
    parallel?: boolean | undefined;
}): {
    entity$: Observable<[Entity, MEvent<WithID>]>;
    command$: Observable<CommandSubject<Entity, WithID>>;
    commandFactory: {
        <Command extends void | object>({ op, eventType, eventHandler, asyncEventHandler, }: {
            op: StoreOperation.set;
            eventType: string;
        } & AtLeastOne<{
            asyncEventHandler: AsyncEntityEventHandler<Entity, Command>;
            eventHandler: EntityEventHandler<Entity, Command>;
        }>): (command: Command) => void;
        <Command_1 extends WithID = Entity>({ op, eventType, eventHandler, asyncEventHandler, }: {
            op: StoreOperation.set | StoreOperation.mutate | StoreOperation.delete;
            eventType: string;
            asyncEventHandler?: AsyncEntityEventHandler<Entity, Command_1> | undefined;
            eventHandler?: EntityEventHandler<Entity, Command_1> | undefined;
        }): (command: Command_1) => void;
    };
    useEntity: (useEffect: (anon: () => void, dependencyArray: any[]) => void, subscription?: ([entity, event]: [Entity, MEvent<unknown>]) => void) => void;
    subscribe: () => import("rxjs").Subscription;
};
export declare function definedEntity<Entity extends WithID>(entity: Entity | undefined): Entity;
//# sourceMappingURL=mobus.d.ts.map