import { Observable, Subject, filter, map, merge, share, switchMap } from "rxjs";
import { AggregateEventHandler, MAggregateEvent, MEvent, WithID } from "./mobus";

export function aggregateFactory<Aggregate>(
  aggregateName: string,
  store: Aggregate,
  { wrapper = (callback) => callback() }: { parallel?: boolean; wrapper?: (callback: () => void) => void } = {}
) {
  const aggregateInstance$$ = new Subject<Observable<[Aggregate, MAggregateEvent<WithID>]>>();
  const handledEntities$: Observable<[Aggregate, MAggregateEvent<WithID>]>[] = [];

  function handleEntity<Entity, Events extends string>({
    entity$,
    eventHandlers,
  }: {
    entity$: Observable<[Entity, MEvent<unknown>]>;
    eventHandlers: {
      [key in Events]?: AggregateEventHandler<Aggregate, Entity>;
    };
  }) {
    const entityHandler$: Observable<[Aggregate, MAggregateEvent<WithID>]> = entity$.pipe(
      filter(
        ([_entity, event]) =>
          !!(eventHandlers as { [key: string]: AggregateEventHandler<Aggregate, Entity> })[event.type]
      ),
      map(([entity, event]) => {
        wrapper(() =>
          (eventHandlers as { [key: string]: AggregateEventHandler<Aggregate, Entity> })[event.type](
            store,
            entity,
            event
          )
        );
        return [store, { aggregateName, event }] as [Aggregate, MAggregateEvent<WithID>];
      })
    );
    handledEntities$.push(entityHandler$);

    aggregateInstance$$.next(merge(...handledEntities$).pipe(share()));
  }

  const aggregate$ = aggregateInstance$$.pipe(switchMap((i) => i));

  return {
    handleEntity,
    aggregate$,
    subscribe: () => aggregate$.subscribe(),
  };
}
