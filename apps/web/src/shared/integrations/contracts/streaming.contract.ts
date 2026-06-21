/**
 * shared/integrations/contracts/streaming.contract.ts
 *
 * Contrato de métricas de streaming e publicidade digital.
 *
 * Plataformas cobertas:
 *   Streaming: Spotify · YouTube · TikTok · Instagram · Deezer · Apple Music · SoundCloud
 *   Ads:       Google Ads · Meta Ads (já em marketing/adapters/meta-ads.adapter.ts)
 *
 * ESTADO ACTUAL: standalone — métricas são MOCK_DATA.
 * MIGRAÇÃO FUTURA: cada plataforma implementa IStreamingProvider com a sua API.
 *
 * REGRA: Analytics module usa IStreamingProvider para company-level metrics.
 *        Artist module usa IStreamingProvider filtrado por artista (Visão 360 modal).
 *        Nenhum componente chama APIs de streaming directamente.
 */

// ─── Identificadores de plataforma ────────────────────────────────────────────

export type StreamingPlatformId =
  | "spotify"
  | "youtube"
  | "tiktok"
  | "instagram"
  | "deezer"
  | "apple-music"
  | "soundcloud";

export type AdsPlatformId =
  | "google-ads"
  | "meta-ads";

// ─── DTOs de métricas ─────────────────────────────────────────────────────────

export type MetricsPeriod = "7d" | "28d" | "30d" | "90d" | "365d" | "all";

export interface MetricsDateRange {
  from: string;  // ISO 8601
  to: string;    // ISO 8601
}

/** Série temporal de um único indicador */
export interface MetricTimeSeries {
  date: string;
  value: number;
}

/** Métricas de uma obra/fonograma numa plataforma */
export interface TrackMetrics {
  isrc: string;
  platform: StreamingPlatformId;
  streams: number;
  saves?: number;
  playlist_adds?: number;
  skip_rate?: number;
  completion_rate?: number;
  /** Série temporal de streams por dia */
  daily_streams?: MetricTimeSeries[];
}

/** Métricas gerais de um artista numa plataforma */
export interface ArtistMetrics {
  artist_id: string;
  platform: StreamingPlatformId;
  period: MetricsPeriod | MetricsDateRange;
  monthly_listeners?: number;
  followers?: number;
  total_streams: number;
  top_tracks: TrackMetrics[];
  /** Distribuição geográfica de streams por país */
  geo_breakdown?: Array<{ country: string; streams: number; pct: number }>;
  /** Evolução de ouvintes mensais */
  listener_trend?: MetricTimeSeries[];
}

/** Métricas de conteúdo em vídeo (YouTube, TikTok) */
export interface VideoMetrics {
  video_id: string;
  platform: "youtube" | "tiktok";
  views: number;
  likes?: number;
  comments?: number;
  shares?: number;
  watch_time_hours?: number;
  avg_view_duration_seconds?: number;
  /** Receita estimada em centavos (disponível apenas no YouTube) */
  estimated_revenue_cents?: number;
}

/** Métricas de conteúdo social (Instagram, TikTok) */
export interface SocialMetrics {
  account_id: string;
  platform: "instagram" | "tiktok";
  period: MetricsPeriod;
  reach: number;
  impressions: number;
  profile_visits?: number;
  followers: number;
  followers_gained: number;
  engagement_rate: number;
  top_posts: Array<{
    post_id: string;
    type: "reel" | "post" | "story" | "video";
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    plays?: number;
  }>;
}

// ─── DTOs de campanhas de ads ─────────────────────────────────────────────────

export interface AdCampaign {
  campaign_id: string;
  platform: AdsPlatformId;
  name: string;
  status: "active" | "paused" | "ended" | "draft";
  budget_daily_cents: number;
  spend_total_cents: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc_cents: number;
  conversions?: number;
  started_at: string;
  ended_at?: string | null;
}

// ─── Contrato de streaming ────────────────────────────────────────────────────

/**
 * IStreamingProvider — contrato de métricas de streaming por plataforma.
 *
 * Implementações previstas (uma por plataforma):
 *   - MockStreamingProvider        (standalone — MOCK_DATA)
 *   - SpotifyStreamingProvider     (Spotify for Artists API)
 *   - YouTubeStreamingProvider     (YouTube Analytics API v2)
 *   - TikTokStreamingProvider      (TikTok for Business API)
 *   - InstagramStreamingProvider   (Instagram Graph API)
 *   - DeezerStreamingProvider      (Deezer API)
 *   - AppleMusicStreamingProvider  (Apple Music for Artists API)
 *   - SoundCloudStreamingProvider  (SoundCloud API v2)
 */
export interface IStreamingProvider {
  readonly platform: StreamingPlatformId;

  /** Métricas de um artista no período */
  getArtistMetrics(
    artistId: string,
    period: MetricsPeriod | MetricsDateRange
  ): Promise<ArtistMetrics>;

  /** Métricas de uma obra/fonograma por ISRC */
  getTrackMetrics(
    isrc: string,
    period: MetricsPeriod | MetricsDateRange
  ): Promise<TrackMetrics>;

  /** Métricas de vídeo (YouTube / TikTok) */
  getVideoMetrics?(
    videoId: string,
    period: MetricsPeriod | MetricsDateRange
  ): Promise<VideoMetrics>;

  /** Métricas sociais (Instagram / TikTok) */
  getSocialMetrics?(
    accountId: string,
    period: MetricsPeriod
  ): Promise<SocialMetrics>;

  /** Verifica se as credenciais configuradas são válidas */
  verifyConnection(): Promise<boolean>;
}

// ─── Contrato de ads ──────────────────────────────────────────────────────────

/**
 * IAdsProvider — contrato de campanhas de publicidade digital.
 *
 * Implementações previstas:
 *   - MockAdsProvider       (standalone — MOCK_DATA)
 *   - GoogleAdsProvider     (Google Ads API)
 *   - MetaAdsProvider       (Meta Marketing API — já em marketing/hooks/useMetaAds.ts)
 */
export interface IAdsProvider {
  readonly platform: AdsPlatformId;

  listCampaigns(params?: { status?: AdCampaign["status"] }): Promise<AdCampaign[]>;
  getCampaign(campaignId: string): Promise<AdCampaign>;

  verifyConnection(): Promise<boolean>;
}

// ─── Metadados de plataformas ─────────────────────────────────────────────────

export interface StreamingPlatformMeta {
  id: StreamingPlatformId;
  name: string;
  color: string;
  /** Chave métrica principal exibida nos cards */
  primaryMetric: "streams" | "views" | "plays" | "listeners";
  /** URL base de perfil para construir links de artista */
  profileBaseUrl: string;
}

export const STREAMING_PLATFORMS: Record<StreamingPlatformId, StreamingPlatformMeta> = {
  spotify: {
    id: "spotify",
    name: "Spotify",
    color: "#1DB954",
    primaryMetric: "streams",
    profileBaseUrl: "https://open.spotify.com/artist/",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    primaryMetric: "views",
    profileBaseUrl: "https://youtube.com/channel/",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    color: "#010101",
    primaryMetric: "plays",
    profileBaseUrl: "https://www.tiktok.com/@",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    primaryMetric: "plays",
    profileBaseUrl: "https://instagram.com/",
  },
  deezer: {
    id: "deezer",
    name: "Deezer",
    color: "#FF0092",
    primaryMetric: "streams",
    profileBaseUrl: "https://www.deezer.com/artist/",
  },
  "apple-music": {
    id: "apple-music",
    name: "Apple Music",
    color: "#FC3C44",
    primaryMetric: "plays",
    profileBaseUrl: "https://music.apple.com/artist/",
  },
  soundcloud: {
    id: "soundcloud",
    name: "SoundCloud",
    color: "#FF5500",
    primaryMetric: "plays",
    profileBaseUrl: "https://soundcloud.com/",
  },
};

