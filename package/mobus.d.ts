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
export declare function stateMachineFactory<EntityNoID>(entityName: string, { store, storeSingle, parallel, wrapper, }: {
    parallel?: boolean;
    wrapper?: (callback: () => void) => void;
} & AtLeastOne<{
    storeSingle: EntityNoID;
    store: Map<string, EntityNoID & WithID>;
}>): {
    entity$: Observable<[EntityNoID & WithID, MEvent<WithID>]>;
    command$: Observable<CommandSubject<EntityNoID & WithID, WithID>>;
    commandFactory: {
        <Command extends void | object>({ op, eventType, eventHandler, asyncEventHandler, }: {
            eventType?: string | undefined;
            op?: StoreOperation.set | undefined;
        } & AtLeastOne<{
            asyncEventHandler: AsyncEntityEventHandler<EntityNoID & WithID, Command>;
            eventHandler: EntityEventHandler<EntityNoID & WithID, Command>;
        }, {
            asyncEventHandler: Pick<{
                asyncEventHandler: AsyncEntityEventHandler<EntityNoID & WithID, Command>;
                eventHandler: EntityEventHandler<EntityNoID & WithID, Command>;
            }, "asyncEventHandler">;
            eventHandler: Pick<{
                asyncEventHandler: AsyncEntityEventHandler<EntityNoID & WithID, Command>;
                eventHandler: EntityEventHandler<EntityNoID & WithID, Command>;
            }, "eventHandler">;
        }>): (command: Command) => Promise<EntityNoID & WithID>;
        <Command_1 extends WithID = EntityNoID & WithID>({ op, eventType, eventHandler, asyncEventHandler, }: {
            asyncEventHandler?: AsyncEntityEventHandler<EntityNoID & WithID, Command_1> | undefined;
            eventHandler?: EntityEventHandler<EntityNoID & WithID, Command_1> | undefined;
            eventType?: string | undefined;
            op?: StoreOperation | undefined;
        }): (command: Command_1) => Promise<EntityNoID & WithID>;
    };
    subscribe: () => import("rxjs").Subscription;
};
export declare function definedEntity<Entity extends WithID>(entity: Entity | undefined): Entity;
export type AggregateEventHandler<Aggregate, Entity> = (aggregate: Aggregate, entity: Entity, event: MEvent<any>) => void;
export type MAggregateEvent<Command> = {
    event: MEvent<Command>;
    aggregateName: string;
};
export declare function aggregateFactory<Aggregate>(aggregateName: string, store: Aggregate, { wrapper, }?: {
    parallel?: boolean;
    wrapper?: (callback: () => void) => void;
}): {
    handleEntity: <Entity, Events extends string>({ entity$, eventHandlers, }: {
        entity$: Observable<[Entity, MEvent<unknown>]>;
        eventHandlers: { [key in Events]?: AggregateEventHandler<Aggregate, Entity> | undefined; };
    }) => void;
    aggregate$: Observable<[Aggregate, MAggregateEvent<WithID>]>;
    subscribe: () => import("rxjs").Subscription;
};
export declare function effectFactory(useEffect: (anon: () => void, dependencyArray: unknown[]) => void): <Entity>(entity$: Observable<Entity>, subscription?: (entity: Entity) => void) => void;
//# sourceMappingURL=mobus.d.ts.map