/**
 * integrations/meta/client/meta.client.ts
 * Low-level HTTP client for the Meta Graph API (Facebook + Instagram).
 */

const GRAPH_API = 'https://graph.facebook.com/v19.0';

export class MetaGraphClient {
  constructor(private readonly accessToken: string) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', this.accessToken);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Meta Graph API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async getPage(pageId: string): Promise<unknown> {
    return this.get(`/${pageId}`, { fields: 'id,name,category,followers_count,fan_count,instagram_business_account' });
  }

  async getPageInsights(pageId: string, metrics: string[], period: string): Promise<unknown> {
    return this.get(`/${pageId}/insights`, { metric: metrics.join(','), period });
  }

  async getAdCampaigns(adAccountId: string, limit = 25): Promise<unknown> {
    return this.get(`/act_${adAccountId}/campaigns`, {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget',
      limit:  String(limit),
    });
  }

  async getCampaignInsights(campaignId: string): Promise<unknown> {
    return this.get(`/${campaignId}/insights`, {
      fields: 'impressions,clicks,spend,reach,cpm,ctr,actions',
    });
  }
}
