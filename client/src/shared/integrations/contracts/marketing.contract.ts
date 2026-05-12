/**
 * shared/integrations/contracts/marketing.contract.ts
 *
 * Contratos unificados para integrações de Marketing Digital — contas corporativas.
 *
 * ARQUITECTURA:
 * — Plataformas dos ARTISTAS (Instagram, TikTok, Spotify, YouTube, Deezer, Apple Music,
 *   SoundCloud) funcionam AUTOMATICAMENTE via links do cadastro do artista.
 *   NÃO existe integração manual separada para artistas nessas plataformas.
 *
 * — Este módulo trata APENAS contas corporativas da empresa/label/publisher:
 *   · Métricas Corporativas — contas analytics da empresa
 *   · Tráfego Pago         — contas de anúncios da empresa
 *   · Website & Outros     — formulários, landing pages, API directa
 */

// ─── IDs de plataforma ────────────────────────────────────────────────────────

export type MarketingPlatformId =
  // Métricas Corporativas (analytics das contas oficiais da empresa)
  | "corp_instagram"
  | "corp_tiktok"
  | "corp_youtube"
  | "corp_spotify"
  // Tráfego Pago
  | "meta_ads"
  | "google_ads"
  | "tiktok_ads"
  | "spotify_ads"
  | "youtube_ads"
  | "deezer_ads"
  | "apple_music_ads"
  | "soundcloud_ads";

export type MarketingCategory = "corporate_metrics" | "paid_ads";

export type CampaignStatus = "active" | "paused" | "ended" | "draft" | "archived";

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

// ─── Campanhas (Tráfego Pago) ─────────────────────────────────────────────────

export interface ICampaign {
  id: string;
  platform: MarketingPlatformId;
  name: string;
  status: CampaignStatus;
  objective: string;
  budget: number;
  budgetType: "daily" | "lifetime";
  spent: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  roas?: number;
  startDate: string;
  endDate?: string;
  updatedAt: string;
}

export interface ICampaignSyncResult {
  synced: number;
  updated: number;
  errors: number;
  lastSyncAt: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface ICapturedLead {
  id: string;
  platform: MarketingPlatformId;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  status: LeadStatus;
  capturedAt: string;
  campaignId?: string;
  campaignName?: string;
  formName?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ILeadSyncResult {
  synced: number;
  duplicates: number;
  errors: number;
  lastSyncAt: string;
}

// ─── Métricas & Analytics ─────────────────────────────────────────────────────

export interface IMetricsPeriod {
  from: string;
  to: string;
}

export interface IPlatformMetrics {
  platform: MarketingPlatformId;
  period: IMetricsPeriod;
  impressions: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  clicks: number;
  followers?: number;
  followersGrowth?: number;
  followersGrowthPercent?: number;
  views?: number;
  watchTimeHours?: number;
  subscribers?: number;
  subscribersGrowth?: number;
  likesTotal?: number;
  commentsTotal?: number;
  sharesTotal?: number;
  savesTotal?: number;
  storiesImpressions?: number;
  reelsViews?: number;
  streams?: number;
  topPosts?: ITopPost[];
}

export interface ITopPost {
  id: string;
  title?: string;
  type: "video" | "image" | "carousel" | "reel" | "story" | "short";
  views?: number;
  likes: number;
  comments: number;
  shares?: number;
  engagementRate: number;
  publishedAt: string;
  thumbnailUrl?: string;
}

// ─── Contrato do provider ─────────────────────────────────────────────────────

export interface IMarketingProvider {
  getPlatformId(): MarketingPlatformId;
  getCategory(): MarketingCategory;
  isConnected(): boolean;
  getCampaigns?(): Promise<ICampaign[]>;
  getCampaignById?(id: string): Promise<ICampaign | null>;
  syncCampaigns?(): Promise<ICampaignSyncResult>;
  pauseCampaign?(id: string): Promise<void>;
  resumeCampaign?(id: string): Promise<void>;
  getLeads?(since?: string): Promise<ICapturedLead[]>;
  syncLeads?(): Promise<ILeadSyncResult>;
  getMetrics?(period: IMetricsPeriod): Promise<IPlatformMetrics>;
  refreshMetrics?(): Promise<void>;
  getTopContent?(limit?: number): Promise<ITopPost[]>;
}

// ─── Estado de conexão OAuth ──────────────────────────────────────────────────

export interface IMarketingOAuthConnection {
  platform: MarketingPlatformId;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  connectedAt?: string;
  expiresAt?: string;
  scopes?: string[];
  category: MarketingCategory;
}
