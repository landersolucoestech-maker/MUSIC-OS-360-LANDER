/**
 * integrations/hooks/useTikTokAds.ts
 *
 * Hook de configuração para TikTok Ads Manager.
 * Credenciais OAuth armazenadas em localStorage (musicos360_ prefix).
 * Padrão: mesmo que GoogleAds/MetaAds/Clicksign.
 *
 * NOTA: Este hook é exclusivo para a plataforma de anúncios pagos (TikTok Ads).
 * Métricas orgânicas de vídeo/som ficam em useTikTok.ts (via perfil do artista).
 *
 * MIGRAÇÃO FUTURA: OAuth 2.0 com TikTok Login Kit
 * + TikTok Ads API v1.3 para campanhas, conjuntos de anúncios, criativos, relatórios.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "musicos360_tiktok_ads_credentials";

interface TikTokAdsCredentials {
  app_id: string;
  secret: string;
  advertiser_id?: string;
  saved_at: string;
}

export interface TikTokAdsStatus {
  connected: boolean;
  has_credentials: boolean;
  advertiser_id?: string;
  saved_at?: string;
}

function loadCredentials(): TikTokAdsCredentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useTikTokAdsStatus() {
  return useQuery<TikTokAdsStatus>({
    queryKey: ["integrations", "tiktok-ads", "status"],
    queryFn: (): TikTokAdsStatus => {
      const creds = loadCredentials();
      if (!creds) return { connected: false, has_credentials: false };
      return {
        connected: true,
        has_credentials: true,
        advertiser_id: creds.advertiser_id,
        saved_at: creds.saved_at,
      };
    },
    staleTime: 0,
  });
}

export function useTikTokAdsSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      app_id: string;
      secret: string;
      advertiser_id?: string;
    }) => {
      const creds: TikTokAdsCredentials = {
        ...payload,
        saved_at: new Date().toISOString(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "tiktok-ads", "status"] });
    },
  });
}

export function useTikTokAdsDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      sessionStorage.removeItem(STORAGE_KEY);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "tiktok-ads", "status"] });
    },
  });
}
