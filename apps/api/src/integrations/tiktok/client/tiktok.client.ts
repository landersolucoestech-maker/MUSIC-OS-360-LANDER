/**
 * integrations/tiktok/client/tiktok.client.ts
 * Low-level HTTP client for the TikTok Content Posting API and Ads API.
 */

const TIKTOK_API     = 'https://open.tiktokapis.com/v2';
const TIKTOK_ADS_API = 'https://business-api.tiktok.com/open_api/v1.3';

export class TikTokApiClient {
  constructor(private readonly accessToken: string) {}

  private get authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async getUserInfo(fields: string[] = ['open_id', 'nickname', 'avatar_url', 'follower_count']): Promise<unknown> {
    const url = new URL(`${TIKTOK_API}/user/info/`);
    url.searchParams.set('fields', fields.join(','));
    const res = await fetch(url.toString(), { headers: this.authHeader });
    if (!res.ok) throw new Error(`TikTok API error: ${res.status}`);
    return res.json();
  }

  async listVideos(openId: string, maxCount = 10, cursor = 0): Promise<unknown> {
    const res = await fetch(`${TIKTOK_API}/video/list/`, {
      method:  'POST',
      headers: { ...this.authHeader, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ open_id: openId, max_count: maxCount, cursor }),
    });
    if (!res.ok) throw new Error(`TikTok API error: ${res.status}`);
    return res.json();
  }

  async getAdCampaigns(advertiserId: string): Promise<unknown> {
    const res = await fetch(`${TIKTOK_ADS_API}/campaign/get/`, {
      method:  'POST',
      headers: { ...this.authHeader, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ advertiser_id: advertiserId, page_size: 100 }),
    });
    if (!res.ok) throw new Error(`TikTok Ads API error: ${res.status}`);
    return res.json();
  }
}
