export { aggregateFactory } from './aggregateFactory';
export { effectFactory } from './effectFactory';
export { stateMachineFactory } from './stateMachineFactory';

export function definedEntity<Entity extends WithID>(entity: Entity | undefined) {
  if (!entity) {
    throw new Error('Entity does not exist');
  }
  return entity;
}

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

export type AggregateEventHandler<Aggregate, Entity> = (
  aggregate: Aggregate,
  entity: Entity,
  event: MEvent<any>
) => void;

export type MAggregateEvent<Command> = {
  aggregateName: string;
  event: MEvent<Command>;
};
