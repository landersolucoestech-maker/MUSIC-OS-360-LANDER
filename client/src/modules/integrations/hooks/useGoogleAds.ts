/**
 * integrations/hooks/useGoogleAds.ts
 *
 * Hook de configuração para Google Ads.
 * Credenciais OAuth armazenadas em localStorage (musicos360_ prefix).
 * Padrão: mesmo que Clicksign/DocuSign/MetaAds.
 *
 * MIGRAÇÃO FUTURA: OAuth 2.0 com Google Identity (scope: adwords)
 * + Google Ads API v17 para campanhas, conjuntos e relatórios.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "musicos360_google_ads_credentials";

interface GoogleAdsCredentials {
  developer_token: string;
  client_id: string;
  client_secret: string;
  manager_account_id?: string;
  saved_at: string;
}

export interface GoogleAdsStatus {
  connected: boolean;
  has_credentials: boolean;
  manager_account_id?: string;
  saved_at?: string;
}

function loadCredentials(): GoogleAdsCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useGoogleAdsStatus() {
  return useQuery<GoogleAdsStatus>({
    queryKey: ["integrations", "google-ads", "status"],
    queryFn: (): GoogleAdsStatus => {
      const creds = loadCredentials();
      if (!creds) return { connected: false, has_credentials: false };
      return {
        connected: true,
        has_credentials: true,
        manager_account_id: creds.manager_account_id,
        saved_at: creds.saved_at,
      };
    },
    staleTime: 0,
  });
}

export function useGoogleAdsSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      developer_token: string;
      client_id: string;
      client_secret: string;
      manager_account_id?: string;
    }) => {
      const creds: GoogleAdsCredentials = {
        ...payload,
        saved_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "google-ads", "status"] });
    },
  });
}

export function useGoogleAdsDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem(STORAGE_KEY);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "google-ads", "status"] });
    },
  });
}
