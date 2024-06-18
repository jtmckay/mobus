import {
  CUD,
  WithID,
  commandFactory,
  definedEntity,
  deleteCommandFactory,
  hydrateCommandFactory,
  stateMachineFactory,
} from 'mobus';
import { runInAction } from 'mobx';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { ENTITY, EVENT } from './pedometer.constants';
import { Pedometer, pedometerStore } from './pedometer.store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const command$ = new Subject<any>();
export const pedometer$ = stateMachineFactory(ENTITY, pedometerStore, command$, { parallel: true });

// Start the engine immediately. More advanced: subscribe as needed
pedometer$.subscribe();

export const create = commandFactory<Pedometer, void>({
  command$,
  cud: CUD.create,
  eventType: EVENT.Create,
  eventHandler: () => {
    return {
      id: uuid(),
      stepCount: 0,
    };
  },
});

const step = commandFactory<Pedometer, WithID>({
  command$,
  cud: CUD.update,
  eventType: EVENT.TrackStep,
  eventHandler: (entity, event) => {
    const pedometer = definedEntity(entity);
    pedometer.stepCount++;
    return pedometer;
  },
});

const syncHeartRate = commandFactory<Pedometer, WithID & { rate: number }>({
  command$,
  cud: CUD.update,
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

export const pedometerCommand = {
  create,
  step,
  syncHeartRate,
  hydrate: hydrateCommandFactory<Pedometer>(command$, EVENT.Hydrate),
  delete: deleteCommandFactory<Pedometer>(command$, EVENT.Remove),
};
