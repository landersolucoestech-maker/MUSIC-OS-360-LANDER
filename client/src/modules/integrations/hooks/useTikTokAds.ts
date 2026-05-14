/**
 * integrations/hooks/useTikTokAds.ts
 *
 * Hook para integração TikTok Ads Manager.
 * Credenciais gerenciadas server-side (criptografadas no banco).
 * Em MOCK_MODE retorna stubs sem chamar o backend.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface TikTokAdsStatus {
  connected: boolean;
  last_sync_at?: string | null;
}

export interface TikTokAdsCredentials {
  appId: string;
  secret: string;
  advertiserId?: string;
  accessToken: string;
}

export function useTikTokAdsStatus() {
  return useQuery<TikTokAdsStatus>({
    queryKey: ["integrations", "tiktok-ads", "status"],
    queryFn: async (): Promise<TikTokAdsStatus> => {
      if (MOCK_MODE) return { connected: false, last_sync_at: null };
      return api.get<TikTokAdsStatus>("/integrations/tiktok/ads/status");
    },
    staleTime: 30_000,
  });
}

export function useTikTokAdsSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TikTokAdsCredentials) => {
      if (MOCK_MODE) return;
      return api.post("/integrations/tiktok/ads/configure", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "tiktok-ads"] });
      toast.success("TikTok Ads conectado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useTikTokAdsDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (MOCK_MODE) return;
      return api.delete("/integrations/tiktok/ads/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "tiktok-ads"] });
      toast.success("TikTok Ads desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useTikTokAdsCampaigns() {
  return useQuery({
    queryKey: ["integrations", "tiktok-ads", "campaigns"],
    queryFn: async () => {
      if (MOCK_MODE) return [];
      return api.get("/integrations/tiktok/ads/campaigns");
    },
    enabled: !MOCK_MODE,
    staleTime: 60_000,
  });
}
