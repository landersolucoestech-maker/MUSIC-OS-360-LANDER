/**
 * integrations/hooks/useYouTube.ts
 *
 * Hook para integração YouTube Analytics + Content ID.
 *
 * ESTADO ACTUAL: standalone — credenciais persistidas em localStorage.
 * MIGRAÇÃO FUTURA:
 *   1. OAuth 2.0 com Google Identity (scope: yt-analytics.readonly, youtube.readonly)
 *   2. YouTube Analytics API v2 para métricas de canal e vídeo
 *   3. YouTube Data API v3 para metadados e claims Content ID
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

const LS_KEY = "musicos360_youtube_credentials";

export interface YouTubeCredentials {
  api_key: string;
  channel_id?: string;
}

export interface YouTubeStatus {
  connected: boolean;
  status: string;
  has_credentials: boolean;
  channel_id?: string | null;
  channel_title?: string | null;
  content_id_enabled: boolean;
  last_error?: string | null;
  last_checked_at: string;
}

function readCredentials(): YouTubeCredentials | null {
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useYouTubeStatus() {
  return useQuery<YouTubeStatus>({
    queryKey: ["integrations", "youtube", "status"],
    queryFn: async (): Promise<YouTubeStatus> => {
      const creds = readCredentials();
      if (creds?.api_key) {
        return {
          connected: true,
          status: "connected",
          has_credentials: true,
          channel_id: creds.channel_id ?? null,
          channel_title: null,
          content_id_enabled: false,
          last_error: null,
          last_checked_at: new Date().toISOString(),
        };
      }
      return {
        connected: false,
        status: "disconnected",
        has_credentials: false,
        channel_id: null,
        channel_title: null,
        content_id_enabled: false,
        last_error: null,
        last_checked_at: new Date().toISOString(),
      };
    },
    staleTime: 0,
  });
}

export function useYouTubeSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: YouTubeCredentials) => {
      try {
        sessionStorage.setItem(LS_KEY, JSON.stringify(input));
      } catch {
        throw new Error("Não foi possível salvar as credenciais.");
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "youtube", "status"] });
      toast.success("YouTube Music conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useYouTubeDeleteCredentials() {
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
      queryClient.invalidateQueries({ queryKey: ["integrations", "youtube", "status"] });
      toast.success("YouTube Music desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useYouTubeChannelMetrics() {
  return { data: null, isLoading: false, fetch: () => disabledIntegration("YouTube Analytics") };
}

export function useYouTubeVideoMetrics() {
  return { data: null, isLoading: false, fetch: (_videoId: string) => disabledIntegration("YouTube Analytics") };
}

export function useYouTubeContentIdClaims() {
  return { data: null, isLoading: false, fetch: () => disabledIntegration("YouTube Content ID") };
}
