/**
 * core/resilience/resilient-fetch.ts
 *
 * Drop-in replacement for fetch() that adds:
 *   - Request timeout via AbortSignal (default 10s)
 *   - Circuit breaker (pass the provider's CircuitBreaker instance)
 *
 * Usage:
 *   const res = await resilientFetch(this.cb, url, { method: 'POST', ... });
 */

import { CircuitBreaker } from './circuit-breaker';

export const DEFAULT_TIMEOUT_MS = 10_000;

export async function resilientFetch(
  breaker:    CircuitBreaker,
  url:        string,
  init:       RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  return breaker.execute(async () => {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === 'AbortError') {
        throw new Error(`Timeout after ${timeoutMs}ms calling ${url}`);
      }
      throw err;
    }
  });
}
