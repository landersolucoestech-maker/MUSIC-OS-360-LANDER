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
import { safeSessionSet } from "@/shared/lib/safe-storage";
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
  youtube_business: "corporate_metrics",
  tiktok_business:  "corporate_metrics",
  google_business:  "corporate_metrics",
  corp_spotify:     "corporate_metrics",
  corp_deezer:      "corporate_metrics",
  corp_soundcloud:  "corporate_metrics",
  corp_apple_music: "corporate_metrics",
  corp_instagram:   "corporate_metrics",
  corp_tiktok:      "corporate_metrics",
  corp_youtube:     "corporate_metrics",
  // Tráfego pago
  meta_ads:         "paid_ads",
  google_ads:       "paid_ads",
  tiktok_ads:       "paid_ads",
  youtube_ads:      "paid_ads",
  spotify_ads:      "paid_ads",
  deezer_ads:       "paid_ads",
  apple_music_ads:  "paid_ads",
  soundcloud_ads:   "paid_ads",
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
    safeSessionSet(STORAGE_KEY, connections); // strips any token/secret (CWE-312)
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

  /**
   * Stores an OAuth connection.
   *
   *    * real token received from the platform via the popup → OAuthCallbackPage →
   * postMessage flow.  Calling connect() without a token in production indicates
   * the OAuth flow did not complete and nothing should be persisted as "connected".
   * This keeps UI state consistent with what platform services expect:
   * a missing token means "not configured", not "connected but broken".
   */
  const connect = useCallback(
    async (platform: MarketingPlatformId, scopes: string[], access_token?: string): Promise<void> => {
      // Guard: nunca persistir conexão sem token real do fluxo OAuth.
      if (!access_token) {
        console.warn(`[useMarketingOAuth] connect(${platform}) called without access_token in production — ignoring.`);
        return;
      }

      const now = new Date().toISOString();
      setConnections((prev) => ({
        ...prev,
        [platform]: {
          platform,
          connected:    true,
          // Nome/ID reais da conta virão do backend quando o fluxo OAuth expuser
          // o perfil; até lá ficam vazios — nunca fabricados.
          accountName:  "",
          accountId:    "",
          connectedAt:  now,
          expiresAt:    undefined,
          scopes,
          category:     MARKETING_PLATFORM_CATEGORY[platform],
          access_token,
        } satisfies IMarketingOAuthConnection,
      }));
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

