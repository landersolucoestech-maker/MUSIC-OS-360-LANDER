/**
 * integrations/hooks/useTikTok.ts
 *
 * Hook stub para integração TikTok for Business.
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com TikTok Login Kit
 *   2. TikTok for Business API para métricas de vídeo e sons virais
 *   3. TikTok Ads API para campanhas publicitárias
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider / IAdsProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do TikTok ──────────────────────────────────────────────

export interface TikTokStatus extends IntegrationRuntimeStatus {
  integration_id: "tiktok";
  open_id?: string | null;
  advertiser_id?: string | null;
  oauth_scope?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useTikTokStatus() {
  return useQuery<TikTokStatus>({
    queryKey: ["integrations", "tiktok", "status"],
    queryFn: async (): Promise<TikTokStatus> => ({
      integration_id: "tiktok",
      status: "disabled",
      connected: false,
      open_id: null,
      advertiser_id: null,
      oauth_scope: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useTikTokVideoMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("TikTok for Business"),
  };
}

export function useTikTokSoundMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: (_isrc: string) => disabledIntegration("TikTok for Business"),
  };
}

export function useTikTokAdsCampaigns() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("TikTok Ads"),
  };
}
