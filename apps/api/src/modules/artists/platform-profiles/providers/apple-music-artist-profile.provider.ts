import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import { checkRegisteredHandleAgainstRegistry, resolveCanonicalUuidForProvider } from '../soundcharts-canonical-candidates.util';
import { soundchartsNotIndexedProvenance, soundchartsProvenance } from '../soundcharts-provenance.util';
import { extractAppleMusicId } from '../apple-music-url.util';

/**
 * Apple Music não tem audiência/ouvintes na Soundcharts (ver
 * SoundchartsService.getAppleMusicPlaylistCount para os endpoints
 * verificados). A única métrica real e honesta disponível é a contagem de
 * playlists do Apple Music que incluem o artista — presença editorial, não
 * audiência. Por isso NUNCA entra em followers/subscribers/monthly_listeners
 * (esses campos ficam null); vive só em raw_payload.playlist_count, e o
 * frontend rotula o card como "Playlists", nunca "Ouvintes"/"Seguidores"
 * (Soundcharts 07).
 *
 * Fase 1.3 — PRIMÁRIO: resolução exata by-platform do Apple Music ID
 * CADASTRADO (mesma prova de identidade que spotify/youtube/deezer/soundcloud
 * já usam) — fecha o gap reportado na Fase 1.2, onde a entidade usada vinha
 * sempre do UUID canônico sem nunca tentar o ID cadastrado diretamente. Só
 * cai para o canônico se o ID cadastrado não resolver sozinho, e mesmo assim
 * exige confirmação no registry antes de rotular como verificado.
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

    const appleId = input.externalId ?? extractAppleMusicId(input.externalUrl ?? '');
    if (!appleId) throw new Error('Apple Music artist id ausente ou inválido');

    // PRIMÁRIO: resolução exata pelo Apple Music ID cadastrado.
    let uuid: string | null = null;
    let primaryIdentityStatus: 'VERIFIED_EXACT' | 'INSUFFICIENT_EVIDENCE' = 'VERIFIED_EXACT';
    try {
      uuid = await this.soundcharts.resolveArtistByPlatform('apple-music', appleId);
    } catch (err) {
      if (!(err instanceof SoundchartsNotFoundError)) throw err;
    }

    if (!uuid) {
      // SECUNDÁRIO: ID cadastrado não indexado standalone — cai para o UUID
      // canônico, confirmando no registry antes de rotular como verificado.
      uuid = await resolveCanonicalUuidForProvider(this.soundcharts, input.canonicalUrls, 'apple-music', appleId);
      const registryStatus = await checkRegisteredHandleAgainstRegistry(this.soundcharts, uuid, 'apple-music', appleId);
      primaryIdentityStatus = registryStatus === 'CONFIRMED' ? 'VERIFIED_EXACT' : 'INSUFFICIENT_EVIDENCE';
    }

    // "Nenhuma playlist encontrada" é uma resposta válida da Soundcharts (não
    // um erro de integração) — sync bem-sucedido com playlist_count null, o
    // card mostra "Indisponível", nunca "Erro" (mesma convenção do
    // monthly_listeners do Spotify).
    let playlistCount: number | null = null;
    let observedAt = new Date();
    let provenance: ReturnType<typeof soundchartsProvenance> | ReturnType<typeof soundchartsNotIndexedProvenance>;
    try {
      const metric = await this.soundcharts.getAppleMusicPlaylistCount(uuid);
      playlistCount = metric.value;
      observedAt = metric.observedAt;
      provenance = soundchartsProvenance('apple-music', metric);
    } catch (err) {
      if (!(err instanceof SoundchartsNotFoundError)) throw err;
      provenance = soundchartsNotIndexedProvenance('apple-music', [`/api/v2/artist/${uuid}/playlist/reach/apple-music`]);
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
      raw_payload: {
        soundcharts_uuid: uuid,
        playlist_count: playlistCount,
        observed_at: observedAt.toISOString(),
        // Confirmado por chamada direta à API real (auditoria 2026-08-31):
        // /audience/apple-music responde "not a social platform" — a
        // Soundcharts genuinamente não tem métrica de audiência para Apple
        // Music. playlist_count é a única métrica real disponível (presença
        // editorial, não audiência) — nunca vira followers/subscribers.
        audience_metric_availability: 'SOURCE_DOES_NOT_PROVIDE_METRIC',
        primary_identity_status: primaryIdentityStatus,
        ...provenance,
      },
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }
}
