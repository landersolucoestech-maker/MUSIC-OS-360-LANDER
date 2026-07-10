/**
 * integrations/hooks/useYouTube.ts
 *
 * Hook para integração YouTube Analytics.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";


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
      // Modo real: YouTube usa YOUTUBE_API_KEY configurado no servidor (env var).
      // Não há endpoint de configure — status reflete configuração do servidor.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "youtube", "status"] });
      toast.info("YouTube é configurado via variável de ambiente do servidor. Verifique o status atualizado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** @deprecated Mantido para retrocompatibilidade com YouTubeConfigDialog. */
export function useYouTubeDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
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
      if (!channelId) return null;
      return api.get<YouTubeChannelMetrics>(`/integrations/youtube/channel/${channelId}`);
    },
    enabled: !!channelId,
    staleTime: 60_000,
  });
}

export function useYouTubeVideoMetrics(videoId?: string) {
  return useQuery({
    queryKey: ["integrations", "youtube", "video", videoId],
    queryFn: async () => {
      if (!videoId) return null;
      return api.get(`/integrations/youtube/video/${videoId}`);
    },
    enabled: !!videoId,
    staleTime: 60_000,
  });
}

export function useYouTubeContentIdClaims() {
  return { data: null, isLoading: false, fetch: () => {} };
}

