/**
 * integrations/hooks/useSentry.ts
 *
 * Hook stub para integração Sentry (monitoramento de erros e performance).
 *
 * ESTADO ACTUAL: standalone — erros logados via shared/lib/error-logger.ts.
 * MIGRAÇÃO FUTURA:
 *   1. Instalar @sentry/react
 *   2. Inicializar Sentry.init() no entry point com VITE_SENTRY_DSN
 *   3. Substituir useSentryMonitor() por wrapper sobre @sentry/react
 *   4. Integrar com ErrorBoundary existente em shared/infrastructure/
 *
 * Contrato: @/shared/integrations/contracts/monitoring.contract → IErrorMonitorProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import type { ErrorContext, ErrorSeverity } from "@/shared/integrations/contracts/monitoring.contract";

// ─── Tipos específicos do Sentry ──────────────────────────────────────────────

export interface SentryStatus extends IntegrationRuntimeStatus {
  integration_id: "sentry";
  dsn_configured: boolean;
  environment: string;
  release?: string | null;
  traces_sample_rate: number;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useSentryStatus() {
  return useQuery<SentryStatus>({
    queryKey: ["integrations", "sentry", "status"],
    queryFn: async (): Promise<SentryStatus> => ({
      integration_id: "sentry",
      status: "disabled",
      connected: false,
      dsn_configured: false,
      environment: import.meta.env.MODE ?? "development",
      release: null,
      traces_sample_rate: 0,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Hook de monitoramento (mock silencioso) ──────────────────────────────────

/**
 * Em modo standalone: erros são encaminhados para console.error.
 * MIGRAÇÃO FUTURA: delegar para Sentry.captureException / Sentry.captureMessage.
 */
export function useSentryMonitor() {
  const captureError = (error: Error, context?: ErrorContext, severity?: ErrorSeverity): string => {
    const eventId = `mock-${Date.now().toString(36)}`;
    if (import.meta.env.DEV) {
      console.error("[Sentry stub] captureError:", { error, context, severity, eventId });
    }
    return eventId;
  };

  const captureMessage = (message: string, severity?: ErrorSeverity, context?: ErrorContext): string => {
    const eventId = `mock-${Date.now().toString(36)}`;
    if (import.meta.env.DEV) {
      console.warn("[Sentry stub] captureMessage:", { message, severity, context, eventId });
    }
    return eventId;
  };

  const setUser = (user: { id: string; email?: string; tenant_id?: string } | null): void => {
    if (import.meta.env.DEV) {
      console.debug("[Sentry stub] setUser:", user);
    }
  };

  return { captureError, captureMessage, setUser };
}
