/**
 * integrations/providers/mock/mock-marketing.provider.ts
 *
 * Provider mock completo para todas as plataformas de Marketing Digital.
 * Implementa IMarketingProvider com dados ricos e realistas para:
 * — Tráfego Pago: Meta Ads, Google Ads, TikTok Ads
 * — Captação de Leads: LinkedIn, Facebook Lead Ads
 * — Métricas: YouTube Analytics, Instagram Insights, TikTok Analytics
 */

import type {
  IMarketingProvider,
  MarketingPlatformId,
  MarketingCategory,
  ICampaign,
  ICampaignSyncResult,
  ICapturedLead,
  ILeadSyncResult,
  IPlatformMetrics,
  IMetricsPeriod,
  ITopPost,
} from "@/shared/integrations/contracts/marketing.contract";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ─── Dados mock de campanhas ──────────────────────────────────────────────────

const MOCK_CAMPAIGNS: Record<string, ICampaign[]> = {
  meta_ads: [
    {
      id: "META-001",
      platform: "meta_ads",
      name: "Lançamento Álbum — Novembro 2025",
      status: "active",
      objective: "Reconhecimento de marca",
      budget: 3500,
      budgetType: "lifetime",
      spent: 2180,
      impressions: 412_000,
      reach: 187_400,
      clicks: 9_840,
      conversions: 312,
      cpm: 5.29,
      cpc: 0.22,
      ctr: 2.39,
      roas: 4.2,
      startDate: daysAgo(22),
      endDate: daysAgo(-8),
      updatedAt: daysAgo(1),
    },
    {
      id: "META-002",
      platform: "meta_ads",
      name: "Show São Paulo — Remarketing",
      status: "active",
      objective: "Tráfego para site",
      budget: 150,
      budgetType: "daily",
      spent: 1_050,
      impressions: 98_200,
      reach: 54_100,
      clicks: 4_720,
      conversions: 198,
      cpm: 10.69,
      cpc: 0.22,
      ctr: 4.81,
      roas: 7.8,
      startDate: daysAgo(7),
      updatedAt: daysAgo(0),
    },
    {
      id: "META-003",
      platform: "meta_ads",
      name: "Pré-save Single — Captação",
      status: "paused",
      objective: "Conversões",
      budget: 2000,
      budgetType: "lifetime",
      spent: 890,
      impressions: 175_000,
      reach: 82_300,
      clicks: 3_200,
      conversions: 87,
      cpm: 5.09,
      cpc: 0.28,
      ctr: 1.83,
      roas: 2.1,
      startDate: daysAgo(15),
      endDate: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  ],
  google_ads: [
    {
      id: "GAD-001",
      platform: "google_ads",
      name: "Search — Contratação Shows Brasil",
      status: "active",
      objective: "Leads",
      budget: 200,
      budgetType: "daily",
      spent: 4_200,
      impressions: 89_000,
      reach: 89_000,
      clicks: 6_300,
      conversions: 142,
      cpm: 47.19,
      cpc: 0.67,
      ctr: 7.08,
      roas: 5.1,
      startDate: daysAgo(21),
      updatedAt: daysAgo(0),
    },
    {
      id: "GAD-002",
      platform: "google_ads",
      name: "YouTube — Videoclipe Promoção",
      status: "active",
      objective: "Visualizações",
      budget: 80,
      budgetType: "daily",
      spent: 1_120,
      impressions: 310_000,
      reach: 221_000,
      clicks: 14_800,
      conversions: 89,
      cpm: 3.61,
      cpc: 0.08,
      ctr: 4.77,
      startDate: daysAgo(14),
      updatedAt: daysAgo(0),
    },
    {
      id: "GAD-003",
      platform: "google_ads",
      name: "Display — Brand Awareness Q4",
      status: "ended",
      objective: "Reconhecimento",
      budget: 1500,
      budgetType: "lifetime",
      spent: 1_500,
      impressions: 890_000,
      reach: 540_000,
      clicks: 2_670,
      conversions: 34,
      cpm: 1.69,
      cpc: 0.56,
      ctr: 0.30,
      startDate: daysAgo(45),
      endDate: daysAgo(10),
      updatedAt: daysAgo(10),
    },
  ],
  tiktok_ads: [
    {
      id: "TTK-001",
      platform: "tiktok_ads",
      name: "TopView — Lançamento Álbum",
      status: "active",
      objective: "Visualizações de vídeo",
      budget: 5000,
      budgetType: "lifetime",
      spent: 3_100,
      impressions: 1_200_000,
      reach: 890_000,
      clicks: 32_400,
      conversions: 421,
      cpm: 2.58,
      cpc: 0.10,
      ctr: 2.70,
      roas: 3.4,
      startDate: daysAgo(10),
      endDate: daysAgo(-5),
      updatedAt: daysAgo(0),
    },
    {
      id: "TTK-002",
      platform: "tiktok_ads",
      name: "Spark Ads — Conteúdo Orgânico",
      status: "active",
      objective: "Engajamento",
      budget: 60,
      budgetType: "daily",
      spent: 420,
      impressions: 540_000,
      reach: 310_000,
      clicks: 18_200,
      conversions: 89,
      cpm: 0.78,
      cpc: 0.023,
      ctr: 3.37,
      startDate: daysAgo(7),
      updatedAt: daysAgo(0),
    },
  ],
};

// ─── Dados mock de leads ──────────────────────────────────────────────────────

const MOCK_LEADS: Record<string, ICapturedLead[]> = {
  linkedin: [
    { id: "LI-001", platform: "linkedin", name: "Rafael Torres", email: "rafael.torres@selos.com.br", phone: "+5511987650001", company: "Selos Independentes BR", status: "qualified", capturedAt: daysAgo(2), campaignId: "LI-CAM-01", campaignName: "B2B Labels — Q4", formName: "Formulário de Parceria", source: "linkedin_lead_gen" },
    { id: "LI-002", platform: "linkedin", name: "Camila Figueiredo", email: "camila@musicpublishing.com", company: "Music Publishing LTDA", status: "new", capturedAt: daysAgo(3), campaignId: "LI-CAM-01", campaignName: "B2B Labels — Q4", formName: "Formulário de Parceria", source: "linkedin_lead_gen" },
    { id: "LI-003", platform: "linkedin", name: "Bruno Castilho", email: "bruno@eventospro.com.br", phone: "+5521987650003", company: "Eventos Pro SP", status: "contacted", capturedAt: daysAgo(5), campaignId: "LI-CAM-02", campaignName: "Produtores de Shows", formName: "Captação de Produtores", source: "linkedin_lead_gen" },
    { id: "LI-004", platform: "linkedin", name: "Fernanda Lopes", email: "fernanda@gravadoramax.com", company: "Gravadora Max", status: "converted", capturedAt: daysAgo(8), campaignId: "LI-CAM-02", campaignName: "Produtores de Shows", formName: "Captação de Produtores", source: "linkedin_lead_gen" },
  ],
  facebook_leads: [
    { id: "FB-001", platform: "facebook_leads", name: "João da Silva", email: "joao.silva@email.com", phone: "+5511999990001", status: "new", capturedAt: daysAgo(1), campaignId: "META-002", campaignName: "Show São Paulo — Remarketing", formName: "Ingresso Show SP", source: "facebook_lead_ad", utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "show_sp_nov" },
    { id: "FB-002", platform: "facebook_leads", name: "Maria Oliveira", email: "maria.oliveira@gmail.com", phone: "+5521999990002", status: "new", capturedAt: daysAgo(1), campaignId: "META-001", campaignName: "Lançamento Álbum — Novembro 2025", formName: "Pré-save Álbum", source: "instagram_lead_ad", utmSource: "instagram", utmMedium: "paid_social", utmCampaign: "album_launch" },
    { id: "FB-003", platform: "facebook_leads", name: "Carlos Mendes", email: "carlos.mendes@hotmail.com", phone: "+5531999990003", status: "contacted", capturedAt: daysAgo(3), campaignId: "META-001", campaignName: "Lançamento Álbum — Novembro 2025", formName: "Pré-save Álbum", source: "facebook_lead_ad" },
    { id: "FB-004", platform: "facebook_leads", name: "Ana Paula Costa", email: "anapaula@email.com", phone: "+5541999990004", status: "qualified", capturedAt: daysAgo(4), campaignId: "META-003", campaignName: "Pré-save Single — Captação", formName: "Formulário Pré-save", source: "instagram_lead_ad" },
    { id: "FB-005", platform: "facebook_leads", name: "Pedro Alves", email: "pedro.alves@bol.com.br", status: "converted", capturedAt: daysAgo(6), campaignId: "META-002", campaignName: "Show São Paulo — Remarketing", formName: "Ingresso Show SP", source: "facebook_lead_ad" },
  ],
};

// ─── Dados mock de métricas ───────────────────────────────────────────────────

const MOCK_METRICS: Record<string, IPlatformMetrics> = {
  youtube_analytics: {
    platform: "youtube_analytics",
    period: { from: daysAgo(30), to: daysAgo(0) },
    impressions: 2_840_000,
    reach: 1_120_000,
    engagement: 187_400,
    engagementRate: 6.6,
    clicks: 98_200,
    views: 1_340_000,
    watchTimeHours: 78_400,
    subscribers: 42_800,
    subscribersGrowth: 1_240,
    likesTotal: 67_200,
    commentsTotal: 8_900,
    sharesTotal: 12_400,
    topPosts: [
      { id: "YT-001", title: "Clipe Oficial — Novo Single", type: "video", views: 420_000, likes: 24_800, comments: 3_200, shares: 5_100, engagementRate: 7.9, publishedAt: daysAgo(12) },
      { id: "YT-002", title: "Making Of — Gravação do Álbum", type: "video", views: 180_000, likes: 9_400, comments: 1_200, shares: 2_300, engagementRate: 7.2, publishedAt: daysAgo(20) },
      { id: "YT-003", title: "Acoustic Session — Studio Live", type: "video", views: 95_000, likes: 6_200, comments: 890, shares: 1_100, engagementRate: 8.6, publishedAt: daysAgo(25) },
    ],
  },
  instagram_insights: {
    platform: "instagram_insights",
    period: { from: daysAgo(30), to: daysAgo(0) },
    impressions: 1_890_000,
    reach: 678_000,
    engagement: 94_200,
    engagementRate: 5.0,
    clicks: 42_100,
    followers: 128_400,
    followersGrowth: 3_420,
    followersGrowthPercent: 2.7,
    likesTotal: 72_000,
    commentsTotal: 8_400,
    sharesTotal: 6_800,
    savesTotal: 7_000,
    storiesImpressions: 420_000,
    reelsViews: 890_000,
    topPosts: [
      { id: "IG-001", title: "Teaser Clipe", type: "reel", views: 340_000, likes: 28_100, comments: 2_400, shares: 4_200, engagementRate: 10.2, publishedAt: daysAgo(8) },
      { id: "IG-002", title: "BTS Estúdio", type: "carousel", views: 89_000, likes: 12_400, comments: 1_100, engagementRate: 15.2, publishedAt: daysAgo(14) },
      { id: "IG-003", title: "Capa Álbum — Arte Final", type: "image", views: 67_000, likes: 18_900, comments: 1_800, engagementRate: 30.9, publishedAt: daysAgo(18) },
    ],
  },
  tiktok_analytics: {
    platform: "tiktok_analytics",
    period: { from: daysAgo(30), to: daysAgo(0) },
    impressions: 4_200_000,
    reach: 2_890_000,
    engagement: 312_000,
    engagementRate: 7.4,
    clicks: 89_000,
    followers: 89_200,
    followersGrowth: 12_400,
    followersGrowthPercent: 16.1,
    views: 3_100_000,
    likesTotal: 248_000,
    commentsTotal: 31_200,
    sharesTotal: 32_800,
    topPosts: [
      { id: "TT-001", title: "Challenge — Dança do Single", type: "video", views: 1_200_000, likes: 89_000, comments: 12_400, shares: 18_200, engagementRate: 9.9, publishedAt: daysAgo(5) },
      { id: "TT-002", title: "Duet com fã", type: "video", views: 480_000, likes: 42_000, comments: 4_800, shares: 6_700, engagementRate: 11.1, publishedAt: daysAgo(10) },
      { id: "TT-003", title: "Bastidores Tour", type: "video", views: 290_000, likes: 24_500, comments: 2_900, shares: 3_400, engagementRate: 10.6, publishedAt: daysAgo(15) },
    ],
  },
};

// ─── Classe mock base ─────────────────────────────────────────────────────────

abstract class BaseMockMarketingProvider implements IMarketingProvider {
  protected _connected = false;

  abstract getPlatformId(): MarketingPlatformId;
  abstract getCategory(): MarketingCategory;

  isConnected(): boolean {
    return this._connected;
  }
}

// ─── Providers de Tráfego Pago ────────────────────────────────────────────────

class MockMetaAdsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "meta_ads";
  getCategory = (): MarketingCategory => "paid_traffic";

  async getCampaigns(): Promise<ICampaign[]> {
    return MOCK_CAMPAIGNS.meta_ads;
  }

  async getCampaignById(id: string): Promise<ICampaign | null> {
    return MOCK_CAMPAIGNS.meta_ads.find((c) => c.id === id) ?? null;
  }

  async syncCampaigns(): Promise<ICampaignSyncResult> {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      synced: MOCK_CAMPAIGNS.meta_ads.length,
      updated: 2,
      errors: 0,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async pauseCampaign(_id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
  }

  async resumeCampaign(_id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
  }
}

class MockGoogleAdsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "google_ads";
  getCategory = (): MarketingCategory => "paid_traffic";

  async getCampaigns(): Promise<ICampaign[]> {
    return MOCK_CAMPAIGNS.google_ads;
  }

  async getCampaignById(id: string): Promise<ICampaign | null> {
    return MOCK_CAMPAIGNS.google_ads.find((c) => c.id === id) ?? null;
  }

  async syncCampaigns(): Promise<ICampaignSyncResult> {
    await new Promise((r) => setTimeout(r, 1400));
    return {
      synced: MOCK_CAMPAIGNS.google_ads.length,
      updated: 1,
      errors: 0,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async pauseCampaign(_id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
  }

  async resumeCampaign(_id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
  }
}

class MockTikTokAdsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "tiktok_ads";
  getCategory = (): MarketingCategory => "paid_traffic";

  async getCampaigns(): Promise<ICampaign[]> {
    return MOCK_CAMPAIGNS.tiktok_ads;
  }

  async getCampaignById(id: string): Promise<ICampaign | null> {
    return MOCK_CAMPAIGNS.tiktok_ads.find((c) => c.id === id) ?? null;
  }

  async syncCampaigns(): Promise<ICampaignSyncResult> {
    await new Promise((r) => setTimeout(r, 1000));
    return {
      synced: MOCK_CAMPAIGNS.tiktok_ads.length,
      updated: 2,
      errors: 0,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async pauseCampaign(_id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
  }

  async resumeCampaign(_id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
  }
}

// ─── Providers de Captação de Leads ──────────────────────────────────────────

class MockLinkedInLeadsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "linkedin";
  getCategory = (): MarketingCategory => "lead_capture";

  async getLeads(_since?: string): Promise<ICapturedLead[]> {
    return MOCK_LEADS.linkedin;
  }

  async syncLeads(): Promise<ILeadSyncResult> {
    await new Promise((r) => setTimeout(r, 1100));
    return {
      synced: MOCK_LEADS.linkedin.length,
      duplicates: 0,
      errors: 0,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async acknowledgeLeads(_ids: string[]): Promise<void> {
    await new Promise((r) => setTimeout(r, 400));
  }
}

class MockFacebookLeadsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "facebook_leads";
  getCategory = (): MarketingCategory => "lead_capture";

  async getLeads(_since?: string): Promise<ICapturedLead[]> {
    return MOCK_LEADS.facebook_leads;
  }

  async syncLeads(): Promise<ILeadSyncResult> {
    await new Promise((r) => setTimeout(r, 900));
    return {
      synced: MOCK_LEADS.facebook_leads.length,
      duplicates: 1,
      errors: 0,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async acknowledgeLeads(_ids: string[]): Promise<void> {
    await new Promise((r) => setTimeout(r, 400));
  }
}

// ─── Providers de Métricas ────────────────────────────────────────────────────

class MockYouTubeAnalyticsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "youtube_analytics";
  getCategory = (): MarketingCategory => "metrics";

  async getMetrics(_period?: IMetricsPeriod): Promise<IPlatformMetrics> {
    return MOCK_METRICS.youtube_analytics;
  }

  async getTopContent(limit = 3): Promise<ITopPost[]> {
    return (MOCK_METRICS.youtube_analytics.topPosts ?? []).slice(0, limit);
  }

  async refreshMetrics(): Promise<void> {
    await new Promise((r) => setTimeout(r, 1600));
  }
}

class MockInstagramInsightsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "instagram_insights";
  getCategory = (): MarketingCategory => "metrics";

  async getMetrics(_period?: IMetricsPeriod): Promise<IPlatformMetrics> {
    return MOCK_METRICS.instagram_insights;
  }

  async getTopContent(limit = 3): Promise<ITopPost[]> {
    return (MOCK_METRICS.instagram_insights.topPosts ?? []).slice(0, limit);
  }

  async refreshMetrics(): Promise<void> {
    await new Promise((r) => setTimeout(r, 1200));
  }
}

class MockTikTokAnalyticsProvider extends BaseMockMarketingProvider {
  getPlatformId = (): MarketingPlatformId => "tiktok_analytics";
  getCategory = (): MarketingCategory => "metrics";

  async getMetrics(_period?: IMetricsPeriod): Promise<IPlatformMetrics> {
    return MOCK_METRICS.tiktok_analytics;
  }

  async getTopContent(limit = 3): Promise<ITopPost[]> {
    return (MOCK_METRICS.tiktok_analytics.topPosts ?? []).slice(0, limit);
  }

  async refreshMetrics(): Promise<void> {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// ─── Registry & factory ───────────────────────────────────────────────────────

export const mockMarketingProviders: Record<MarketingPlatformId, IMarketingProvider> = {
  meta_ads:            new MockMetaAdsProvider(),
  google_ads:          new MockGoogleAdsProvider(),
  tiktok_ads:          new MockTikTokAdsProvider(),
  linkedin:            new MockLinkedInLeadsProvider(),
  facebook_leads:      new MockFacebookLeadsProvider(),
  youtube_analytics:   new MockYouTubeAnalyticsProvider(),
  instagram_insights:  new MockInstagramInsightsProvider(),
  tiktok_analytics:    new MockTikTokAnalyticsProvider(),
};

export function getMockMarketingProvider(
  platformId: MarketingPlatformId
): IMarketingProvider {
  return mockMarketingProviders[platformId];
}

// Supress unused-var warnings for random helpers used in realistic data scenarios
void randomInt;
void randomFloat;
