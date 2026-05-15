/**
 * integrations/soundcloud/client/soundcloud.client.ts
 * Low-level HTTP client for the SoundCloud API.
 */

const SC_API = 'https://api.soundcloud.com';

export class SoundCloudApiClient {
  constructor(private readonly accessToken: string) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${SC_API}${path}`);
    url.searchParams.set('oauth_token', this.accessToken);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json; charset=utf-8' },
    });
    if (!res.ok) throw new Error(`SoundCloud API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async getMe(): Promise<unknown> {
    return this.get('/me');
  }

  async getMyTracks(limit = 50, offset = 0): Promise<unknown> {
    return this.get('/me/tracks', { limit: String(limit), offset: String(offset) });
  }

  async searchTracks(query: string, limit = 10): Promise<unknown> {
    return this.get('/tracks', { q: query, limit: String(limit) });
  }

  async searchUsers(query: string, limit = 10): Promise<unknown> {
    return this.get('/users', { q: query, limit: String(limit) });
  }

  async getTrack(trackId: number): Promise<unknown> {
    return this.get(`/tracks/${trackId}`);
  }
}
