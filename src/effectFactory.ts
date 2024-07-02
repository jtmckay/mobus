import { Observable } from "rxjs";

export function effectFactory(useEffect: (anon: () => void, dependencyArray: unknown[]) => void) {
    return function useObservable<Entity>(entity$: Observable<Entity>, subscription?: (entity: Entity) => void) {
      useEffect(() => {
        const sub = entity$.subscribe(subscription);
        return () => {
          sub.unsubscribe();
        };
      }, [entity$, subscription]);
    };
  }
  