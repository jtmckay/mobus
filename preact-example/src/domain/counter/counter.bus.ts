import { observable, runInAction } from 'mobx';
import {
  definedEntity,
  stateMachineFactory
} from '../../../../src/mobus';

export const counterStore = observable({ count: 0 })

export const { commandFactory, subscribe } = stateMachineFactory('counter', {
  wrapper: runInAction,
  storeSingle: counterStore
});

subscribe();

export const increment = commandFactory<void>({
  eventHandler: (entity) => {
    const counter = definedEntity(entity)
    counter.count++;
    return counter
  }
})

export const delayedIncrement = commandFactory<void>({
  asyncEventHandler: async (entity) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    const counter = definedEntity(entity)
    counter.count++;
    return counter
  }
})
