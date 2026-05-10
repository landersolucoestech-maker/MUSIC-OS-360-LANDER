/**
 * integrations/hooks/useSoundCloud.ts
 *
 * Hook stub para integração SoundCloud.
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com SoundCloud Connect
 *   2. SoundCloud API v2 para plays, reposts, seguidores
 *   3. SoundCloud for Artists dashboard metrics
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do SoundCloud ─────────────────────────────────────────

export interface SoundCloudStatus extends IntegrationRuntimeStatus {
  integration_id: "soundcloud";
  user_id?: string | null;
  permalink?: string | null;
  oauth_token?: string | null;
  token_expires_at?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useSoundCloudStatus() {
  return useQuery<SoundCloudStatus>({
    queryKey: ["integrations", "soundcloud", "status"],
    queryFn: async (): Promise<SoundCloudStatus> => ({
      integration_id: "soundcloud",
      status: "disabled",
      connected: false,
      user_id: null,
      permalink: null,
      oauth_token: null,
      token_expires_at: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useSoundCloudArtistMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("SoundCloud"),
  };
}

export function useSoundCloudTrackMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: (_trackId: string) => disabledIntegration("SoundCloud"),
  };
}
