/**
 * integrations/hooks/usePostHog.ts
 *
 * Hook stub para integração PostHog (analytics de produto e feature flags).
 *
 * ESTADO ACTUAL: standalone — sem analytics real; logs em consola (dev).
 * MIGRAÇÃO FUTURA:
 *   1. Instalar posthog-js
 *   2. Inicializar PostHog no entry point com VITE_POSTHOG_KEY
 *   3. Substituir usePostHog() por wrapper sobre posthog-js
 *   4. Feature flags substituem booleanos fixos em TenantContext
 *
 * Contrato: @/shared/integrations/contracts/monitoring.contract → IAnalyticsProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import type { AnalyticsEventName, AnalyticsEventProperties } from "@/shared/integrations/contracts/monitoring.contract";
import { IS_DEV } from "@/shared/lib/env";

// ─── Tipos específicos do PostHog ─────────────────────────────────────────────

export interface PostHogStatus extends IntegrationRuntimeStatus {
  integration_id: "posthog";
  project_api_key_configured: boolean;
  session_recording_enabled: boolean;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function usePostHogStatus() {
  return useQuery<PostHogStatus>({
    queryKey: ["integrations", "posthog", "status"],
    queryFn: async (): Promise<PostHogStatus> => ({
      integration_id: "posthog",
      status: "disabled",
      connected: false,
      project_api_key_configured: false,
      session_recording_enabled: false,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Hook de analytics (mock silencioso) ─────────────────────────────────────

/**
 * Em modo standalone: track() faz console.debug em desenvolvimento.
 * MIGRAÇÃO FUTURA: delegar para posthog.capture().
 */
export function usePostHogAnalytics() {
  const track = (event: AnalyticsEventName, properties?: AnalyticsEventProperties) => {
    if (IS_DEV) {
      console.debug("[PostHog stub] track:", event, properties);
    }
  };

  const identify = (userId: string, properties?: AnalyticsEventProperties) => {
    if (IS_DEV) {
      console.debug("[PostHog stub] identify:", userId, properties);
    }
  };

  const page = (name: string) => {
    if (IS_DEV) {
      console.debug("[PostHog stub] page:", name);
    }
  };

  /**
   * MIGRAÇÃO FUTURA: chamar posthog.isFeatureEnabled(flagKey).
   * Sempre devolve false em modo standalone.
   */
  const isFeatureEnabled = (_flagKey: string): boolean => false;

  return { track, identify, page, isFeatureEnabled };
}

