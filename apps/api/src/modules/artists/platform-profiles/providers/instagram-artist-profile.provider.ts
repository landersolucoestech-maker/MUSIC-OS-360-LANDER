import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import { checkRegisteredHandleAgainstRegistry, resolveCanonicalUuidForProvider } from '../soundcharts-canonical-candidates.util';
import { isDevMockSocialMetricsEnabled, mockFollowersFor } from '../dev-social-metrics-mock';
import { soundchartsNotIndexedProvenance, soundchartsProvenance } from '../soundcharts-provenance.util';

/**
 * Métrica pública do ARTISTA via Soundcharts /audience/instagram — nunca a
 * conexão OAuth de Marketing/MusicChat (IntegrationsModule InstagramService,
 * uma integração tenant-scoped completamente separada) (Soundcharts 05).
 *
 * Fase 1.3 — PRIMÁRIO: resolução exata by-platform do handle CADASTRADO
 * (mesma prova de identidade que spotify/youtube/deezer/soundcloud já usam).
 * Só cai para o UUID canônico (spotify→youtube→deezer→soundcloud) quando o
 * handle não está indexado standalone na Soundcharts — comum para
 * Instagram/TikTok — e mesmo assim só usa esse dado como SECUNDÁRIO, exigindo
 * confirmação no registry de identifiers do canônico (`checkRegisteredHandleAgainstRegistry`)
 * antes de rotular como identidade verificada; sem confirmação, o dado ainda
 * é usado (evita zerar audiência real por lacuna de registry) mas rotulado
 * `INSUFFICIENT_EVIDENCE`, nunca `VERIFIED_EXACT` (corrige inversão conceitual
 * da Fase 1.2, onde o canônico era tentado antes do handle próprio).
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

    // extractUsername normaliza tanto handle bruto (com/sem @) quanto URL completa —
    // sempre passa pela mesma normalização, venha o valor de external_id ou external_url,
    // para nunca deixar um "@" ou variação de formatação vazar para a resolução exata.
    const username = this.extractUsername(input.externalId ?? input.externalUrl ?? '');
    if (!username) throw new Error('Instagram username ausente ou inválido');

    let followers: number | null = null;
    let observedAt = new Date();
    let resolvedUuid: string | null = null;
    let resolution: 'own_handle' | 'canonical' = 'own_handle';
    let primaryIdentityStatus: 'VERIFIED_EXACT' | 'INSUFFICIENT_EVIDENCE' | 'PROFILE_NOT_FOUND' = 'PROFILE_NOT_FOUND';
    let source: 'soundcharts' | 'dev_mock' = 'soundcharts';
    let provenance: ReturnType<typeof soundchartsProvenance> | ReturnType<typeof soundchartsNotIndexedProvenance> | { source_provider: 'dev_mock'; source_platform: 'instagram'; note: string };
    const attemptedEndpoints: string[] = [];

    // PRIMÁRIO: resolução exata pelo handle cadastrado.
    attemptedEndpoints.push(`/api/v2.9/artist/by-platform/instagram/${username}`);
    let ownUuid: string | null = null;
    try {
      ownUuid = await this.soundcharts.resolveArtistByPlatform('instagram', username);
    } catch (err) {
      if (!(err instanceof SoundchartsNotFoundError)) throw err;
    }

    if (ownUuid) {
      const metric = await this.soundcharts.getInstagramFollowers(ownUuid);
      followers = metric.value;
      observedAt = metric.observedAt;
      resolvedUuid = ownUuid;
      resolution = 'own_handle';
      primaryIdentityStatus = 'VERIFIED_EXACT';
      provenance = soundchartsProvenance('instagram', metric);
    } else {
      // SECUNDÁRIO: handle não indexado standalone — tenta o UUID canônico
      // (spotify/youtube/deezer/soundcloud), confirmando no registry antes de
      // rotular como verificado.
      const canonicalUuid = await resolveCanonicalUuidForProvider(this.soundcharts, input.canonicalUrls, 'instagram', username);
      const registryStatus = await checkRegisteredHandleAgainstRegistry(this.soundcharts, canonicalUuid, 'instagram', username);

      let canonicalMetric: Awaited<ReturnType<typeof this.soundcharts.getInstagramFollowers>> | null = null;
      if (registryStatus !== 'MISMATCH') {
        attemptedEndpoints.push(`/api/v2/artist/${canonicalUuid}/audience/instagram`);
        try {
          canonicalMetric = await this.soundcharts.getInstagramFollowers(canonicalUuid);
        } catch (err) {
          if (!(err instanceof SoundchartsNotFoundError)) throw err;
        }
      }

      if (canonicalMetric) {
        followers = canonicalMetric.value;
        observedAt = canonicalMetric.observedAt;
        resolvedUuid = canonicalUuid;
        resolution = 'canonical';
        primaryIdentityStatus = registryStatus === 'CONFIRMED' ? 'VERIFIED_EXACT' : 'INSUFFICIENT_EVIDENCE';
        provenance = soundchartsProvenance('instagram', canonicalMetric);
      } else {
        resolvedUuid = canonicalUuid;
        primaryIdentityStatus = 'PROFILE_NOT_FOUND';
        // Real "nenhuma conta social vinculada" — em dev/local com USE_MOCK=true,
        // usa o fallback de demonstração (nunca em produção/staging, ver
        // dev-social-metrics-mock.ts). Dado real da Soundcharts sempre teria
        // vencido acima; isto só roda depois que a Soundcharts genuinamente não
        // tem nada para oferecer.
        if (isDevMockSocialMetricsEnabled()) {
          followers = mockFollowersFor(input.artistId, 'instagram');
          source = 'dev_mock';
          provenance = {
            source_provider: 'dev_mock',
            source_platform: 'instagram',
            note: 'Soundcharts confirmou conta não indexada (SOURCE_ACCOUNT_NOT_INDEXED); valor gerado deterministicamente para demonstração local, nunca em staging/production.',
          };
        } else {
          provenance = soundchartsNotIndexedProvenance('instagram', attemptedEndpoints);
        }
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
        primary_identity_status: primaryIdentityStatus,
        source,
        ...provenance,
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
