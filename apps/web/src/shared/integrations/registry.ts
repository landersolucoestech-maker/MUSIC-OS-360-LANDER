/**
 * shared/integrations/registry.ts
 *
 * Registro central de todas as integrações do MUSIC OS 360.
 * Fonte única de verdade para metadados de integrações.
 *
 * Uso:
 *   import { INTEGRATION_REGISTRY, getIntegration, getIntegrationsByCategory }
 *     from "@/shared/integrations/registry";
 */

import type { IntegrationCategory, IntegrationId, IntegrationMeta } from "./types";

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INTEGRATION_REGISTRY: Record<IntegrationId, IntegrationMeta> = {
  // ── Storage ───────────────────────────────────────────────────────────────
  r2: {
    id: "r2",
    name: "Cloudflare R2",
    category: "storage",
    description: "Armazenamento de ficheiros de áudio, capas, contratos e assets de marketing.",
    docsUrl: "https://developers.cloudflare.com/r2",
    credentialsKey: "musicos360_r2_credentials",
  },

  // ── Email ─────────────────────────────────────────────────────────────────
  resend: {
    id: "resend",
    name: "Resend",
    category: "email",
    description: "Envio transaccional de e-mails: convites, alertas de contrato, royalties e relatórios.",
    docsUrl: "https://resend.com/docs",
    credentialsKey: "musicos360_resend_credentials",
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  stripe: {
    id: "stripe",
    name: "Stripe",
    category: "payments",
    description: "Gestão de subscriptions SaaS, billing por tenant e processamento de pagamentos.",
    docsUrl: "https://stripe.com/docs",
    credentialsKey: "musicos360_stripe_credentials",
  },

  // ── Signing ───────────────────────────────────────────────────────────────
  autentique: {
    id: "autentique",
    name: "Autentique",
    category: "signing",
    description: "Assinatura digital de contratos com validade jurídica no Brasil.",
    docsUrl: "https://docs.autentique.com.br",
    credentialsKey: "musicos360_autentique_credentials",
  },

  // ── Monitoring ────────────────────────────────────────────────────────────
  posthog: {
    id: "posthog",
    name: "PostHog",
    category: "monitoring",
    description: "Analytics de produto: feature flags, funis, gravações de sessão e A/B testing.",
    docsUrl: "https://posthog.com/docs",
    credentialsKey: "musicos360_posthog_credentials",
  },
  sentry: {
    id: "sentry",
    name: "Sentry",
    category: "monitoring",
    description: "Monitoramento de erros e performance em tempo real.",
    docsUrl: "https://docs.sentry.io",
    credentialsKey: "musicos360_sentry_credentials",
  },

  // ── Streaming / Métricas ──────────────────────────────────────────────────
  spotify: {
    id: "spotify",
    name: "Spotify for Artists",
    category: "streaming",
    description: "Métricas de streams, ouvintes únicos, análise demográfica e campanhas de Marquee.",
    docsUrl: "https://artists.spotify.com",
    credentialsKey: "musicos360_spotify_credentials",
  },
  youtube: {
    id: "youtube",
    name: "YouTube Analytics",
    category: "streaming",
    description: "Métricas de visualizações, retenção, receita e gestão de claims via Content ID.",
    docsUrl: "https://developers.google.com/youtube/analytics",
    credentialsKey: "musicos360_youtube_credentials",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok for Business",
    category: "streaming",
    description: "Métricas de vídeos, sons virais e campanhas de TikTok Ads.",
    docsUrl: "https://ads.tiktok.com/help",
    credentialsKey: "musicos360_tiktok_credentials",
  },
  instagram: {
    id: "instagram",
    name: "Instagram Insights",
    category: "streaming",
    description: "Métricas de Reels, Stories, alcance e engagement via Graph API.",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
    credentialsKey: "musicos360_instagram_credentials",
  },
  "google-ads": {
    id: "google-ads",
    name: "Google Ads",
    category: "streaming",
    description: "Campanhas de YouTube Ads, Display e Search para promoção de lançamentos.",
    docsUrl: "https://ads.google.com/home",
    credentialsKey: "musicos360_google_ads_credentials",
  },
  deezer: {
    id: "deezer",
    name: "Deezer",
    category: "streaming",
    description: "Métricas de streams, favoritos e tendências no mercado brasileiro e francês.",
    docsUrl: "https://developers.deezer.com",
    credentialsKey: "musicos360_deezer_credentials",
  },
  "apple-music": {
    id: "apple-music",
    name: "Apple Music for Artists",
    category: "streaming",
    description: "Métricas de streams, Shazams, playlists editoriais e descoberta.",
    docsUrl: "https://artists.apple.com",
    credentialsKey: "musicos360_apple_music_credentials",
  },
  soundcloud: {
    id: "soundcloud",
    name: "SoundCloud",
    category: "streaming",
    description: "Métricas de plays, reposts, seguidores e integração com SoundCloud for Artists.",
    docsUrl: "https://developers.soundcloud.com",
    credentialsKey: "musicos360_soundcloud_credentials",
  },

  // ── Direitos / Arrecadação ────────────────────────────────────────────────
  ecad: {
    id: "ecad",
    name: "ECAD",
    category: "rights",
    description: "Consulta e conciliação de arrecadação de direitos de execução pública (ECAD).",
    docsUrl: "https://www.ecad.org.br",
    credentialsKey: "musicos360_ecad_credentials",
  },
  ubc: {
    id: "ubc",
    name: "UBC",
    category: "rights",
    description: "Gestão de obras e distribuição de direitos via União Brasileira de Compositores.",
    docsUrl: "https://www.ubc.org.br",
    credentialsKey: "musicos360_ubc_credentials",
  },
  abramus: {
    id: "abramus",
    name: "ABRAMUS",
    category: "rights",
    description: "Registro e conciliação de obras e fonogramas via ABRAMUS (mock funcional).",
    docsUrl: "https://www.abramus.org.br",
    credentialsKey: "musicos360_abramus_credentials",
  },

  // ── Music Monitoring (ACRCloud) ───────────────────────────────────────────
  acrcloud: {
    id: "acrcloud",
    name: "ACRCloud",
    category: "music-monitoring",
    description: "Reconhecimento de áudio e monitoramento de uso não autorizado.",
    docsUrl: "https://www.acrcloud.com/docs",
    credentialsKey: "musicos360_acrcloud_credentials",
  },

  // ── Chat ──────────────────────────────────────────────────────────────────
  chat: {
    id: "chat",
    name: "MusicChat",
    category: "chat",
    description: "Comunicação interna entre membros do time: mensagens, canais e notificações.",
    credentialsKey: "musicos360_chat_credentials",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna os metadados de uma integração pelo id. */
export function getIntegration(id: IntegrationId): IntegrationMeta {
  return INTEGRATION_REGISTRY[id];
}

/** Retorna todas as integrações de uma categoria. */
export function getIntegrationsByCategory(category: IntegrationCategory): IntegrationMeta[] {
  return Object.values(INTEGRATION_REGISTRY).filter((i) => i.category === category);
}

/** Retorna todas as integrações registadas. */
export function getAllIntegrations(): IntegrationMeta[] {
  return Object.values(INTEGRATION_REGISTRY);
}

/** Retorna todas as categorias únicas presentes no registry. */
export function getAllCategories(): IntegrationCategory[] {
  const set = new Set<IntegrationCategory>();
  for (const meta of Object.values(INTEGRATION_REGISTRY)) set.add(meta.category);
  return Array.from(set);
}

/**
 * Constrói a chave de localStorage para as credenciais de uma integração.
 * Convenção: `musicos360_<id>_credentials`
 */
export function credentialsStorageKey(id: IntegrationId): string {
  return `musicos360_${id.replace("-", "_")}_credentials`;
}
