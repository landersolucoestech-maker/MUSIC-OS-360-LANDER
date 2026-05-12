/**
 * integrations/hooks/useSoundCloud.ts
 *
 * Hook para integração SoundCloud.
 *
 * ESTADO ACTUAL: standalone — credenciais persistidas em localStorage.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com SoundCloud Connect
 *   2. SoundCloud API v2 para plays, reposts, seguidores
 *   3. SoundCloud for Artists dashboard metrics
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

const LS_KEY = "musicos360_soundcloud_credentials";

export interface SoundCloudCredentials {
  client_id: string;
  client_secret: string;
  permalink?: string;
}

export interface SoundCloudStatus {
  connected: boolean;
  status: string;
  has_credentials: boolean;
  user_id?: string | null;
  permalink?: string | null;
  last_error?: string | null;
  last_checked_at: string;
}

function readCredentials(): SoundCloudCredentials | null {
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useSoundCloudStatus() {
  return useQuery<SoundCloudStatus>({
    queryKey: ["integrations", "soundcloud", "status"],
    queryFn: async (): Promise<SoundCloudStatus> => {
      const creds = readCredentials();
      if (creds?.client_id && creds?.client_secret) {
        return {
          connected: true,
          status: "connected",
          has_credentials: true,
          user_id: null,
          permalink: creds.permalink ?? null,
          last_error: null,
          last_checked_at: new Date().toISOString(),
        };
      }
      return {
        connected: false,
        status: "disconnected",
        has_credentials: false,
        user_id: null,
        permalink: null,
        last_error: null,
        last_checked_at: new Date().toISOString(),
      };
    },
    staleTime: 0,
  });
}

export function useSoundCloudSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SoundCloudCredentials) => {
      try {
        sessionStorage.setItem(LS_KEY, JSON.stringify(input));
      } catch {
        throw new Error("Não foi possível salvar as credenciais.");
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "soundcloud", "status"] });
      toast.success("SoundCloud conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSoundCloudDeleteCredentials() {
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
      queryClient.invalidateQueries({ queryKey: ["integrations", "soundcloud", "status"] });
      toast.success("SoundCloud desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSoundCloudArtistMetrics() {
  return { data: null, isLoading: false, fetch: () => disabledIntegration("SoundCloud") };
}

export function useSoundCloudTrackMetrics() {
  return { data: null, isLoading: false, fetch: (_trackId: string) => disabledIntegration("SoundCloud") };
}
