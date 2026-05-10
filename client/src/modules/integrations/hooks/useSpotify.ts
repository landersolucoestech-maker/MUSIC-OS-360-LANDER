/**
 * integrations/hooks/useSpotify.ts
 *
 * Hook stub para integração Spotify for Artists.
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA em ArtistaPlatformMetrics.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com Spotify Web API (scope: user-read-private, playlist-read-private)
 *   2. Spotify for Artists API para métricas de streams e ouvintes
 *   3. Marquee / Showcase API para campanhas publicitárias
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do Spotify ─────────────────────────────────────────────

export interface SpotifyStatus extends IntegrationRuntimeStatus {
  integration_id: "spotify";
  artist_id?: string | null;
  oauth_scope?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useSpotifyStatus() {
  return useQuery<SpotifyStatus>({
    queryKey: ["integrations", "spotify", "status"],
    queryFn: async (): Promise<SpotifyStatus> => ({
      integration_id: "spotify",
      status: "disabled",
      connected: false,
      artist_id: null,
      oauth_scope: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useSpotifyArtistMetrics() {
  return {
    data: null,
    isLoading: false,
    error: null,
    fetch: () => disabledIntegration("Spotify"),
  };
}

export function useSpotifyTrackMetrics() {
  return {
    data: null,
    isLoading: false,
    error: null,
    fetch: (_isrc: string) => disabledIntegration("Spotify"),
  };
}
