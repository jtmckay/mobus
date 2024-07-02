export const ENTITY = 'pedometer';

// Really only used in aggregates
// Aggregates should not pipe upstream (unidirectional data flow)
export enum EVENT {
  Create = 'create',
  TrackStep = 'step',
  Rate = 'rate',
  Hydrate = 'hydrate',
  Remove = 'remove',
}
