import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import { resolveCanonicalUuidForProvider } from '../soundcharts-canonical-candidates.util';

/**
 * Apple Music não tem audiência/ouvintes na Soundcharts (ver
 * SoundchartsService.getAppleMusicPlaylistCount para os endpoints
 * verificados). A única métrica real e honesta disponível é a contagem de
 * playlists do Apple Music que incluem o artista — presença editorial, não
 * audiência. Por isso NUNCA entra em followers/subscribers/monthly_listeners
 * (esses campos ficam null); vive só em raw_payload.playlist_count, e o
 * frontend rotula o card como "Playlists", nunca "Ouvintes"/"Seguidores"
 * (Soundcharts 07).
 */
@Injectable()
export class AppleMusicArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'apple-music' as const;

  constructor(private readonly soundcharts: SoundchartsService) {}

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return this.soundcharts.isConfigured();
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    if (!(await this.isConfigured())) {
      throw new ServiceUnavailableException(
        'Apple Music (Soundcharts) não configurado: defina SOUNDCHARTS_CLIENT_ID e SOUNDCHARTS_CLIENT_SECRET no ambiente da API',
      );
    }

    const appleId = input.externalId ?? this.extractAppleMusicId(input.externalUrl ?? '');
    if (!appleId) throw new Error('Apple Music artist id ausente ou inválido');

    const uuid = await resolveCanonicalUuidForProvider(this.soundcharts, input.canonicalUrls, 'apple-music', appleId);

    // "Nenhuma playlist encontrada" é uma resposta válida da Soundcharts (não
    // um erro de integração) — sync bem-sucedido com playlist_count null, o
    // card mostra "Indisponível", nunca "Erro" (mesma convenção do
    // monthly_listeners do Spotify).
    let playlistCount: number | null = null;
    let observedAt = new Date();
    try {
      const metric = await this.soundcharts.getAppleMusicPlaylistCount(uuid);
      playlistCount = metric.value;
      observedAt = metric.observedAt;
    } catch (err) {
      if (!(err instanceof SoundchartsNotFoundError)) throw err;
    }

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'apple-music',
      external_id: appleId,
      external_url: input.externalUrl ?? `https://music.apple.com/artist/${appleId}`,
      display_name: null,
      username: null,
      profile_url: input.externalUrl ?? `https://music.apple.com/artist/${appleId}`,
      image_url: null,
      followers: null,
      subscribers: null,
      monthly_listeners: null,
      popularity: null,
      total_views: null,
      total_videos: null,
      total_tracks: null,
      total_albums: null,
      raw_payload: { soundcharts_uuid: uuid, playlist_count: playlistCount, observed_at: observedAt.toISOString() },
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  private extractAppleMusicId(value: string): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^https?:\/\/(?:www\.|music\.)?apple\.com\/[a-z]{2}\/artist\/(?:[^/?#]+\/)?(\d+)(?:[/?#].*)?$/i);
    return match?.[1] ?? null;
  }
}
