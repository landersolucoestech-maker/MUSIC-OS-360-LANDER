/**
 * modules/integrations/hooks/useMarketingOAuth.ts
 *
 * Hook OAuth unificado para integrações de Marketing Digital — contas corporativas.
 *
 * ARQUITECTURA CORRECTA:
 *   · Plataformas de ARTISTAS (Instagram, TikTok, Spotify, YouTube, Deezer, Apple Music,
 *     SoundCloud) → automáticas via links do cadastro do artista. SEM integração manual aqui.
 *
 *   · Este hook trata APENAS contas corporativas da empresa/label/publisher:
 *       meta_business    — Meta Business Suite (Facebook + Instagram + Meta Ads — unificado)
 *       corp_tiktok      — conta TikTok oficial da empresa
 *       corp_youtube     — canal YouTube oficial da empresa
 *       corp_spotify     — perfil Spotify oficial da empresa
 *       google_ads       — Google Ads
 *       tiktok_ads       — TikTok Ads Manager
 *       spotify_ads      — Spotify Ad Studio
 *       youtube_ads      — YouTube Ads (Google)
 *       deezer_ads       — Deezer Ad Manager
 *       apple_music_ads  — Apple Music for Artists (ads)
 *       soundcloud_ads   — SoundCloud Ads
 *
 * Categorias:
 *   corporate_metrics — analytics das contas oficiais da empresa
 *   paid_ads          — plataformas de tráfego pago
 */

import { useState, useEffect, useCallback } from "react";
import type {
  MarketingPlatformId,
  MarketingCategory,
  IMarketingOAuthConnection,
} from "@/shared/integrations/contracts/marketing.contract";

export type { MarketingPlatformId };

const STORAGE_KEY = "musicos360_marketing_oauth_connections";

// ─── Categoria por plataforma ────────────────────────────────────────────────

export const MARKETING_PLATFORM_CATEGORY: Record<MarketingPlatformId, MarketingCategory> = {
  // Métricas corporativas — contas oficiais da empresa
  meta_business:    "corporate_metrics",
  corp_tiktok:      "corporate_metrics",
  corp_youtube:     "corporate_metrics",
  corp_spotify:     "corporate_metrics",
  corp_google:      "corporate_metrics",
  corp_deezer:      "corporate_metrics",
  corp_soundcloud:  "corporate_metrics",
  corp_apple_music: "corporate_metrics",
  // Tráfego pago
  google_ads:       "paid_ads",
  tiktok_ads:       "paid_ads",
  spotify_ads:      "paid_ads",
  youtube_ads:      "paid_ads",
  deezer_ads:       "paid_ads",
  apple_music_ads:  "paid_ads",
  soundcloud_ads:   "paid_ads",
};

// ─── Contas mock (simulam dados reais após OAuth) ─────────────────────────────

const MOCK_ACCOUNTS: Record<MarketingPlatformId, { accountName: string; accountId: string }> = {
  meta_business: {
    accountName: "Music Business — Meta Business Suite (Facebook + Instagram + Ads)",
    accountId:   "META-BIZ-1234567890",
  },
  corp_tiktok: {
    accountName: "@musicbusiness TikTok (Business)",
    accountId:   "TT-CORP-7890123",
  },
  corp_youtube: {
    accountName: "Music Business — YouTube Studio",
    accountId:   "UCmusicbusiness123456",
  },
  corp_spotify: {
    accountName: "Music Business — Spotify for Artists",
    accountId:   "SP-CORP-456789",
  },
  corp_google: {
    accountName: "Music Business — Google Analytics 4",
    accountId:   "GA4-G-XXXXXX123",
  },
  corp_deezer: {
    accountName: "Music Business — Deezer for Artists",
    accountId:   "DZ-ARTIST-789012",
  },
  corp_soundcloud: {
    accountName: "Music Business — SoundCloud Pro",
    accountId:   "SC-PRO-345678",
  },
  corp_apple_music: {
    accountName: "Music Business — Apple Music for Artists",
    accountId:   "AM-ARTIST-901234",
  },
  google_ads: {
    accountName: "Music Business Ads (MCC)",
    accountId:   "MCC-123-456-789",
  },
  tiktok_ads: {
    accountName: "MusicBusiness — TikTok Ads Manager",
    accountId:   "TT-ADV-4567890",
  },
  spotify_ads: {
    accountName: "Music Business — Spotify Ad Studio",
    accountId:   "SP-ADV-123456",
  },
  youtube_ads: {
    accountName: "Music Business — YouTube Ads",
    accountId:   "YT-ADV-789012",
  },
  deezer_ads: {
    accountName: "Music Business — Deezer Ad Manager",
    accountId:   "DZ-ADV-345678",
  },
  apple_music_ads: {
    accountName: "Music Business — Apple Music for Artists",
    accountId:   "AM-ADV-901234",
  },
  soundcloud_ads: {
    accountName: "Music Business — SoundCloud Ads",
    accountId:   "SC-ADV-567890",
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

  /** Simula fluxo OAuth: popup → token → armazena conexão (~1.8s delay) */
  const connect = useCallback(
    async (platform: MarketingPlatformId, scopes: string[]): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mock = MOCK_ACCOUNTS[platform];
          const now  = new Date().toISOString();
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
              category: MARKETING_PLATFORM_CATEGORY[platform],
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

  /** Todas as conexões de uma categoria */
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

  /** Total de plataformas conectadas */
  const totalConnected = useCallback(
    (): number =>
      Object.values(connections).filter((c) => c?.connected).length,
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
    totalConnected,
  };
}
