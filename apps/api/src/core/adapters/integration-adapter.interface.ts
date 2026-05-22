/**
 * core/adapters/integration-adapter.interface.ts
 *
 * Contract for all external integration adapters.
 * Implementations live outside the core domain and are resolved
 * via provider mapping — never hardcoded inside services.
 *
 * Architecture: event → workflow → queue → integration adapter → provider mapping
 */

export interface IntegrationAdapter<TConfig = unknown, TPayload = unknown, TResult = unknown> {
  readonly providerId: string;

  /** Test connection / credentials for this provider. */
  healthCheck(config: TConfig): Promise<{ ok: boolean; message?: string }>;

  /** Execute the integration job and return a normalized result. */
  execute(config: TConfig, payload: TPayload): Promise<TResult>;
}

/** Normalized outcome returned by any integration adapter. */
export interface AdapterResult {
  success:    boolean;
  providerId: string;
  externalId: string | null;
  message:    string | null;
  raw:        Record<string, unknown>;
}
