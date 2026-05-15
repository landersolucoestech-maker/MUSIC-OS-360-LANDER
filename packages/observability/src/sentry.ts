// ─── Sentry configuration helpers ────────────────────────────────────────────
// Este módulo exporta funções de setup; o peer dep @sentry/* é resolvido
// pelo consumidor (apps/web usa @sentry/react, apps/api usa @sentry/node).

export interface SentryInitOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  debug?: boolean;
  ignoreErrors?: (string | RegExp)[];
}

export const DEFAULT_SENTRY_OPTIONS: Partial<SentryInitOptions> = {
  tracesSampleRate: 0.1,
  debug: false,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Network request failed",
    "Failed to fetch",
    /^ChunkLoadError/,
    /Loading chunk \d+ failed/,
  ],
};

/**
 * Gera o objeto de configuração para Sentry.init().
 * Chamado por apps/web/src/main.tsx e apps/api/src/main.ts.
 *
 * @example
 * // No main.tsx:
 * import * as Sentry from "@sentry/react";
 * import { buildSentryConfig } from "@music-os-360/observability/sentry";
 * Sentry.init(buildSentryConfig({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: "production" }));
 */
export function buildSentryConfig(options: SentryInitOptions): SentryInitOptions {
  return { ...DEFAULT_SENTRY_OPTIONS, ...options };
}

/**
 * Captura erro com contexto de tenant para melhor agrupamento no Sentry.
 */
export function captureWithTenantContext(
  error: unknown,
  tenantId: string,
  extra?: Record<string, unknown>,
): void {
  try {
    // Evita import estático de @sentry para não quebrar o build se DSN estiver vazio
    const Sentry = (globalThis as Record<string, unknown>)["__Sentry__"] as
      | { captureException: (e: unknown, ctx: unknown) => void }
      | undefined;
    Sentry?.captureException(error, {
      tags: { tenant_id: tenantId },
      extra,
    });
  } catch {
    // Silencioso se Sentry não inicializado
  }
}
