/**
 * shared/integrations/contracts/marketing.contract.ts
 *
 * Contratos unificados para todas as integrações de Marketing Digital:
 * — Tráfego Pago (Meta Ads, Google Ads, TikTok Ads)
 * — Captação de Leads (LinkedIn, Facebook Lead Ads)
 * — Métricas & Analytics (YouTube, Instagram, TikTok Analytics)
 */

// ─── Tipos de plataforma ──────────────────────────────────────────────────────

export type MarketingPlatformId =
  // Tráfego Pago
  | "meta_ads"
  | "google_ads"
  | "tiktok_ads"
  // Captação de Leads
  | "linkedin"
  | "facebook_leads"
  // Métricas & Analytics
  | "youtube_analytics"
  | "instagram_insights"
  | "tiktok_analytics";

export type MarketingCategory = "paid_traffic" | "lead_capture" | "metrics";

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

// ─── Leads (Captação) ─────────────────────────────────────────────────────────

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

  // Tráfego Pago
  getCampaigns?(): Promise<ICampaign[]>;
  getCampaignById?(id: string): Promise<ICampaign | null>;
  syncCampaigns?(): Promise<ICampaignSyncResult>;
  pauseCampaign?(id: string): Promise<void>;
  resumeCampaign?(id: string): Promise<void>;

  // Captação de Leads
  getLeads?(since?: string): Promise<ICapturedLead[]>;
  syncLeads?(): Promise<ILeadSyncResult>;
  acknowledgeLeads?(ids: string[]): Promise<void>;

  // Métricas & Analytics
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

// ─── Configuração visual por plataforma (usada pelo dialog) ──────────────────

export interface IMarketingPlatformConfig {
  id: MarketingPlatformId;
  label: string;
  category: MarketingCategory;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  scopes: { key: string; label: string }[];
  webhookSupport?: boolean;
}
