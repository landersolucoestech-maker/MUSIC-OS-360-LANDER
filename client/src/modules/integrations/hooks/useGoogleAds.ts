/**
 * integrations/hooks/useGoogleAds.ts
 *
 * Hook stub para integração Google Ads.
 *
 * ESTADO ACTUAL: standalone — campanhas são MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com Google Identity (scope: adwords)
 *   2. Google Ads API para campanhas de YouTube Ads, Display e Search
 *   3. Compartilha credenciais OAuth com YouTube (mesmo Google account)
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IAdsProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do Google Ads ─────────────────────────────────────────

export interface GoogleAdsStatus extends IntegrationRuntimeStatus {
  integration_id: "google-ads";
  customer_id?: string | null;
  manager_account_id?: string | null;
  oauth_scope?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useGoogleAdsStatus() {
  return useQuery<GoogleAdsStatus>({
    queryKey: ["integrations", "google-ads", "status"],
    queryFn: async (): Promise<GoogleAdsStatus> => ({
      integration_id: "google-ads",
      status: "disabled",
      connected: false,
      customer_id: null,
      manager_account_id: null,
      oauth_scope: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useGoogleAdsCampaigns() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("Google Ads"),
  };
}

export function useGoogleAdsReport() {
  return {
    data: null,
    isLoading: false,
    fetch: (_campaignId: string) => disabledIntegration("Google Ads"),
  };
}
