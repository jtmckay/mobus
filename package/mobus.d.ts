import { type ObservableMap } from 'mobx';
import { Observable } from 'rxjs';
export declare enum StoreOperation {
    delete = "delete",
    mutate = "mutate",
    set = "set"
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
    entityInStore: boolean;
    entityName: string;
    op: StoreOperation;
    payload: Command;
    status: MEventStatus;
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
            eventType: string;
            op: StoreOperation.set;
        } & AtLeastOne<{
            asyncEventHandler: AsyncEntityEventHandler<Entity, Command>;
            eventHandler: EntityEventHandler<Entity, Command>;
        }>): (command: Command) => Promise<Entity>;
        <Command_1 extends WithID = Entity>({ op, eventType, eventHandler, asyncEventHandler, }: {
            asyncEventHandler?: AsyncEntityEventHandler<Entity, Command_1> | undefined;
            eventHandler?: EntityEventHandler<Entity, Command_1> | undefined;
            eventType: string;
            op: StoreOperation.set | StoreOperation.mutate | StoreOperation.delete;
        }): (command: Command_1) => Promise<Entity>;
    };
    subscribe: () => import("rxjs").Subscription;
};
export declare function definedEntity<Entity extends WithID>(entity: Entity | undefined): Entity;
export type AggregateEventHandler<Aggregate, Entity> = (aggregate: Aggregate, entity: Entity, event: MEvent<any>) => void;
export declare function aggregateFactory<Aggregate>(store: Aggregate): {
    handleEntity: <Entity, Events extends string>({ entity$, eventHandlers, }: {
        entity$: Observable<[Entity, MEvent<unknown>]>;
        eventHandlers: { [key in Events]?: AggregateEventHandler<Aggregate, Entity> | undefined; };
    }) => void;
    aggregate$: Observable<Aggregate>;
    subscribe: () => import("rxjs").Subscription;
};
export declare function effectFactory(useEffect: (anon: () => void, dependencyArray: unknown[]) => void): <Entity>(entity$: Observable<Entity>, subscription?: (entity: Entity) => void) => void;
//# sourceMappingURL=mobus.d.ts.map