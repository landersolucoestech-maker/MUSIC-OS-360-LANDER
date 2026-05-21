/**
 * core/resilience/circuit-breaker.registry.ts
 *
 * Injectable registry that manages one CircuitBreaker per integration provider.
 * Each provider gets an isolated state machine — a Spotify outage won't trip the
 * Deezer breaker, for example.
 *
 * Usage in any service:
 *   constructor(private readonly cbRegistry: CircuitBreakerRegistry) {}
 *   ...
 *   const res = await this.cbRegistry.fetch('spotify', url, init);
 */

import { Injectable } from '@nestjs/common';
import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker';
import { resilientFetch, DEFAULT_TIMEOUT_MS } from './resilient-fetch';

@Injectable()
export class CircuitBreakerRegistry {
  private readonly registry = new Map<string, CircuitBreaker>();

  get(name: string, opts?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.registry.has(name)) {
      this.registry.set(name, new CircuitBreaker({ name, ...opts }));
    }
    return this.registry.get(name)!;
  }

  /**
   * Guarded fetch — resolves the named circuit breaker and applies timeout.
   * This is the primary interface for integration services.
   */
  async fetch(
    provider:   string,
    url:        string,
    init?:      RequestInit,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<Response> {
    return resilientFetch(this.get(provider), url, init, timeoutMs);
  }

  /** Returns a snapshot of all breaker states for health/monitoring endpoints. */
  getStates(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, breaker] of this.registry.entries()) {
      result[name] = breaker.getState();
    }
    return result;
  }
}
