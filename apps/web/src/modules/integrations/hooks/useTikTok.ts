/**
 * integrations/hooks/useTikTok.ts
 *
 * Hook para integração TikTok orgânico (Login Kit — distinto de TikTok Ads,
 * ver useTikTokAds.ts). O backend tem um fluxo OAuth real e funcional
 * (GET /integrations/tiktok/auth, POST /integrations/tiktok/callback,
 * GET /integrations/tiktok/status, DELETE /integrations/tiktok/disconnect —
 * apps/api/src/modules/integrations/tiktok/tiktok.service.ts), mas a TikTok
 * Display API não expõe endpoints de métricas de vídeo/som para esta conta
 * de desenvolvedor — por isso useTikTokVideoMetrics/useTikTokSoundMetrics
 * permanecem indisponíveis (não é um mock, é uma limitação real da API).
 *
 * Contrato: @/shared/integrations/contracts/streaming.contract → IStreamingProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do TikTok ──────────────────────────────────────────────

/** Espelha exatamente o retorno de IntegrationBaseService.getOAuthStatus() —
 * não estender IntegrationRuntimeStatus aqui, que teria campos (integration_id,
 * status) que o endpoint real não retorna. */
export interface TikTokStatus {
  connected: boolean;
}

// ─── Hook de status (real — GET /integrations/tiktok/status) ────────────────

export function useTikTokStatus() {
  return useQuery<TikTokStatus>({
    queryKey: ["integrations", "tiktok", "status"],
    queryFn: async () => api.get<TikTokStatus>("/integrations/tiktok/status"),
    staleTime: 30_000,
  });
}

export function useTikTokAuthUrl() {
  return useMutation({
    mutationFn: async () => api.get<{ url: string }>("/integrations/tiktok/auth"),
  });
}

export function useTikTokDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => api.delete("/integrations/tiktok/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "tiktok"] });
      toast.success("TikTok desconectado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Métricas indisponíveis (limitação real da TikTok Display API) ──────────

export function useTikTokVideoMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: () => disabledIntegration("TikTok video metrics (TikTok Display API não expõe este endpoint)"),
  };
}

export function useTikTokSoundMetrics() {
  return {
    data: null,
    isLoading: false,
    fetch: (_isrc: string) =>
      disabledIntegration("TikTok sound metrics (TikTok Display API não expõe este endpoint)"),
  };
}
