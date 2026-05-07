/**
 * MUSIC OS 360 — Integration Registry
 *
 * Single source of truth for all integration metadata.
 * Integrations listed here are UI-discoverable in Settings.
 *
 * Status:
 *   active    — fully implemented and connectable
 *   beta      — in development, limited access
 *   planned   — roadmap, UI placeholder only
 *   disabled  — temporarily unavailable
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntegrationCategory =
  | "distribuicao"
  | "direitos"
  | "streaming"
  | "social"
  | "assinatura"
  | "comunicacao"
  | "storage"
  | "financeiro";

export type IntegrationStatus = "active" | "beta" | "planned" | "disabled";

export interface Integration {
  id:           string;
  name:         string;
  slug:         string;
  description:  string;
  category:     IntegrationCategory;
  status:       IntegrationStatus;
  logoIcon?:    string;  // lucide icon name or si- brand icon key
  website:      string;
  /** Feature flag key required to enable this integration */
  featureFlag:  string;
  /** Whether this integration supports OAuth flow */
  supportsOAuth: boolean;
  /** Whether this integration supports API key auth */
  supportsApiKey: boolean;
  /** Documentation URL */
  docsUrl?:     string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INTEGRATION_REGISTRY: Integration[] = [
  // ── Direitos / Arrecadação
  {
    id:             "abramus",
    name:           "ABRAMUS",
    slug:           "abramus",
    description:    "Associação Brasileira de Música e Artes. Sincronização de obras e fonogramas, arrecadação ECAD.",
    category:       "direitos",
    status:         "active",
    website:        "https://www.abramus.org.br",
    featureFlag:    "abramusIntegration",
    supportsOAuth:  false,
    supportsApiKey: true,
    docsUrl:        "https://www.abramus.org.br/api",
  },
  {
    id:             "ecad",
    name:           "ECAD",
    slug:           "ecad",
    description:    "Escritório Central de Arrecadação e Distribuição. Consulta e conciliação de arrecadação.",
    category:       "direitos",
    status:         "planned",
    website:        "https://www.ecad.org.br",
    featureFlag:    "ecadIntegration",
    supportsOAuth:  false,
    supportsApiKey: false,
  },

  // ── Distribuição Digital
  {
    id:             "onerpm",
    name:           "ONErpm",
    slug:           "onerpm",
    description:    "Distribuição digital global, relatórios de streaming e gestão de lançamentos.",
    category:       "distribuicao",
    status:         "planned",
    website:        "https://www.onerpm.com",
    featureFlag:    "onerpIntegration",
    supportsOAuth:  true,
    supportsApiKey: true,
  },
  {
    id:             "symphonic",
    name:           "Symphonic Distribution",
    slug:           "symphonic",
    description:    "Distribuição independente para artistas e gravadoras.",
    category:       "distribuicao",
    status:         "planned",
    website:        "https://www.symphonicdistribution.com",
    featureFlag:    "symphonicIntegration",
    supportsOAuth:  false,
    supportsApiKey: true,
  },
  {
    id:             "distrokid",
    name:           "DistroKid",
    slug:           "distrokid",
    description:    "Distribuição musical para artistas independentes.",
    category:       "distribuicao",
    status:         "planned",
    website:        "https://distrokid.com",
    featureFlag:    "distrokidIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
  },
  {
    id:             "soundon",
    name:           "SoundOn",
    slug:           "soundon",
    description:    "Plataforma de distribuição da TikTok para artistas independentes.",
    category:       "distribuicao",
    status:         "planned",
    website:        "https://soundon.global",
    featureFlag:    "soundonIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
  },
  {
    id:             "musicpro",
    name:           "MusicPro",
    slug:           "musicpro",
    description:    "Gestão e distribuição de catálogo musical.",
    category:       "distribuicao",
    status:         "planned",
    website:        "https://musicpro.com.br",
    featureFlag:    "musicproIntegration",
    supportsOAuth:  false,
    supportsApiKey: true,
  },
  {
    id:             "somvibe",
    name:           "Somvibe",
    slug:           "somvibe",
    description:    "Distribuição e analytics para o mercado musical brasileiro.",
    category:       "distribuicao",
    status:         "planned",
    website:        "https://somvibe.com",
    featureFlag:    "somvibeIntegration",
    supportsOAuth:  false,
    supportsApiKey: true,
  },

  // ── Assinatura / Documentos
  {
    id:             "autentique",
    name:           "Autentique",
    slug:           "autentique",
    description:    "Assinatura digital de contratos com validade jurídica.",
    category:       "assinatura",
    status:         "planned",
    website:        "https://www.autentique.com.br",
    featureFlag:    "autentiqueIntegration",
    supportsOAuth:  false,
    supportsApiKey: true,
    docsUrl:        "https://docs.autentique.com.br",
  },

  // ── Streaming
  {
    id:             "spotify",
    name:           "Spotify for Artists",
    slug:           "spotify",
    description:    "Analytics de streams, perfil de artista e pitching editorial.",
    category:       "streaming",
    status:         "planned",
    website:        "https://artists.spotify.com",
    featureFlag:    "spotifyIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
    docsUrl:        "https://developer.spotify.com",
  },
  {
    id:             "youtube",
    name:           "YouTube Music",
    slug:           "youtube",
    description:    "Analytics do YouTube e Content ID para monetização.",
    category:       "streaming",
    status:         "planned",
    website:        "https://www.youtube.com/music",
    featureFlag:    "youtubeIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
    docsUrl:        "https://developers.google.com/youtube",
  },
  {
    id:             "deezer",
    name:           "Deezer",
    slug:           "deezer",
    description:    "Analytics e gestão de perfil no Deezer.",
    category:       "streaming",
    status:         "planned",
    website:        "https://www.deezer.com",
    featureFlag:    "deezerIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
    docsUrl:        "https://developers.deezer.com",
  },
  {
    id:             "apple-music",
    name:           "Apple Music for Artists",
    slug:           "apple-music",
    description:    "Analytics e gestão de perfil no Apple Music.",
    category:       "streaming",
    status:         "planned",
    website:        "https://artists.apple.com",
    featureFlag:    "appleMusicIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
  },
  {
    id:             "soundcloud",
    name:           "SoundCloud",
    slug:           "soundcloud",
    description:    "Analytics e gestão de perfil no SoundCloud.",
    category:       "streaming",
    status:         "planned",
    website:        "https://soundcloud.com",
    featureFlag:    "soundcloudIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
    docsUrl:        "https://developers.soundcloud.com",
  },

  // ── Social / Marketing
  {
    id:             "meta-ads",
    name:           "Meta Ads",
    slug:           "meta-ads",
    description:    "Gestão de campanhas no Facebook e Instagram.",
    category:       "social",
    status:         "planned",
    website:        "https://business.facebook.com",
    featureFlag:    "metaAdsIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
    docsUrl:        "https://developers.facebook.com/docs/marketing-api",
  },
  {
    id:             "google-ads",
    name:           "Google Ads",
    slug:           "google-ads",
    description:    "Campanhas de busca e display no Google.",
    category:       "social",
    status:         "planned",
    website:        "https://ads.google.com",
    featureFlag:    "googleIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
  },
  {
    id:             "tiktok",
    name:           "TikTok for Business",
    slug:           "tiktok",
    description:    "Analytics e campanhas no TikTok.",
    category:       "social",
    status:         "planned",
    website:        "https://www.tiktok.com/business",
    featureFlag:    "tiktokIntegration",
    supportsOAuth:  true,
    supportsApiKey: false,
    docsUrl:        "https://developers.tiktok.com",
  },

  // ── Comunicação
  {
    id:             "resend",
    name:           "Resend",
    slug:           "resend",
    description:    "Envio transacional de e-mails para notificações e contratos.",
    category:       "comunicacao",
    status:         "planned",
    website:        "https://resend.com",
    featureFlag:    "resendIntegration",
    supportsOAuth:  false,
    supportsApiKey: true,
    docsUrl:        "https://resend.com/docs",
  },
];

/** Get integration by ID */
export function getIntegration(id: string): Integration | undefined {
  return INTEGRATION_REGISTRY.find(i => i.id === id);
}

/** Get integrations by category */
export function getIntegrationsByCategory(category: IntegrationCategory): Integration[] {
  return INTEGRATION_REGISTRY.filter(i => i.category === category);
}

/** Get active integrations */
export function getActiveIntegrations(): Integration[] {
  return INTEGRATION_REGISTRY.filter(i => i.status === "active");
}

export const INTEGRATION_CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  distribuicao: "Distribuição Digital",
  direitos:     "Direitos & Arrecadação",
  streaming:    "Plataformas de Streaming",
  social:       "Social & Marketing",
  assinatura:   "Assinatura Digital",
  comunicacao:  "Comunicação",
  storage:      "Armazenamento",
  financeiro:   "Financeiro",
};
