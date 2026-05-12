/**
 * modules/integrations/hooks/useMarketingOAuth.ts
 *
 * Hook OAuth unificado para todas as integrações de Marketing Digital.
 * Substitui useLeadOAuth + usePaidAdsOAuth no contexto de Configuracoes.tsx.
 *
 * Categorias:
 *   Tráfego Pago   → meta_ads | google_ads | tiktok_ads
 *   Captação Leads → linkedin | facebook_leads
 *   Métricas       → youtube_analytics | instagram_insights | tiktok_analytics
 */

import { useState, useEffect, useCallback } from "react";
import type {
  MarketingPlatformId,
  MarketingCategory,
  IMarketingOAuthConnection,
} from "@/shared/integrations/contracts/marketing.contract";

export type { MarketingPlatformId };

const STORAGE_KEY = "musicos360_marketing_oauth_connections";

// ─── Metadata por plataforma ──────────────────────────────────────────────────

export const MARKETING_PLATFORM_CATEGORY: Record<MarketingPlatformId, MarketingCategory> = {
  meta_ads:           "paid_traffic",
  google_ads:         "paid_traffic",
  tiktok_ads:         "paid_traffic",
  linkedin:           "lead_capture",
  facebook_leads:     "lead_capture",
  youtube_analytics:  "metrics",
  instagram_insights: "metrics",
  tiktok_analytics:   "metrics",
};

// ─── Mock accounts (simulam dados reais após OAuth) ───────────────────────────

const MOCK_ACCOUNTS: Record<MarketingPlatformId, { accountName: string; accountId: string }> = {
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
  linkedin: {
    accountName: "Music Business — LinkedIn Campaign Manager",
    accountId:   "LI-ORG-456321",
  },
  facebook_leads: {
    accountName: "Music Business — Meta Lead Ads",
    accountId:   "act_8823456789",
  },
  youtube_analytics: {
    accountName: "Music Business — YouTube Studio",
    accountId:   "UCmusicbusiness123456",
  },
  instagram_insights: {
    accountName: "@musicbusiness_oficial",
    accountId:   "IG_987654321",
  },
  tiktok_analytics: {
    accountName: "MusicBusiness TikTok Creator",
    accountId:   "TT-CRT-7890123",
  },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

type ConnectionMap = Partial<Record<MarketingPlatformId, IMarketingOAuthConnection>>;

function loadConnections(): ConnectionMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConnectionMap) : {};
  } catch {
    return {};
  }
}

function saveConnections(connections: ConnectionMap): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
  } catch {
    // ignore quota errors
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketingOAuth() {
  const [connections, setConnections] = useState<ConnectionMap>(loadConnections);

  useEffect(() => {
    saveConnections(connections);
  }, [connections]);

  /** Simula o fluxo OAuth: abre popup → retorna token → armazena conexão */
  const connect = useCallback(
    async (platform: MarketingPlatformId, scopes: string[]): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mock = MOCK_ACCOUNTS[platform];
          const now = new Date().toISOString();
          const expiresAt = new Date(
            Date.now() + 60 * 24 * 3600 * 1000
          ).toISOString();

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
              category:    MARKETING_PLATFORM_CATEGORY[platform],
            } satisfies IMarketingOAuthConnection,
          }));
          resolve();
        }, 1800);
      });
    },
    []
  );

  const disconnect = useCallback((platform: MarketingPlatformId): void => {
    setConnections((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  }, []);

  const getConnection = useCallback(
    (platform: MarketingPlatformId): IMarketingOAuthConnection | undefined =>
      connections[platform],
    [connections]
  );

  const isConnected = useCallback(
    (platform: MarketingPlatformId): boolean =>
      connections[platform]?.connected === true,
    [connections]
  );

  /** Devolve todas as conexões de uma categoria */
  const getConnectionsByCategory = useCallback(
    (category: MarketingCategory): IMarketingOAuthConnection[] =>
      Object.values(connections).filter(
        (c): c is IMarketingOAuthConnection =>
          c !== undefined && c.category === category
      ),
    [connections]
  );

  /** Número de plataformas conectadas por categoria */
  const connectedCountByCategory = useCallback(
    (category: MarketingCategory): number =>
      Object.values(connections).filter(
        (c) => c?.category === category && c.connected
      ).length,
    [connections]
  );

  return {
    connections,
    connect,
    disconnect,
    getConnection,
    isConnected,
    getConnectionsByCategory,
    connectedCountByCategory,
  };
}
