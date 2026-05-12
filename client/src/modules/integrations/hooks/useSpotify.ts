/**
 * integrations/hooks/useSpotify.ts
 *
 * Hook para integração Spotify for Artists.
 *
 * ESTADO ACTUAL: standalone — credenciais persistidas em localStorage.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com Spotify Web API (scope: user-read-private, playlist-read-private)
 *   2. Spotify for Artists API para métricas de streams e ouvintes
 *   3. Marquee / Showcase API para campanhas publicitárias
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

const LS_KEY = "musicos360_spotify_credentials";

export interface SpotifyCredentials {
  client_id: string;
  client_secret: string;
  artist_id?: string;
}

export interface SpotifyStatus {
  connected: boolean;
  status: string;
  has_credentials: boolean;
  client_id?: string | null;
  artist_id?: string | null;
  last_error?: string | null;
  last_checked_at: string;
}

function readCredentials(): SpotifyCredentials | null {
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useSpotifyStatus() {
  return useQuery<SpotifyStatus>({
    queryKey: ["integrations", "spotify", "status"],
    queryFn: async (): Promise<SpotifyStatus> => {
      const creds = readCredentials();
      if (creds?.client_id && creds?.client_secret) {
        return {
          connected: true,
          status: "connected",
          has_credentials: true,
          client_id: creds.client_id,
          artist_id: creds.artist_id ?? null,
          last_error: null,
          last_checked_at: new Date().toISOString(),
        };
      }
      return {
        connected: false,
        status: "disconnected",
        has_credentials: false,
        client_id: null,
        artist_id: null,
        last_error: null,
        last_checked_at: new Date().toISOString(),
      };
    },
    staleTime: 0,
  });
}

export function useSpotifySaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SpotifyCredentials) => {
      try {
        sessionStorage.setItem(LS_KEY, JSON.stringify(input));
      } catch {
        throw new Error("Não foi possível salvar as credenciais.");
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "spotify", "status"] });
      toast.success("Spotify conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSpotifyDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        sessionStorage.removeItem(LS_KEY);
      } catch {
        throw new Error("Não foi possível remover as credenciais.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "spotify", "status"] });
      toast.success("Spotify desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

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
