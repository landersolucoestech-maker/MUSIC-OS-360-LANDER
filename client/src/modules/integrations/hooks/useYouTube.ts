/**
 * integrations/hooks/useYouTube.ts
 *
 * Hook para integração YouTube Analytics.
 * Status e métricas via backend. Em MOCK_MODE retorna stubs.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface YouTubeStatus {
  connected: boolean;
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
      if (MOCK_MODE) return { connected: false, last_sync_at: null };
      return api.get<YouTubeStatus>("/integrations/youtube/status");
    },
    staleTime: 30_000,
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

/** @deprecated Use useYouTubeStatus */
export function useYouTubeSaveCredentials() {
  return { mutate: () => {}, isPending: false };
}

/** @deprecated */
export function useYouTubeDeleteCredentials() {
  return { mutate: () => {}, isPending: false };
}
