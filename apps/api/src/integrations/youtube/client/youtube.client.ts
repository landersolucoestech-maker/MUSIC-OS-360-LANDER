/**
 * integrations/youtube/client/youtube.client.ts
 * Low-level HTTP client for the YouTube Data API v3 and Analytics API.
 */

const YT_DATA_API      = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2';

export class YouTubeApiClient {
  constructor(private readonly accessToken: string) {}

  private get authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async get<T>(baseUrl: string, path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: this.authHeader });
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async getChannel(channelId: string): Promise<unknown> {
    return this.get(YT_DATA_API, '/channels', {
      part: 'snippet,statistics',
      id:   channelId,
    });
  }

  async listVideos(channelId: string, maxResults = 20): Promise<unknown> {
    return this.get(YT_DATA_API, '/search', {
      part:       'snippet',
      channelId,
      maxResults: String(maxResults),
      order:      'date',
      type:       'video',
    });
  }

  async getAnalytics(channelId: string, startDate: string, endDate: string, metrics: string[]): Promise<unknown> {
    return this.get(YT_ANALYTICS_API, '/reports', {
      ids:        `channel==${channelId}`,
      startDate,
      endDate,
      metrics:    metrics.join(','),
      dimensions: 'day',
    });
  }
}
