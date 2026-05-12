/**
 * integrations/hooks/useAppleMusic.ts
 *
 * Hook para integração Apple Music for Artists.
 *
 * ESTADO ACTUAL: standalone — credenciais persistidas em localStorage.
 * MIGRAÇÃO FUTURA:
 *   1. Autenticação via MusicKit JS + Apple Developer token (JWT)
 *   2. Apple Music for Artists API para streams, Shazams e playlists editoriais
 *   3. Apple Music API para metadados de catálogo
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

const LS_KEY = "musicos360_apple_music_credentials";

export interface AppleMusicCredentials {
  team_id: string;
  key_id: string;
  private_key: string;
  artist_id?: string;
}

export interface AppleMusicStatus {
  connected: boolean;
  status: string;
  has_credentials: boolean;
  artist_id?: string | null;
  team_id?: string | null;
  key_id?: string | null;
  last_error?: string | null;
  last_checked_at: string;
}

function readCredentials(): AppleMusicCredentials | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAppleMusicStatus() {
  return useQuery<AppleMusicStatus>({
    queryKey: ["integrations", "apple-music", "status"],
    queryFn: async (): Promise<AppleMusicStatus> => {
      const creds = readCredentials();
      if (creds?.team_id && creds?.key_id && creds?.private_key) {
        return {
          connected: true,
          status: "connected",
          has_credentials: true,
          artist_id: creds.artist_id ?? null,
          team_id: creds.team_id,
          key_id: creds.key_id,
          last_error: null,
          last_checked_at: new Date().toISOString(),
        };
      }
      return {
        connected: false,
        status: "disconnected",
        has_credentials: false,
        artist_id: null,
        team_id: null,
        key_id: null,
        last_error: null,
        last_checked_at: new Date().toISOString(),
      };
    },
    staleTime: 0,
  });
}

export function useAppleMusicSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AppleMusicCredentials) => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(input));
      } catch {
        throw new Error("Não foi possível salvar as credenciais.");
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "apple-music", "status"] });
      toast.success("Apple Music conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAppleMusicDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        throw new Error("Não foi possível remover as credenciais.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "apple-music", "status"] });
      toast.success("Apple Music desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAppleMusicArtistMetrics() {
  return { data: null, isLoading: false, fetch: () => disabledIntegration("Apple Music for Artists") };
}

export function useAppleMusicShazamMetrics() {
  return { data: null, isLoading: false, fetch: (_isrc: string) => disabledIntegration("Apple Music for Artists") };
}
