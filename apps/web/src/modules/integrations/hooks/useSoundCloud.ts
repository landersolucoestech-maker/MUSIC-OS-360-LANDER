/**
 * integrations/hooks/useSoundCloud.ts
 *
 * Hook para integração SoundCloud.
 * Credenciais gerenciadas server-side (criptografadas no banco).
 * Em MOCK_MODE retorna stubs sem chamar o backend.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface SoundCloudStatus {
  connected: boolean;
  last_sync_at?: string | null;
  permalink?: string | null;
  username?: string | null;
}

export interface SoundCloudCredentials {
  client_id: string;
  client_secret: string;
  permalink?: string;
}

export function useSoundCloudStatus() {
  return useQuery<SoundCloudStatus>({
    queryKey: ["integrations", "soundcloud", "status"],
    queryFn: async (): Promise<SoundCloudStatus> => {
      if (MOCK_MODE) return { connected: false, last_sync_at: null };
      return api.get<SoundCloudStatus>("/integrations/soundcloud/status");
    },
    staleTime: 30_000,
  });
}

export function useSoundCloudSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SoundCloudCredentials) => {
      if (MOCK_MODE) return;
      return api.post("/integrations/soundcloud/configure", {
        clientId: input.client_id,
        clientSecret: input.client_secret,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "soundcloud"] });
      toast.success("SoundCloud conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSoundCloudDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (MOCK_MODE) return;
      return api.delete("/integrations/soundcloud/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "soundcloud"] });
      toast.success("SoundCloud desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSoundCloudUserMetrics(permalinkUrl?: string) {
  return useQuery({
    queryKey: ["integrations", "soundcloud", "user", permalinkUrl],
    queryFn: async () => {
      if (MOCK_MODE || !permalinkUrl) return null;
      return api.get(`/integrations/soundcloud/user?url=${encodeURIComponent(permalinkUrl)}`);
    },
    enabled: !MOCK_MODE && !!permalinkUrl,
    staleTime: 60_000,
  });
}

export function useSoundCloudTrackMetrics(trackId?: string) {
  return useQuery({
    queryKey: ["integrations", "soundcloud", "track", trackId],
    queryFn: async () => {
      if (MOCK_MODE || !trackId) return null;
      return api.get(`/integrations/soundcloud/track/${trackId}`);
    },
    enabled: !MOCK_MODE && !!trackId,
    staleTime: 60_000,
  });
}

export function useSoundCloudArtistMetrics() {
  return { data: null, isLoading: false, fetch: (_permalink: string) => {} };
}

