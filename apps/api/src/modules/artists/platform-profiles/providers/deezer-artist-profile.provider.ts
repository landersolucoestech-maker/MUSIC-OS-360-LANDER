import { Injectable } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';

const DEEZER_API = 'https://api.deezer.com';

@Injectable()
export class DeezerArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'deezer' as const;

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return true; // API pública, sem credencial — mesmo comportamento do DeezerService existente
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    const artistId = input.externalId ?? this.extractArtistId(input.externalUrl ?? '');
    if (!artistId) throw new Error('Deezer artist id ausente ou inválido');

    const res = await fetch(`${DEEZER_API}/artist/${encodeURIComponent(artistId)}`);
    if (!res.ok) {
      throw new Error(`Deezer API respondeu ${res.status} ao buscar o artista "${artistId}"`);
    }

    const data = await res.json() as {
      id?: number | string;
      name?: string;
      link?: string;
      picture_medium?: string;
      nb_fan?: number;
      nb_album?: number;
      error?: { message?: string };
    };
    if (data.error) {
      throw new Error(`Deezer API erro: ${data.error.message ?? 'artista não encontrado'}`);
    }

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'deezer',
      external_id: data.id != null ? String(data.id) : artistId,
      external_url: input.externalUrl ?? data.link ?? null,
      display_name: data.name ?? null,
      username: null,
      profile_url: data.link ?? input.externalUrl ?? null,
      image_url: data.picture_medium ?? null,
      followers: typeof data.nb_fan === 'number' ? data.nb_fan : null,
      subscribers: null,
      monthly_listeners: null,
      popularity: null,
      total_views: null,
      total_videos: null,
      total_tracks: null,
      total_albums: typeof data.nb_album === 'number' ? data.nb_album : null,
      raw_payload: data as Record<string, unknown>,
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  private extractArtistId(value: string): string | null {
    if (!value) return null;
    const urlMatch = value.match(/artist\/(\d+)/);
    if (urlMatch?.[1]) return urlMatch[1];
    return /^\d+$/.test(value) ? value : null;
  }
}
