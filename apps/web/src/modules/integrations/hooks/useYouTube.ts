/**
 * integrations/hooks/useYouTube.ts
 *
 * Hook para integração YouTube Analytics.
 * Status e métricas via backend. Em MOCK_MODE retorna stubs sem sessionStorage.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

// In-memory mock state (no sessionStorage)
let _mockConnected  = false;
let _mockChannelId: string | null = null;

export interface YouTubeStatus {
  connected: boolean;
  channel_id?: string | null;
  channel_title?: string | null;
  has_credentials?: boolean;
  content_id_enabled?: boolean;
  last_sync_at?: string | null;
}

export interface YouTubeChannelMetrics {
  channelId?: string;
  title?: string;
  subscriberCount?: number;
  viewCount?: number;
  videoCount?: number;
  thumbnailUrl?: string;
  error?: string;
}

export function useYouTubeStatus() {
  return useQuery<YouTubeStatus>({
    queryKey: ["integrations", "youtube", "status"],
    queryFn: async (): Promise<YouTubeStatus> => {
      if (MOCK_MODE) return {
        connected: _mockConnected,
        channel_id: _mockChannelId,
        channel_title: null,
        has_credentials: _mockConnected,
        content_id_enabled: false,
        last_sync_at: null,
      };
      const raw = await api.get<{ configured?: boolean; connected?: boolean } & Partial<YouTubeStatus>>("/integrations/youtube/status");
      return {
        connected: raw.connected ?? raw.configured ?? false,
        channel_id: raw.channel_id ?? null,
        channel_title: raw.channel_title ?? null,
        has_credentials: raw.has_credentials ?? raw.configured ?? false,
        content_id_enabled: raw.content_id_enabled ?? false,
        last_sync_at: raw.last_sync_at ?? null,
      };
    },
    staleTime: 30_000,
  });
}

/** @deprecated Mantido para retrocompatibilidade com YouTubeConfigDialog. */
export function useYouTubeSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { api_key?: string; channel_id?: string }) => {
      if (MOCK_MODE) {
        _mockConnected = true;
        _mockChannelId = input?.channel_id ?? null;
        return;
      }
      // Modo real: YouTube usa YOUTUBE_API_KEY configurado no servidor (env var).
      // Não há endpoint de configure — status reflete configuração do servidor.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "youtube", "status"] });
      if (MOCK_MODE) toast.success("YouTube conectado (modo mock).");
      else toast.info("YouTube é configurado via variável de ambiente do servidor. Verifique o status atualizado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** @deprecated Mantido para retrocompatibilidade com YouTubeConfigDialog. */
export function useYouTubeDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (MOCK_MODE) {
        _mockConnected = false;
        _mockChannelId = null;
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "youtube", "status"] });
      toast.success("YouTube Music desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useYouTubeChannelMetrics(channelId?: string) {
  return useQuery<YouTubeChannelMetrics | null>({
    queryKey: ["integrations", "youtube", "channel", channelId],
    queryFn: async () => {
      if (MOCK_MODE || !channelId) return null;
      return api.get<YouTubeChannelMetrics>(`/integrations/youtube/channel/${channelId}`);
    },
    enabled: !MOCK_MODE && !!channelId,
    staleTime: 60_000,
  });
}

export function useYouTubeVideoMetrics(videoId?: string) {
  return useQuery({
    queryKey: ["integrations", "youtube", "video", videoId],
    queryFn: async () => {
      if (MOCK_MODE || !videoId) return null;
      return api.get(`/integrations/youtube/video/${videoId}`);
    },
    enabled: !MOCK_MODE && !!videoId,
    staleTime: 60_000,
  });
}

export function useYouTubeContentIdClaims() {
  return { data: null, isLoading: false, fetch: () => {} };
}
