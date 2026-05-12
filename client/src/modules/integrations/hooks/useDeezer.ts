/**
 * integrations/hooks/useDeezer.ts
 *
 * Hook para integração Deezer.
 *
 * ESTADO ACTUAL: standalone — credenciais persistidas em localStorage.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth implícito via Deezer Connect
 *   2. Deezer API v2 para métricas de streams e favoritos
 *   3. Foco nos mercados brasileiro e francês
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

const LS_KEY = "musicos360_deezer_credentials";

export interface DeezerCredentials {
  app_id: string;
  secret_key: string;
  artist_id?: string;
}

export interface DeezerStatus {
  connected: boolean;
  status: string;
  has_credentials: boolean;
  app_id?: string | null;
  artist_id?: string | null;
  last_error?: string | null;
  last_checked_at: string;
}

function readCredentials(): DeezerCredentials | null {
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useDeezerStatus() {
  return useQuery<DeezerStatus>({
    queryKey: ["integrations", "deezer", "status"],
    queryFn: async (): Promise<DeezerStatus> => {
      const creds = readCredentials();
      if (creds?.app_id && creds?.secret_key) {
        return {
          connected: true,
          status: "connected",
          has_credentials: true,
          app_id: creds.app_id,
          artist_id: creds.artist_id ?? null,
          last_error: null,
          last_checked_at: new Date().toISOString(),
        };
      }
      return {
        connected: false,
        status: "disconnected",
        has_credentials: false,
        app_id: null,
        artist_id: null,
        last_error: null,
        last_checked_at: new Date().toISOString(),
      };
    },
    staleTime: 0,
  });
}

export function useDeezerSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeezerCredentials) => {
      try {
        sessionStorage.setItem(LS_KEY, JSON.stringify(input));
      } catch {
        throw new Error("Não foi possível salvar as credenciais.");
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "deezer", "status"] });
      toast.success("Deezer conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeezerDeleteCredentials() {
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
      queryClient.invalidateQueries({ queryKey: ["integrations", "deezer", "status"] });
      toast.success("Deezer desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeezerArtistMetrics() {
  return { data: null, isLoading: false, fetch: () => disabledIntegration("Deezer") };
}

export function useDeezerTrackMetrics() {
  return { data: null, isLoading: false, fetch: (_isrc: string) => disabledIntegration("Deezer") };
}
