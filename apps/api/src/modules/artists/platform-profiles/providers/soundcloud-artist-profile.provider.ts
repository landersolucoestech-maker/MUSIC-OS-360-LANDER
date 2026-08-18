import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';

const SOUNDCLOUD_AUTH = 'https://secure.soundcloud.com/oauth/token';
const SOUNDCLOUD_API = 'https://api.soundcloud.com';

/**
 * SoundCloud descontinuou o `/resolve?client_id=` público sem token (401
 * "must contain the Authorization header" — https://developers.soundcloud.com/blog/security-updates-api).
 * Todo endpoint, incluindo /resolve, agora exige um access_token via
 * client_credentials (app-level, SOUNDCLOUD_CLIENT_ID+SECRET — nunca login
 * do artista), mesmo padrão já usado por SpotifyArtistProfileProvider.
 */
@Injectable()
export class SoundCloudArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'soundcloud' as const;

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return !!(process.env['SOUNDCLOUD_CLIENT_ID'] && process.env['SOUNDCLOUD_CLIENT_SECRET']);
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    if (!(await this.isConfigured())) {
      throw new ServiceUnavailableException(
        'SoundCloud não configurado: defina SOUNDCLOUD_CLIENT_ID e SOUNDCLOUD_CLIENT_SECRET no ambiente da API',
      );
    }

    const profileUrl = input.externalUrl ?? (input.externalId ? `https://soundcloud.com/${input.externalId}` : null);
    if (!profileUrl) throw new Error('SoundCloud profile url ausente');

    const token = await this.getClientCredentialsToken();
    const qs = new URLSearchParams({ url: profileUrl });
    const res = await fetch(`${SOUNDCLOUD_API}/resolve?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('SoundCloud API respondeu 401: access_token expirado ou inválido');
      if (res.status === 404) throw new Error(`SoundCloud API respondeu 404: perfil "${profileUrl}" não encontrado`);
      throw new Error(`SoundCloud API respondeu ${res.status} ao resolver "${profileUrl}"`);
    }

    const data = await res.json() as {
      id?: number;
      kind?: string;
      username?: string;
      full_name?: string;
      permalink_url?: string;
      avatar_url?: string;
      followers_count?: number;
      track_count?: number;
    };
    if (data.kind && data.kind !== 'user') {
      throw new Error(`SoundCloud: a URL informada não é um perfil de usuário/artista (kind="${data.kind}")`);
    }

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'soundcloud',
      external_id: data.id != null ? String(data.id) : null,
      external_url: data.permalink_url ?? profileUrl,
      display_name: data.full_name || data.username || null,
      username: data.username ?? null,
      profile_url: data.permalink_url ?? profileUrl,
      image_url: data.avatar_url ?? null,
      followers: typeof data.followers_count === 'number' ? data.followers_count : null,
      subscribers: null,
      monthly_listeners: null,
      popularity: null,
      total_views: null,
      total_videos: null,
      total_tracks: typeof data.track_count === 'number' ? data.track_count : null,
      total_albums: null,
      raw_payload: data as Record<string, unknown>,
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  private async getClientCredentialsToken(): Promise<string> {
    const clientId = process.env['SOUNDCLOUD_CLIENT_ID'] ?? '';
    const clientSecret = process.env['SOUNDCLOUD_CLIENT_SECRET'] ?? '';
    const res = await fetch(SOUNDCLOUD_AUTH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json; charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error(
          'SoundCloud OAuth respondeu 401 (invalid_client): SOUNDCLOUD_CLIENT_ID/SOUNDCLOUD_CLIENT_SECRET inválidos',
        );
      }
      throw new Error(`SoundCloud OAuth respondeu ${res.status} ao emitir token client_credentials`);
    }
    const data = await res.json() as { access_token?: string };
    if (!data.access_token) throw new Error('SoundCloud OAuth não retornou access_token no corpo da resposta');
    return data.access_token;
  }
}
