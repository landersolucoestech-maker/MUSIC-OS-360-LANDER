/**
 * integrations/hooks/useDeezer.ts
 *
 * Hook stub para integração Deezer.
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth implícito via Deezer Connect
 *   2. Deezer API v2 para métricas de streams e favoritos
 *   3. Foco nos mercados brasileiro e francês
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do Deezer ──────────────────────────────────────────────

export interface DeezerStatus extends IntegrationRuntimeStatus {
  integration_id: "deezer";
  artist_id?: string | null;
  oauth_token?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useDeezerStatus() {
  return useQuery<DeezerStatus>({
    queryKey: ["integrations", "deezer", "status"],
    queryFn: async (): Promise<DeezerStatus> => ({
      integration_id: "deezer",
      status: "disabled",
      connected: false,
      artist_id: null,
      oauth_token: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useDeezerArtistMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("Deezer"),
  };
}

export function useDeezerTrackMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: (_isrc: string) => disabledIntegration("Deezer"),
  };
}
