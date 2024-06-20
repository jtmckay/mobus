# mobus
RxJS events into a MobX state machine

## Installation
`yarn`

## Flow
```mermaid
graph TD
    subgraph RxJS Events
        Event1["Command 1"]
        Event2["Command 2"]
        Event3["Command 3"]
        Event4["Command 4"]
    end
    
    subgraph Bus
        Event4 --> Commands
        Event3 --> Commands
        Event2 --> Commands
        Event1 --> Commands
        Commands --> Get
        Database -->Get
        Get --> Function["Pure Function Bussiness Logic Handlers"]
        Function --> Set
        Set --> Database["MobX Store"]
    end

    Database --> React["React (any UI)"]

    Function --> EntityStream["RxJS Stream"]

```

## Try
`cd preact-example`

`yarn`

`yarn dev`

### Example store

```
// src/domain/pedometer.store.ts
import { observable } from 'mobx';

export type Pedometer = {
  id: string;
  stepCount: number;
};

export const pedometerStore = observable<string, Pedometer>(new Map());
```

### Example bus

```
// src/domain/pedometer.bus.ts
import {
  MEvent,
  stateMachineFactory,
} from 'mobus';
import { Subject } from 'rxjs';
import { ENTITY } from './pedometer.constants';
import { pedometerStore } from './pedometer.store';

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
```

### Example optimistic updates

```
// src/domain/pedometer.bus.ts cont.
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
```

## Publish
`yarn build`

`cd package`

`npm login --auth-type=legacy`

`npm publish`
