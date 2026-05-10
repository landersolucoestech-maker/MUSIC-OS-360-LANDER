/**
 * integrations/hooks/useYouTube.ts
 *
 * Hook stub para integração YouTube Analytics + Content ID.
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com Google Identity (scope: yt-analytics.readonly, youtube.readonly)
 *   2. YouTube Analytics API v2 para métricas de canal e vídeo
 *   3. YouTube Data API v3 para metadados e claims Content ID
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do YouTube ─────────────────────────────────────────────

export interface YouTubeStatus extends IntegrationRuntimeStatus {
  integration_id: "youtube";
  channel_id?: string | null;
  channel_title?: string | null;
  content_id_enabled: boolean;
  oauth_scope?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useYouTubeStatus() {
  return useQuery<YouTubeStatus>({
    queryKey: ["integrations", "youtube", "status"],
    queryFn: async (): Promise<YouTubeStatus> => ({
      integration_id: "youtube",
      status: "disabled",
      connected: false,
      channel_id: null,
      channel_title: null,
      content_id_enabled: false,
      oauth_scope: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useYouTubeChannelMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("YouTube Analytics"),
  };
}

export function useYouTubeVideoMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: (_videoId: string) => disabledIntegration("YouTube Analytics"),
  };
}

export function useYouTubeContentIdClaims() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("YouTube Content ID"),
  };
}
