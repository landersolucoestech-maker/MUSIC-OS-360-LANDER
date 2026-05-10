/**
 * integrations/hooks/useInstagram.ts
 *
 * Hook stub para integração Instagram Insights (Graph API).
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com Facebook Login (scope: instagram_basic, instagram_manage_insights)
 *   2. Instagram Graph API para métricas de Reels, Stories, alcance
 *   3. Compartilha credenciais com Meta Ads (mesmo token de acesso)
 *
 * Nota: Meta Ads já tem hook próprio em marketing/hooks/useMetaAds.ts.
 * Este hook cobre apenas métricas orgânicas do Instagram (Insights).
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do Instagram ───────────────────────────────────────────

export interface InstagramStatus extends IntegrationRuntimeStatus {
  integration_id: "instagram";
  instagram_account_id?: string | null;
  facebook_page_id?: string | null;
  username?: string | null;
  oauth_scope?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useInstagramStatus() {
  return useQuery<InstagramStatus>({
    queryKey: ["integrations", "instagram", "status"],
    queryFn: async (): Promise<InstagramStatus> => ({
      integration_id: "instagram",
      status: "disabled",
      connected: false,
      instagram_account_id: null,
      facebook_page_id: null,
      username: null,
      oauth_scope: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useInstagramAccountMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("Instagram Insights"),
  };
}

export function useInstagramReelsMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("Instagram Insights"),
  };
}
