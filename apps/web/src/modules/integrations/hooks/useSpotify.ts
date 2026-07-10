/**
 * integrations/hooks/useSpotify.ts
 *
 * Hook para integração Spotify for Artists.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";


export interface SpotifyStatus {
  connected: boolean;
  client_id?: string | null;
  artist_id?: string | null;
  last_sync_at?: string | null;
}

export function useSpotifyStatus() {
  return useQuery<SpotifyStatus>({
    queryKey: ["integrations", "spotify", "status"],
    queryFn: async (): Promise<SpotifyStatus> => {
      const all = await api.get<Record<string, { configured: boolean }>>("/integrations/status");
      return { connected: all["spotify"]?.configured ?? false, last_sync_at: null };
    },
    staleTime: 30_000,
  });
}

/** @deprecated Mantido para retrocompatibilidade com SpotifyConfigDialog. */
export function useSpotifySaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_input: { client_id?: string; client_secret?: string; artist_id?: string }) => {
      // Modo real: inicia OAuth (não usa client_id/secret do form — backend gerencia)
      const { url } = await api.get<{ url: string }>("/integrations/spotify/auth");
      window.open(url, "spotify_oauth", "width=600,height=700");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "spotify", "status"] });
      toast.info("Janela OAuth aberta. Complete a autenticação no Spotify.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** @deprecated Mantido para retrocompatibilidade com SpotifyConfigDialog. */
export function useSpotifyDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return api.delete("/integrations/spotify/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "spotify", "status"] });
      toast.success("Spotify desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSpotifyConnect() {
  return {
    connect: async () => {
      const { url } = await api.get<{ url: string }>("/integrations/spotify/auth");
      const popup = window.open(url, "spotify_oauth", "width=600,height=700");
      if (!popup) toast.error("Popup bloqueado. Permita popups para este site.");
    },
  };
}

export function useSpotifyArtistMetrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (spotifyUrl: string) => {
      return api.post("/integrations/spotify/sync-artist", { spotifyUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "spotify"] });
      toast.success("Métricas do artista Spotify sincronizadas.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSpotifyDisconnect() {
  return useSpotifyDeleteCredentials();
}

export function useSpotifyTrackMetrics() {
  return { data: null, isLoading: false, fetch: (_isrc: string) => {} };
}

