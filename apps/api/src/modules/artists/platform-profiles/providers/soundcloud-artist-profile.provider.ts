import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';

const SOUNDCLOUD_API = 'https://api.soundcloud.com';

/**
 * SoundCloud /resolve é público (só exige client_id de app, sem OAuth de
 * usuário) — mesma capacidade já usada por SoundCloudService.resolveUser
 * (módulo integrations), aqui adaptada ao pipeline real de
 * ArtistPlatformProfileEntity (mesmo padrão do Deezer/Spotify/YouTube).
 */
@Injectable()
export class SoundCloudArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'soundcloud' as const;

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return !!process.env['SOUNDCLOUD_CLIENT_ID'];
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    if (!(await this.isConfigured())) {
      throw new ServiceUnavailableException(
        'SoundCloud não configurado: defina SOUNDCLOUD_CLIENT_ID no ambiente da API',
      );
    }

    const profileUrl = input.externalUrl ?? (input.externalId ? `https://soundcloud.com/${input.externalId}` : null);
    if (!profileUrl) throw new Error('SoundCloud profile url ausente');

    const clientId = process.env['SOUNDCLOUD_CLIENT_ID'] ?? '';
    const qs = new URLSearchParams({ url: profileUrl, client_id: clientId });
    const res = await fetch(`${SOUNDCLOUD_API}/resolve?${qs.toString()}`);
    if (!res.ok) {
      if (res.status === 401) throw new Error('SoundCloud API respondeu 401: SOUNDCLOUD_CLIENT_ID inválido');
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
}
