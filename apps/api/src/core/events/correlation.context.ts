/**
 * correlation.context.ts
 *
 * AsyncLocalStorage-based correlation context.
 * Stores a correlationId per HTTP request so all domain events
 * emitted within that request carry the same trace identifier.
 *
 * Usage in middleware:
 *   CorrelationContext.run(correlationId, () => next());
 *
 * Usage in services / handlers:
 *   const id = CorrelationContext.get(); // undefined outside a request
 */

import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage<string>();

export const CorrelationContext = {
  /** Runs `fn` inside a context bound to `correlationId`. */
  run<T>(correlationId: string, fn: () => T): T {
    return storage.run(correlationId, fn);
  },

  /** Returns the current correlationId, or undefined if no context is active. */
  get(): string | undefined {
    return storage.getStore();
  },
} as const;
