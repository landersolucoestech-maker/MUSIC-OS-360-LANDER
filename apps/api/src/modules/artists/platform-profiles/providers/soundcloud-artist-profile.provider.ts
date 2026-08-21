import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';

/**
 * Fonte única do card de seguidores do SoundCloud: Soundcharts
 * /audience/soundcloud. Não depende mais de SOUNDCLOUD_CLIENT_ID/SECRET —
 * essa credencial (integração SoundCloud própria) pode continuar existindo
 * para outros usos, mas não bloqueia mais Métricas das Plataformas
 * (Soundcharts 05).
 */
@Injectable()
export class SoundCloudArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'soundcloud' as const;

  constructor(private readonly soundcharts: SoundchartsService) {}

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return this.soundcharts.isConfigured();
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    if (!(await this.isConfigured())) {
      throw new ServiceUnavailableException(
        'SoundCloud (Soundcharts) não configurado: defina SOUNDCHARTS_CLIENT_ID e SOUNDCHARTS_CLIENT_SECRET no ambiente da API',
      );
    }

    const slug = input.externalId ?? this.extractSlug(input.externalUrl ?? '');
    if (!slug) throw new Error('SoundCloud profile slug ausente ou inválido');

    const uuid = await this.soundcharts.resolveArtistByPlatform('soundcloud', slug);
    const followers = await this.soundcharts.getSoundCloudFollowers(uuid);

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'soundcloud',
      external_id: slug,
      external_url: input.externalUrl ?? `https://soundcloud.com/${slug}`,
      display_name: null,
      username: slug,
      profile_url: input.externalUrl ?? `https://soundcloud.com/${slug}`,
      image_url: null,
      followers: followers.value,
      subscribers: null,
      monthly_listeners: null,
      popularity: null,
      total_views: null,
      total_videos: null,
      total_tracks: null,
      total_albums: null,
      raw_payload: { soundcharts_uuid: uuid, observed_at: followers.observedAt.toISOString() },
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  /** Só aceita URLs de perfil (um único segmento), nunca faixa/playlist. */
  private extractSlug(value: string): string | null {
    const trimmed = value.trim();
    if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^https?:\/\/(?:www\.|m\.)?soundcloud\.com\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i);
    return match?.[1] ?? null;
  }
}
