import { counterStore, delayedIncrement, increment } from './counter.bus';

describe('counter bus', () => {
  describe('given a counter at 0', () => {
    beforeEach(() => {
      counterStore.count = 0
    });
    
    describe('when incrementing the counter', () => {
      beforeEach(() => {
        increment()
      });
    
      it('increases the count to 1', () => {
        expect(counterStore.count).toBe(1)
      });
    });
    
    describe('when incrementing the counter with a delay', () => {
      beforeEach(async () => {
        await delayedIncrement()
      });
    
      it('increases the count to 1', () => {
        expect(counterStore.count).toBe(1)
      });
    });
  });
});
