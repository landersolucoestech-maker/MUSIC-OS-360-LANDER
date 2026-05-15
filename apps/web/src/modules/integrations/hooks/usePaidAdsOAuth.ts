/**
 * modules/integrations/hooks/usePaidAdsOAuth.ts
 *
 * Hook OAuth para plataformas de Tráfego Pago / Campanhas.
 * Idêntico ao useLeadOAuth mas focado em gestão de campanhas e métricas de ads.
 *
 * Plataformas: Meta Ads · Google Ads · TikTok Ads
 */

import { useState, useEffect, useCallback } from "react";

export type PaidAdsPlatform = "meta_ads" | "google_ads" | "tiktok_ads";

export interface PaidAdsOAuthConnection {
  platform:    PaidAdsPlatform;
  connected:   boolean;
  accountName?: string;
  accountId?:   string;
  connectedAt?: string;
  scopes?:      string[];
  expiresAt?:   string;
}

const STORAGE_KEY = "musicos360_paid_ads_oauth_connections";

const MOCK_ACCOUNTS: Record<PaidAdsPlatform, { accountName: string; accountId: string }> = {
  meta_ads: {
    accountName: "Music Business — Meta Business Suite",
    accountId:   "act_9012345678",
  },
  google_ads: {
    accountName: "Music Business Ads (MCC)",
    accountId:   "MCC-123-456-789",
  },
  tiktok_ads: {
    accountName: "MusicBusiness TikTok Ads Manager",
    accountId:   "TT-ADV-4567890",
  },
};

function loadConnections(): Partial<Record<PaidAdsPlatform, PaidAdsOAuthConnection>> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveConnections(
  connections: Partial<Record<PaidAdsPlatform, PaidAdsOAuthConnection>>
): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(connections)); } catch { /* ignore */ }
}

export function usePaidAdsOAuth() {
  const [connections, setConnections] = useState<
    Partial<Record<PaidAdsPlatform, PaidAdsOAuthConnection>>
  >(loadConnections);

  useEffect(() => {
    saveConnections(connections);
  }, [connections]);

  const connect = useCallback(
    async (platform: PaidAdsPlatform, scopes: string[]): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mock = MOCK_ACCOUNTS[platform];
          const now = new Date().toISOString();
          const expiresAt = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
          setConnections((prev) => ({
            ...prev,
            [platform]: {
              platform,
              connected:   true,
              accountName: mock.accountName,
              accountId:   mock.accountId,
              connectedAt: now,
              expiresAt,
              scopes,
            },
          }));
          resolve();
        }, 1800);
      });
    },
    []
  );

  const disconnect = useCallback((platform: PaidAdsPlatform): void => {
    setConnections((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  }, []);

  const getConnection = useCallback(
    (platform: PaidAdsPlatform): PaidAdsOAuthConnection | undefined =>
      connections[platform],
    [connections]
  );

  const isConnected = useCallback(
    (platform: PaidAdsPlatform): boolean =>
      connections[platform]?.connected === true,
    [connections]
  );

  return { connections, connect, disconnect, getConnection, isConnected };
}
