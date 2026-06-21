import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';

const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SPOTIFY_API = 'https://api.spotify.com/v1';

@Injectable()
export class SpotifyArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'spotify' as const;

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return !!(process.env['SPOTIFY_CLIENT_ID'] && process.env['SPOTIFY_CLIENT_SECRET']);
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    if (!(await this.isConfigured(input.tenantId))) {
      throw new ServiceUnavailableException('Spotify não configurado');
    }

    const artistId = input.externalId ?? this.extractArtistId(input.externalUrl ?? '');
    if (!artistId) throw new Error('Spotify artist id ausente ou inválido');

    const token = await this.getClientCredentialsToken();
    const res = await fetch(`${SPOTIFY_API}/artists/${encodeURIComponent(artistId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);

    const data = await res.json() as {
      id?: string;
      name?: string;
      uri?: string;
      external_urls?: { spotify?: string };
      followers?: { total?: number };
      popularity?: number;
      images?: Array<{ url?: string }>;
    };

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'spotify',
      external_id: data.id ?? artistId,
      external_url: input.externalUrl ?? data.external_urls?.spotify ?? null,
      display_name: data.name ?? null,
      username: null,
      profile_url: data.external_urls?.spotify ?? input.externalUrl ?? null,
      image_url: data.images?.[0]?.url ?? null,
      followers: data.followers?.total ?? null,
      subscribers: null,
      monthly_listeners: null,
      popularity: typeof data.popularity === 'number' ? data.popularity : null,
      total_views: null,
      total_videos: null,
      total_tracks: null,
      total_albums: null,
      raw_payload: data as Record<string, unknown>,
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  private extractArtistId(value: string): string | null {
    if (!value) return null;
    const urlMatch = value.match(/artist\/([A-Za-z0-9]+)/);
    if (urlMatch?.[1]) return urlMatch[1];
    return /^[A-Za-z0-9]{10,}$/.test(value) ? value : null;
  }

  private async getClientCredentialsToken(): Promise<string> {
    const clientId = process.env['SPOTIFY_CLIENT_ID'] ?? '';
    const clientSecret = process.env['SPOTIFY_CLIENT_SECRET'] ?? '';
    if (!clientId || !clientSecret) throw new ServiceUnavailableException('Spotify credentials unavailable');

    const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    if (!res.ok) throw new Error(`Spotify token error: ${res.status}`);
    const data = await res.json() as { access_token?: string };
    if (!data.access_token) throw new Error('Spotify token ausente');
    return data.access_token;
  }
}
