/**
 * integrations/providers/mock/mock-streaming.provider.ts
 *
 * Implementação mock de IStreamingProvider e IAdsProvider.
 * Em modo standalone: devolve dados gerados proceduralmente.
 *
 * MIGRAÇÃO FUTURA: uma classe concreta por plataforma (SpotifyStreamingProvider, etc.)
 */

import type {
  IStreamingProvider,
  IAdsProvider,
  StreamingPlatformId,
  AdsPlatformId,
  ArtistMetrics,
  TrackMetrics,
  VideoMetrics,
  SocialMetrics,
  AdCampaign,
  MetricsPeriod,
  MetricsDateRange,
} from "@/modules/integrations/dto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fakeTimeSeries(days: number, base: number): Array<{ date: string; value: number }> {
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    series.push({
      date:  d.toISOString().slice(0, 10),
      value: Math.max(0, base + randomInt(-base * 0.2, base * 0.3)),
    });
  }
  return series;
}

// ─── Mock Streaming Provider ──────────────────────────────────────────────────

export class MockStreamingProvider implements IStreamingProvider {
  constructor(readonly platform: StreamingPlatformId) {}

  async getArtistMetrics(
    artistId: string,
    _period: MetricsPeriod | MetricsDateRange
  ): Promise<ArtistMetrics> {
    const base = randomInt(5_000, 500_000);
    return {
      artist_id:         artistId,
      platform:          this.platform,
      period:            "30d",
      monthly_listeners: base,
      followers:         randomInt(1_000, 100_000),
      total_streams:     base * randomInt(2, 8),
      top_tracks:        [],
      listener_trend:    fakeTimeSeries(30, Math.floor(base / 30)),
    };
  }

  async getTrackMetrics(
    isrc: string,
    _period: MetricsPeriod | MetricsDateRange
  ): Promise<TrackMetrics> {
    return {
      isrc,
      platform:         this.platform,
      streams:          randomInt(1_000, 200_000),
      saves:            randomInt(100, 10_000),
      playlist_adds:    randomInt(50, 5_000),
      skip_rate:        parseFloat((Math.random() * 0.4).toFixed(2)),
      completion_rate:  parseFloat((0.6 + Math.random() * 0.35).toFixed(2)),
      daily_streams:    fakeTimeSeries(30, randomInt(50, 5_000)),
    };
  }

  async getVideoMetrics(
    videoId: string,
    _period: MetricsPeriod | MetricsDateRange
  ): Promise<VideoMetrics> {
    return {
      video_id:                  videoId,
      platform:                  this.platform as "youtube" | "tiktok",
      views:                     randomInt(10_000, 5_000_000),
      likes:                     randomInt(500, 100_000),
      comments:                  randomInt(100, 20_000),
      shares:                    randomInt(200, 50_000),
      watch_time_hours:          randomInt(500, 100_000),
      avg_view_duration_seconds: randomInt(30, 300),
      estimated_revenue_cents:   randomInt(100, 50_000),
    };
  }

  async getSocialMetrics(
    accountId: string,
    _period: MetricsPeriod
  ): Promise<SocialMetrics> {
    return {
      account_id:      accountId,
      platform:        this.platform as "instagram" | "tiktok",
      period:          "30d",
      reach:           randomInt(10_000, 1_000_000),
      impressions:     randomInt(20_000, 2_000_000),
      profile_visits:  randomInt(5_000, 200_000),
      followers:       randomInt(5_000, 500_000),
      followers_gained: randomInt(100, 10_000),
      engagement_rate: parseFloat((Math.random() * 0.08).toFixed(4)),
      top_posts:       [],
    };
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}

// ─── Mock Ads Provider ────────────────────────────────────────────────────────

export class MockAdsProvider implements IAdsProvider {
  constructor(readonly platform: AdsPlatformId) {}

  async listCampaigns(
    params?: { status?: AdCampaign["status"] }
  ): Promise<AdCampaign[]> {
    const campaigns: AdCampaign[] = [
      {
        campaign_id:        `mock_cmp_001_${this.platform}`,
        platform:           this.platform,
        name:               "Promoção Lançamento — Carro Novo",
        status:             "active",
        budget_daily_cents: 5000_00,
        spend_total_cents:  12_000_00,
        impressions:        420_000,
        clicks:             8_400,
        ctr:                0.02,
        cpc_cents:          142,
        conversions:        210,
        started_at:         new Date(Date.now() - 20 * 86400_000).toISOString(),
        ended_at:           null,
      },
      {
        campaign_id:        `mock_cmp_002_${this.platform}`,
        platform:           this.platform,
        name:               "Awareness — Turnê 2025",
        status:             "paused",
        budget_daily_cents: 3000_00,
        spend_total_cents:  6_000_00,
        impressions:        200_000,
        clicks:             3_200,
        ctr:                0.016,
        cpc_cents:          187,
        conversions:        80,
        started_at:         new Date(Date.now() - 45 * 86400_000).toISOString(),
        ended_at:           null,
      },
    ];
    if (params?.status) return campaigns.filter((c) => c.status === params.status);
    return campaigns;
  }

  async getCampaign(campaignId: string): Promise<AdCampaign> {
    const all = await this.listCampaigns();
    const found = all.find((c) => c.campaign_id === campaignId);
    if (!found) throw new Error(`[MockAdsProvider] campanha não encontrada: ${campaignId}`);
    return found;
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}

// ─── Factory helpers ──────────────────────────────────────────────────────────

export function makeMockStreamingProvider(
  platform: StreamingPlatformId
): MockStreamingProvider {
  return new MockStreamingProvider(platform);
}

export function makeMockAdsProvider(
  platform: AdsPlatformId
): MockAdsProvider {
  return new MockAdsProvider(platform);
}

