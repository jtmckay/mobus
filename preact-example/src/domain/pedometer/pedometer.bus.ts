import { runInAction } from 'mobx';
import { useEffect } from 'preact/hooks';
import { v4 as uuid } from 'uuid';
import {
  MEvent,
  StoreOperation,
  WithID,
  definedEntity,
  stateMachineFactory,
} from '../../../../src/mobus';
import { ENTITY, EVENT } from './pedometer.constants';
import { Pedometer, pedometerStore } from './pedometer.store';

export const {
  commandFactory,
  subscribe,
  useEntity
} = stateMachineFactory(ENTITY, pedometerStore, { parallel: true });

export function usePedometerService(subscription?: ([estimate]: [Pedometer, MEvent<unknown>]) => void) {
  useEntity(useEffect, subscription);
}

// Start the engine immediately. More advanced: subscribe as needed
subscribe();

export const create = commandFactory<void>({
  op: StoreOperation.set,
  eventType: EVENT.Create,
  eventHandler: () => {
    return {
      id: uuid(),
      stepCount: 0,
    };
  },
});

const step = commandFactory<WithID>({
  op: StoreOperation.mutate,
  eventType: EVENT.TrackStep,
  eventHandler: (entity, event) => {
    const pedometer = definedEntity(entity);
    pedometer.stepCount++;
    return pedometer;
  },
});

const syncHeartRate = commandFactory<WithID & { rate: number }>({
  op: StoreOperation.mutate,
  eventType: EVENT.Rate,
  eventHandler: (entity, event) => {
    const pedometer = definedEntity(entity);
    pedometer.heartRate = event.payload.rate;
    return pedometer;
  },
  asyncEventHandler: async (entity, event) => {
    const pedometer = definedEntity(entity);
    await new Promise(resolve => setTimeout(resolve, 2000))

    runInAction(() => {
      pedometer.heartRate = 100;
    });
    return pedometer;
  }
});

// Namespaced export
export const pedometerCommand = {
  create,
  step,
  syncHeartRate,
  hydrate: commandFactory({
    op: StoreOperation.set,
    eventType: EVENT.Hydrate,
  }),
  delete: commandFactory<WithID>({
    op: StoreOperation.delete,
    eventType: EVENT.Hydrate,
  }),
};
