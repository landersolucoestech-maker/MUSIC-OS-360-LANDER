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
 * Métrica pública do ARTISTA via Soundcharts /audience/instagram — nunca a
 * conexão OAuth de Marketing/MusicChat (IntegrationsModule InstagramService,
 * uma integração tenant-scoped completamente separada) (Soundcharts 05).
 *
 * UUID resolvido via cadeia canônica spotify→youtube→deezer→soundcloud
 * (canonicalUrls), com o próprio handle do Instagram só como último recurso
 * — o handle raramente está indexado sozinho na Soundcharts (Soundcharts 06).
 *
 * "Nenhuma conta social vinculada" (404) é uma resposta VÁLIDA da Soundcharts
 * — nem todo artista tem Instagram indexado lá (confirmado: Dj Stay 404 em
 * /identifiers, /audience/instagram e /search/external/url; Billie Eilish
 * 200 com followerCount real nos três) — não é falha de pipeline. Por isso
 * vira sync success com followers=null ("Indisponível" na UI), nunca
 * sync_status=failed ("Erro"), que fica reservado para falha real (rede,
 * 429, 5xx) (Soundcharts 07).
 */
@Injectable()
export class InstagramArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'instagram' as const;

  constructor(private readonly soundcharts: SoundchartsService) {}

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return this.soundcharts.isConfigured();
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    if (!(await this.isConfigured())) {
      throw new ServiceUnavailableException(
        'Instagram (Soundcharts) não configurado: defina SOUNDCHARTS_CLIENT_ID e SOUNDCHARTS_CLIENT_SECRET no ambiente da API',
      );
    }

    const username = input.externalId ?? this.extractUsername(input.externalUrl ?? '');
    if (!username) throw new Error('Instagram username ausente ou inválido');

    const uuid = await resolveCanonicalUuidForProvider(this.soundcharts, input.canonicalUrls, 'instagram', username);

    let followers: number | null = null;
    let observedAt = new Date();
    let resolvedUuid = uuid;
    let resolution: 'canonical' | 'own_handle' = 'canonical';
    let ownHandleAttempted = false;
    try {
      const metric = await this.soundcharts.getInstagramFollowers(uuid);
      followers = metric.value;
      observedAt = metric.observedAt;
    } catch (err) {
      if (!(err instanceof SoundchartsNotFoundError)) throw err;
      // Canônico (spotify/youtube/deezer/soundcloud) resolveu um artista, mas ele não tem
      // Instagram indexado nesse UUID — tenta resolver pelo handle do próprio Instagram
      // antes de desistir: um handle explícito informado pelo usuário nunca pode ser
      // ignorado só porque o artista também tem spotify_url (bug reportado).
      ownHandleAttempted = true;
      try {
        const ownUuid = await this.soundcharts.resolveArtistByPlatform('instagram', username);
        const metric = await this.soundcharts.getInstagramFollowers(ownUuid);
        followers = metric.value;
        observedAt = metric.observedAt;
        resolvedUuid = ownUuid;
        resolution = 'own_handle';
      } catch (ownErr) {
        if (!(ownErr instanceof SoundchartsNotFoundError)) throw ownErr;
      }
    }

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'instagram',
      external_id: username,
      external_url: input.externalUrl ?? `https://www.instagram.com/${username}`,
      display_name: null,
      username,
      profile_url: input.externalUrl ?? `https://www.instagram.com/${username}`,
      image_url: null,
      followers,
      subscribers: null,
      monthly_listeners: null,
      popularity: null,
      total_views: null,
      total_videos: null,
      total_tracks: null,
      total_albums: null,
      raw_payload: {
        soundcharts_uuid: resolvedUuid,
        observed_at: observedAt.toISOString(),
        resolution,
        own_handle_attempted: ownHandleAttempted,
      },
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  private extractUsername(value: string): string | null {
    if (!value) return null;
    let path = value.trim();
    try {
      if (/^https?:\/\//i.test(path)) {
        const url = new URL(path);
        if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
        path = url.pathname;
      }
    } catch {
      return null;
    }
    const username = path.replace(/^\/+|\/+$/g, '').split('/')[0]?.split('?')[0]?.replace(/^@/, '') ?? '';
    return /^[A-Za-z0-9._]{1,30}$/.test(username) ? username : null;
  }
}
