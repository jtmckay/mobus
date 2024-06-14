import {
  stateMachineFactory
} from 'mobus';
import { Subject } from 'rxjs';
import { ENTITY } from './pedometer.constants';
import { pedometerStore } from './pedometer.store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const command$ = new Subject<any>();
export const pedometer$ = stateMachineFactory(ENTITY, pedometerStore, command$, { parallel: true });

// Start the engine immediately. More advanced: subscribe as needed
pedometer$.subscribe();
