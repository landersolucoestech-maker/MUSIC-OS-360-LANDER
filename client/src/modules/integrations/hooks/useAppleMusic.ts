/**
 * integrations/hooks/useAppleMusic.ts
 *
 * Hook stub para integração Apple Music for Artists.
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   1. Autenticação via MusicKit JS + Apple Developer token (JWT)
 *   2. Apple Music for Artists API para streams, Shazams e playlists editoriais
 *   3. Apple Music API para metadados de catálogo
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do Apple Music ────────────────────────────────────────

export interface AppleMusicStatus extends IntegrationRuntimeStatus {
  integration_id: "apple-music";
  artist_id?: string | null;
  team_id?: string | null;
  key_id?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useAppleMusicStatus() {
  return useQuery<AppleMusicStatus>({
    queryKey: ["integrations", "apple-music", "status"],
    queryFn: async (): Promise<AppleMusicStatus> => ({
      integration_id: "apple-music",
      status: "disabled",
      connected: false,
      artist_id: null,
      team_id: null,
      key_id: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useAppleMusicArtistMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("Apple Music for Artists"),
  };
}

export function useAppleMusicShazamMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: (_isrc: string) => disabledIntegration("Apple Music for Artists"),
  };
}
