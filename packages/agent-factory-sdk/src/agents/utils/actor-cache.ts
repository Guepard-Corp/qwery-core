import { fromPromise } from 'xstate/actors';
import type { PromiseActorLogic } from 'xstate';
import { createActor } from 'xstate';

interface CacheEntry<TOutput> {
  result: TOutput;
  timestamp: number;
  key: string;
}

/**
 * Creates a cached version of a promise actor that memoizes results
 * This wraps the original actor and caches results based on the cache key
 */
export function createCachedActor<TInput, TOutput>(
  actor: PromiseActorLogic<TOutput, TInput>,
  cacheKey: (input: TInput) => string,
  ttl: number = 60000, // 1 minute default
): PromiseActorLogic<TOutput, TInput> {
  const cache = new Map<string, CacheEntry<TOutput>>();

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttl) {
        cache.delete(key);
      }
    }
  }, ttl / 2);

  return fromPromise(async ({ input }: { input: TInput }): Promise<TOutput> => {
    const key = cacheKey(input);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      console.debug(`[ActorCache] Cache hit for key: ${key}`);
      return cached.result;
    }

    console.debug(`[ActorCache] Cache miss for key: ${key}, invoking actor`);
    // Create a temporary actor instance to invoke the original actor
    const tempActor = createActor(actor, { input });
    tempActor.start();

    // Wait for the actor to complete
    return new Promise<TOutput>((resolve, reject) => {
      const subscription = tempActor.subscribe((state) => {
        if (state.status === 'done') {
          subscription.unsubscribe();
          tempActor.stop();
          const result = state.output as TOutput;
          cache.set(key, {
            result,
            timestamp: Date.now(),
            key,
          });
          resolve(result);
        } else if (state.status === 'error') {
          subscription.unsubscribe();
          tempActor.stop();
          reject(state.error);
        }
      });
    });
  });
}
