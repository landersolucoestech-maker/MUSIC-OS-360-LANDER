/**
 * integrations/hooks/useSpotify.ts
 *
 * Hook para integração Spotify for Artists.
 * Credenciais gerenciadas server-side (criptografadas no banco).
 * Em MOCK_MODE retorna stubs sem chamar o backend.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface SpotifyStatus {
  connected: boolean;
  last_sync_at?: string | null;
}

export function useSpotifyStatus() {
  return useQuery<SpotifyStatus>({
    queryKey: ["integrations", "spotify", "status"],
    queryFn: async (): Promise<SpotifyStatus> => {
      if (MOCK_MODE) return { connected: false, last_sync_at: null };
      const all = await api.get<Record<string, { configured: boolean }>>("/integrations/status");
      return { connected: all["spotify"]?.configured ?? false, last_sync_at: null };
    },
    staleTime: 30_000,
  });
}

export function useSpotifyConnect() {
  return {
    connect: async () => {
      if (MOCK_MODE) { toast.info("Modo mock — OAuth Spotify desabilitado."); return; }
      const { url } = await api.get<{ url: string }>("/integrations/spotify/auth");
      const popup = window.open(url, "spotify_oauth", "width=600,height=700");
      if (!popup) toast.error("Popup bloqueado. Permita popups para este site.");
    },
  };
}

export function useSpotifyArtistMetrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (spotifyArtistId: string) => {
      if (MOCK_MODE) throw new Error("Modo mock — métricas Spotify desabilitadas.");
      return api.post("/integrations/spotify/sync-artist", { spotifyArtistId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "spotify"] });
      toast.success("Métricas do artista Spotify sincronizadas.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSpotifyDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (MOCK_MODE) return;
      return api.delete("/integrations/spotify/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "spotify"] });
      toast.success("Spotify desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** @deprecated Use useSpotifyConnect + useSpotifyDisconnect */
export function useSpotifySaveCredentials() {
  return useSpotifyConnect();
}

/** @deprecated Use useSpotifyDisconnect */
export function useSpotifyDeleteCredentials() {
  return useSpotifyDisconnect();
}

export function useSpotifyTrackMetrics() {
  return { data: null, isLoading: false, fetch: (_isrc: string) => {} };
}
