import { observable } from 'mobx';

// Type definition for this domain
export type Pedometer = {
  id: string;
  stepCount: number;
  heartRate?: number;
};

export const pedometerStore = observable<string, Pedometer>(new Map());
