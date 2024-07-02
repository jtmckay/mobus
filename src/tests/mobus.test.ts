import { aggregateFactory, definedEntity, effectFactory, stateMachineFactory } from '../mobus';

describe('definedEntity function', () => {
  describe('given undefined', () => {
      it('throws an error', () => {
        expect(() => definedEntity(undefined)).toThrow();
      });
  });

  describe('given an object', () => {
    const obj = { id: 'a' }
      let result: any;
      beforeEach(() => {
        result = definedEntity(obj);
      })

      it('returns the object', () => {
        expect(result).toBe(obj)
      });
  });
});

describe('exports', () => {
  it('includes aggregateFactory', () => {
    expect(aggregateFactory).toBeDefined();
  });
  it('includes effectFactory', () => {
    expect(effectFactory).toBeDefined();
  });
  it('includes stateMachineFactory', () => {
    expect(stateMachineFactory).toBeDefined();
  });
})