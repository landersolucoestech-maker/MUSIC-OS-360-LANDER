import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ARTIST_PLATFORM_PROFILE_JOB_NAMES, QUEUE_NAMES } from '../queue.constants';
import { ArtistEntity } from '../../database/entities';
import { ArtistPlatformProfilesService } from '../../modules/artists/platform-profiles/artist-platform-profiles.service';
import type {
  ArtistPlatformProvider,
  ArtistPlatformSyncJobPayload,
  SocialPlatform,
} from '../../modules/artists/platform-profiles/social-platform-sync.types';
import { SpotifyArtistProfileProvider } from '../../modules/artists/platform-profiles/providers/spotify-artist-profile.provider';
import { YouTubeArtistProfileProvider } from '../../modules/artists/platform-profiles/providers/youtube-artist-profile.provider';

@Processor(QUEUE_NAMES.ARTIST_PLATFORM_SYNC)
@Injectable()
export class ArtistPlatformSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ArtistPlatformSyncProcessor.name);
  private readonly providers: Record<SocialPlatform, ArtistPlatformProvider>;

  constructor(
    @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly profiles: ArtistPlatformProfilesService,
    spotify: SpotifyArtistProfileProvider,
    youtube: YouTubeArtistProfileProvider,
  ) {
    super();
    this.providers = {
      spotify,
      youtube,
    };
  }

  async process(job: Job<ArtistPlatformSyncJobPayload>): Promise<void> {
    if (job.name !== ARTIST_PLATFORM_PROFILE_JOB_NAMES.SYNC) return;

    const payload = job.data;
    const provider = this.providers[payload.platform];
    if (!provider) {
      this.logger.warn(`[artist-platform-sync] provider unavailable platform=${payload.platform}`);
      return;
    }

    await this.profiles.upsertPending({
      tenantId: payload.tenant_id,
      artistId: payload.artist_id,
      platform: payload.platform,
      externalId: payload.external_id ?? null,
      externalUrl: payload.external_url ?? null,
    });

    try {
      const artist = await this.ds?.getRepository(ArtistEntity).findOne({
        where: { id: payload.artist_id, tenant_id: payload.tenant_id, deleted_at: null } as never,
      });
      if (!artist) {
        await this.profiles.markFailed({
          tenantId: payload.tenant_id,
          artistId: payload.artist_id,
          platform: payload.platform,
          externalId: payload.external_id ?? null,
          externalUrl: payload.external_url ?? null,
          error: 'Artista não encontrado',
        });
        return;
      }
      if (!payload.external_id && !payload.external_url) {
        await this.profiles.markFailed({
          tenantId: payload.tenant_id,
          artistId: payload.artist_id,
          platform: payload.platform,
          externalId: payload.external_id ?? null,
          externalUrl: payload.external_url ?? null,
          error: 'Perfil externo ausente no artista',
        });
        return;
      }

      const snapshot = await provider.resolve({
        tenantId: payload.tenant_id,
        artistId: payload.artist_id,
        externalId: payload.external_id ?? null,
        externalUrl: payload.external_url ?? null,
      });
      await this.profiles.upsertSuccess(snapshot);
      this.logger.log(`[artist-platform-sync] success artist=${payload.artist_id} platform=${payload.platform}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.profiles.markFailed({
        tenantId: payload.tenant_id,
        artistId: payload.artist_id,
        platform: payload.platform,
        externalId: payload.external_id ?? null,
        externalUrl: payload.external_url ?? null,
        error: message,
      });
      this.logger.warn(`[artist-platform-sync] failed artist=${payload.artist_id} platform=${payload.platform}: ${message}`);
    }
  }
}
