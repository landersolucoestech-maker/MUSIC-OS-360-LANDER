/**
 * integrations/providers/mock/mock-marketing.provider.ts
 *
 * Provider mock para integrações de Marketing Digital — contas corporativas.
 *
 * ARQUITECTURA:
 *   · Plataformas de ARTISTAS (Instagram, TikTok, Spotify, YouTube, Deezer, etc.)
 *     funcionam AUTOMATICAMENTE via links do cadastro do artista. NÃO estão aqui.
 *
 *   · Este provider trata APENAS contas corporativas da empresa/label/publisher:
 *       Métricas corporativas: corp_instagram, corp_tiktok, corp_youtube, corp_spotify
 *       Tráfego pago:          meta_ads, google_ads, tiktok_ads, spotify_ads,
 *                              youtube_ads, deezer_ads, apple_music_ads, soundcloud_ads
 */

import type {
  IMarketingProvider,
  MarketingPlatformId,
  MarketingCategory,
  ICampaign,
  ICampaignSyncResult,
  IPlatformMetrics,
  IMetricsPeriod,
  ITopPost,
} from "@/shared/integrations/contracts/marketing.contract";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// ─── Dados mock de campanhas (Tráfego Pago) ───────────────────────────────────

const MOCK_CAMPAIGNS: Partial<Record<MarketingPlatformId, ICampaign[]>> = {
  meta_ads: [
    {
      id: "META-001", platform: "meta_ads",
      name: "Lançamento Álbum — Novembro 2025", status: "active",
      objective: "Reconhecimento de marca",
      budget: 3500, budgetType: "lifetime", spent: 2180,
      impressions: 412_000, reach: 187_400, clicks: 9_840, conversions: 312,
      cpm: 5.29, cpc: 0.22, ctr: 2.39, roas: 4.2,
      startDate: daysAgo(22), endDate: daysAgo(-8), updatedAt: daysAgo(1),
    },
    {
      id: "META-002", platform: "meta_ads",
      name: "Show São Paulo — Remarketing", status: "active",
      objective: "Tráfego para site",
      budget: 150, budgetType: "daily", spent: 1_050,
      impressions: 98_200, reach: 54_100, clicks: 4_720, conversions: 198,
      cpm: 10.69, cpc: 0.22, ctr: 4.81, roas: 7.8,
      startDate: daysAgo(7), updatedAt: daysAgo(0),
    },
    {
      id: "META-003", platform: "meta_ads",
      name: "Pré-save Single — Captação", status: "paused",
      objective: "Conversões",
      budget: 2000, budgetType: "lifetime", spent: 890,
      impressions: 175_000, reach: 82_300, clicks: 3_200, conversions: 87,
      cpm: 5.09, cpc: 0.28, ctr: 1.83, roas: 2.1,
      startDate: daysAgo(15), endDate: daysAgo(2), updatedAt: daysAgo(2),
    },
  ],
  google_ads: [
    {
      id: "GAD-001", platform: "google_ads",
      name: "Search — Contratação Shows Brasil", status: "active",
      objective: "Leads",
      budget: 200, budgetType: "daily", spent: 4_200,
      impressions: 89_000, reach: 89_000, clicks: 6_300, conversions: 142,
      cpm: 47.19, cpc: 0.67, ctr: 7.08, roas: 5.1,
      startDate: daysAgo(21), updatedAt: daysAgo(0),
    },
    {
      id: "GAD-002", platform: "google_ads",
      name: "YouTube — Videoclipe Promoção", status: "active",
      objective: "Visualizações",
      budget: 80, budgetType: "daily", spent: 1_120,
      impressions: 310_000, reach: 221_000, clicks: 14_800, conversions: 89,
      cpm: 3.61, cpc: 0.08, ctr: 4.77,
      startDate: daysAgo(14), updatedAt: daysAgo(0),
    },
    {
      id: "GAD-003", platform: "google_ads",
      name: "Display — Brand Awareness Q4", status: "ended",
      objective: "Reconhecimento",
      budget: 1500, budgetType: "lifetime", spent: 1_500,
      impressions: 890_000, reach: 540_000, clicks: 2_670, conversions: 34,
      cpm: 1.69, cpc: 0.56, ctr: 0.30,
      startDate: daysAgo(45), endDate: daysAgo(10), updatedAt: daysAgo(10),
    },
  ],
  tiktok_ads: [
    {
      id: "TTK-001", platform: "tiktok_ads",
      name: "TopView — Lançamento Álbum", status: "active",
      objective: "Visualizações de vídeo",
      budget: 5000, budgetType: "lifetime", spent: 3_100,
      impressions: 1_200_000, reach: 890_000, clicks: 32_400, conversions: 421,
      cpm: 2.58, cpc: 0.10, ctr: 2.70, roas: 3.4,
      startDate: daysAgo(10), endDate: daysAgo(-5), updatedAt: daysAgo(0),
    },
    {
      id: "TTK-002", platform: "tiktok_ads",
      name: "Spark Ads — Conteúdo Orgânico", status: "active",
      objective: "Engajamento",
      budget: 60, budgetType: "daily", spent: 420,
      impressions: 540_000, reach: 310_000, clicks: 18_200, conversions: 89,
      cpm: 0.78, cpc: 0.023, ctr: 3.37,
      startDate: daysAgo(7), updatedAt: daysAgo(0),
    },
  ],
  spotify_ads: [
    {
      id: "SP-001", platform: "spotify_ads",
      name: "Audio Ad — Lançamento Single", status: "active",
      objective: "Streaming",
      budget: 1200, budgetType: "lifetime", spent: 780,
      impressions: 340_000, reach: 210_000, clicks: 8_900, conversions: 0,
      cpm: 2.29, cpc: 0.09, ctr: 2.62,
      startDate: daysAgo(12), endDate: daysAgo(-3), updatedAt: daysAgo(1),
    },
  ],
  youtube_ads: [
    {
      id: "YTA-001", platform: "youtube_ads",
      name: "TrueView — Clipe Oficial", status: "active",
      objective: "Visualizações",
      budget: 100, budgetType: "daily", spent: 700,
      impressions: 520_000, reach: 380_000, clicks: 21_000, conversions: 0,
      cpm: 1.35, cpc: 0.033, ctr: 4.04,
      startDate: daysAgo(7), updatedAt: daysAgo(0),
    },
  ],
  deezer_ads: [
    {
      id: "DZ-001", platform: "deezer_ads",
      name: "Banner — Playlist Destaque", status: "active",
      objective: "Streaming",
      budget: 800, budgetType: "lifetime", spent: 320,
      impressions: 180_000, reach: 120_000, clicks: 4_200, conversions: 0,
      cpm: 1.78, cpc: 0.076, ctr: 2.33,
      startDate: daysAgo(8), endDate: daysAgo(-7), updatedAt: daysAgo(1),
    },
  ],
  apple_music_ads: [
    {
      id: "AM-001", platform: "apple_music_ads",
      name: "App Store Search — Álbum", status: "active",
      objective: "Streaming",
      budget: 600, budgetType: "lifetime", spent: 210,
      impressions: 95_000, reach: 70_000, clicks: 3_100, conversions: 0,
      cpm: 2.21, cpc: 0.068, ctr: 3.26,
      startDate: daysAgo(5), endDate: daysAgo(-10), updatedAt: daysAgo(0),
    },
  ],
  soundcloud_ads: [
    {
      id: "SC-001", platform: "soundcloud_ads",
      name: "Audio Ad — Fãs Indie", status: "active",
      objective: "Plays",
      budget: 400, budgetType: "lifetime", spent: 180,
      impressions: 120_000, reach: 80_000, clicks: 2_800, conversions: 0,
      cpm: 1.50, cpc: 0.064, ctr: 2.33,
      startDate: daysAgo(6), endDate: daysAgo(-9), updatedAt: daysAgo(0),
    },
  ],
};

// ─── Dados mock de métricas (Métricas Corporativas) ───────────────────────────

const MOCK_METRICS: Partial<Record<MarketingPlatformId, IPlatformMetrics>> = {
  corp_instagram: {
    platform: "corp_instagram",
    period: { from: daysAgo(30), to: daysAgo(0) },
    impressions: 1_890_000, reach: 678_000,
    engagement: 94_200, engagementRate: 5.0, clicks: 42_100,
    followers: 128_400, followersGrowth: 3_420, followersGrowthPercent: 2.7,
    likesTotal: 72_000, commentsTotal: 8_400, sharesTotal: 6_800, savesTotal: 7_000,
    storiesImpressions: 420_000, reelsViews: 890_000,
    topPosts: [
      { id: "IG-001", title: "Teaser Clipe — Conta Oficial", type: "reel", views: 340_000, likes: 28_100, comments: 2_400, shares: 4_200, engagementRate: 10.2, publishedAt: daysAgo(8) },
      { id: "IG-002", title: "BTS Estúdio", type: "carousel", views: 89_000, likes: 12_400, comments: 1_100, engagementRate: 15.2, publishedAt: daysAgo(14) },
      { id: "IG-003", title: "Capa Álbum — Arte Final", type: "image", views: 67_000, likes: 18_900, comments: 1_800, engagementRate: 30.9, publishedAt: daysAgo(18) },
    ],
  },
  corp_tiktok: {
    platform: "corp_tiktok",
    period: { from: daysAgo(30), to: daysAgo(0) },
    impressions: 4_200_000, reach: 2_890_000,
    engagement: 312_000, engagementRate: 7.4, clicks: 89_000,
    followers: 89_200, followersGrowth: 12_400, followersGrowthPercent: 16.1,
    views: 3_100_000, likesTotal: 248_000, commentsTotal: 31_200, sharesTotal: 32_800,
    topPosts: [
      { id: "TT-001", title: "Challenge — Conta Oficial", type: "video", views: 1_200_000, likes: 89_000, comments: 12_400, shares: 18_200, engagementRate: 9.9, publishedAt: daysAgo(5) },
      { id: "TT-002", title: "Bastidores Tour", type: "video", views: 480_000, likes: 42_000, comments: 4_800, shares: 6_700, engagementRate: 11.1, publishedAt: daysAgo(10) },
    ],
  },
  corp_youtube: {
    platform: "corp_youtube",
    period: { from: daysAgo(30), to: daysAgo(0) },
    impressions: 2_840_000, reach: 1_120_000,
    engagement: 187_400, engagementRate: 6.6, clicks: 98_200,
    views: 1_340_000, watchTimeHours: 78_400,
    subscribers: 42_800, subscribersGrowth: 1_240,
    likesTotal: 67_200, commentsTotal: 8_900, sharesTotal: 12_400,
    topPosts: [
      { id: "YT-001", title: "Canal Oficial — Clipe Novo Single", type: "video", views: 420_000, likes: 24_800, comments: 3_200, shares: 5_100, engagementRate: 7.9, publishedAt: daysAgo(12) },
      { id: "YT-002", title: "Making Of — Álbum", type: "video", views: 180_000, likes: 9_400, comments: 1_200, shares: 2_300, engagementRate: 7.2, publishedAt: daysAgo(20) },
    ],
  },
  corp_spotify: {
    platform: "corp_spotify",
    period: { from: daysAgo(30), to: daysAgo(0) },
    impressions: 980_000, reach: 420_000,
    engagement: 48_000, engagementRate: 4.9, clicks: 22_000,
    streams: 1_200_000, followers: 31_400, followersGrowth: 890,
    topPosts: [
      { id: "SP-001", title: "Monthly Listeners — Top Playlist", type: "image", views: 0, likes: 12_400, comments: 0, engagementRate: 3.2, publishedAt: daysAgo(7) },
    ],
  },
};

// ─── Classe base ──────────────────────────────────────────────────────────────

abstract class BaseMockMarketingProvider implements IMarketingProvider {
  protected _connected = false;
  abstract getPlatformId(): MarketingPlatformId;
  abstract getCategory(): MarketingCategory;
  isConnected(): boolean { return this._connected; }
}

// ─── Providers de Métricas Corporativas ──────────────────────────────────────

class MockCorpInstagramProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "corp_instagram";
  getCategory   = (): MarketingCategory   => "corporate_metrics";
  async getMetrics(_p?: IMetricsPeriod): Promise<IPlatformMetrics> { return MOCK_METRICS.corp_instagram!; }
  async getTopContent(limit = 3): Promise<ITopPost[]> { return (MOCK_METRICS.corp_instagram!.topPosts ?? []).slice(0, limit); }
  async refreshMetrics(): Promise<void> { await new Promise(r => setTimeout(r, 1200)); }
}

class MockCorpTikTokProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "corp_tiktok";
  getCategory   = (): MarketingCategory   => "corporate_metrics";
  async getMetrics(_p?: IMetricsPeriod): Promise<IPlatformMetrics> { return MOCK_METRICS.corp_tiktok!; }
  async getTopContent(limit = 3): Promise<ITopPost[]> { return (MOCK_METRICS.corp_tiktok!.topPosts ?? []).slice(0, limit); }
  async refreshMetrics(): Promise<void> { await new Promise(r => setTimeout(r, 1000)); }
}

class MockCorpYouTubeProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "corp_youtube";
  getCategory   = (): MarketingCategory   => "corporate_metrics";
  async getMetrics(_p?: IMetricsPeriod): Promise<IPlatformMetrics> { return MOCK_METRICS.corp_youtube!; }
  async getTopContent(limit = 3): Promise<ITopPost[]> { return (MOCK_METRICS.corp_youtube!.topPosts ?? []).slice(0, limit); }
  async refreshMetrics(): Promise<void> { await new Promise(r => setTimeout(r, 1600)); }
}

class MockCorpSpotifyProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "corp_spotify";
  getCategory   = (): MarketingCategory   => "corporate_metrics";
  async getMetrics(_p?: IMetricsPeriod): Promise<IPlatformMetrics> { return MOCK_METRICS.corp_spotify!; }
  async getTopContent(limit = 3): Promise<ITopPost[]> { return (MOCK_METRICS.corp_spotify!.topPosts ?? []).slice(0, limit); }
  async refreshMetrics(): Promise<void> { await new Promise(r => setTimeout(r, 1100)); }
}

// ─── Providers de Tráfego Pago ────────────────────────────────────────────────

class MockPaidAdsProvider extends BaseMockMarketingProvider {
  constructor(
    private _id: MarketingPlatformId,
  ) { super(); }

  getPlatformId = (): MarketingPlatformId => this._id;
  getCategory   = (): MarketingCategory   => "paid_ads";

  async getCampaigns(): Promise<ICampaign[]> {
    return MOCK_CAMPAIGNS[this._id] ?? [];
  }

  async getCampaignById(id: string): Promise<ICampaign | null> {
    return (MOCK_CAMPAIGNS[this._id] ?? []).find(c => c.id === id) ?? null;
  }

  async syncCampaigns(): Promise<ICampaignSyncResult> {
    await new Promise(r => setTimeout(r, 1200));
    return {
      synced:     (MOCK_CAMPAIGNS[this._id] ?? []).length,
      updated:    1,
      errors:     0,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async pauseCampaign(_id: string): Promise<void>  { await new Promise(r => setTimeout(r, 600)); }
  async resumeCampaign(_id: string): Promise<void> { await new Promise(r => setTimeout(r, 600)); }
}

// ─── Registry & factory ───────────────────────────────────────────────────────

export const mockMarketingProviders: Record<MarketingPlatformId, IMarketingProvider> = {
  // Métricas corporativas
  corp_instagram:  new MockCorpInstagramProvider(),
  corp_tiktok:     new MockCorpTikTokProvider(),
  corp_youtube:    new MockCorpYouTubeProvider(),
  corp_spotify:    new MockCorpSpotifyProvider(),
  // Tráfego pago
  meta_ads:        new MockPaidAdsProvider("meta_ads"),
  google_ads:      new MockPaidAdsProvider("google_ads"),
  tiktok_ads:      new MockPaidAdsProvider("tiktok_ads"),
  spotify_ads:     new MockPaidAdsProvider("spotify_ads"),
  youtube_ads:     new MockPaidAdsProvider("youtube_ads"),
  deezer_ads:      new MockPaidAdsProvider("deezer_ads"),
  apple_music_ads: new MockPaidAdsProvider("apple_music_ads"),
  soundcloud_ads:  new MockPaidAdsProvider("soundcloud_ads"),
};

export function getMockMarketingProvider(
  platformId: MarketingPlatformId
): IMarketingProvider {
  return mockMarketingProviders[platformId];
}
