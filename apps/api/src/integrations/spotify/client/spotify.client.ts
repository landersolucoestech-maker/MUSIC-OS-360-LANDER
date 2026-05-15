/**
 * integrations/spotify/client/spotify.client.ts
 *
 * Low-level HTTP client for the Spotify Web API.
 * Handles token refresh, retries, and request signing.
 * Business logic lives in SpotifyService (services/).
 */

const SPOTIFY_API      = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';

export interface SpotifyClientTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    Date;
}

export class SpotifyApiClient {
  constructor(private tokens: SpotifyClientTokens) {}

  private get authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.tokens.accessToken}` };
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${SPOTIFY_API}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: this.authHeader });
    if (!res.ok) throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async searchArtist(query: string, limit = 10): Promise<unknown> {
    return this.get('/search', { q: query, type: 'artist', limit: String(limit) });
  }

  async getArtist(artistId: string): Promise<unknown> {
    return this.get(`/artists/${artistId}`);
  }

  async getArtistTopTracks(artistId: string, market = 'BR'): Promise<unknown> {
    return this.get(`/artists/${artistId}/top-tracks`, { market });
  }

  /** Refresh OAuth tokens using a refresh_token. */
  static async refreshTokens(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    });
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
    return res.json() as Promise<{ access_token: string; expires_in: number }>;
  }
}
