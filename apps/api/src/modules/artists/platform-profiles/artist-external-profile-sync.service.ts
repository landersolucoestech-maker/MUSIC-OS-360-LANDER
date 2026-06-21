import { BadRequestException, Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { QUEUE_NAMES, ARTIST_PLATFORM_PROFILE_JOB_NAMES } from '../../../queues/queue.constants';
import { ArtistsService } from '../artists.service';
import { ArtistPlatformProfilesService } from './artist-platform-profiles.service';
import type { ArtistPlatformSyncJobPayload, SocialPlatform } from './social-platform-sync.types';
import { isSocialPlatform } from './social-platform-sync.types';

@Injectable()
export class ArtistExternalProfileSyncService {
  constructor(
    private readonly artists: ArtistsService,
    private readonly profiles: ArtistPlatformProfilesService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.ARTIST_PLATFORM_SYNC)
    private readonly queue: Queue<ArtistPlatformSyncJobPayload> | null,
  ) {}

  async enqueueManualSync(input: {
    tenantId: string;
    artistId: string;
    platform: string;
    requestedBy: string;
    profileUrl?: string | null;
  }): Promise<{
    artist_id: string;
    enqueued: Array<{ platform: SocialPlatform; job_id: string }>;
    skipped: Array<{ platform: SocialPlatform; reason: string }>;
  }> {
    if (!isSocialPlatform(input.platform)) {
      throw new BadRequestException('Plataforma inválida para sync de perfil do artista');
    }

    const artist = await this.artists.findById(input.tenantId, input.artistId);
    const platform = input.platform;
    const normalized = this.resolveExternalProfile({
      platform,
      profileUrl: input.profileUrl,
      cachedExternalId: platform === 'spotify' ? artist.spotify_artist_id : artist.youtube_channel_id,
    });
    const externalId = normalized.externalId;
    const externalUrl = normalized.externalUrl;

    if (!externalId && !externalUrl) {
      return {
        artist_id: input.artistId,
        enqueued: [],
        skipped: [{ platform, reason: 'missing_external_profile' }],
      };
    }

    if (await this.profiles.hasRecentPending(input.tenantId, input.artistId, platform)) {
      return {
        artist_id: input.artistId,
        enqueued: [],
        skipped: [{ platform, reason: 'pending_sync_exists' }],
      };
    }

    if (!this.queue) {
      await this.profiles.upsertPending({
        tenantId: input.tenantId,
        artistId: input.artistId,
        platform,
        externalId,
        externalUrl,
      });
      throw new ServiceUnavailableException('Fila de sincronização indisponível');
    }

    const payload: ArtistPlatformSyncJobPayload = {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform,
      external_id: externalId,
      external_url: externalUrl,
      requested_by: input.requestedBy,
      reason: 'manual',
      idempotency_key: this.buildIdempotencyKey(input.tenantId, input.artistId, platform, externalId ?? externalUrl ?? ''),
    };

    await this.profiles.upsertPending({
      tenantId: input.tenantId,
      artistId: input.artistId,
      platform,
      externalId,
      externalUrl,
    });

    const jobOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      timeout: 15_000,
      removeOnComplete: true,
      removeOnFail: false,
      jobId: payload.idempotency_key,
    } as Parameters<Queue<ArtistPlatformSyncJobPayload>['add']>[2] & { timeout: number };

    const job = await this.queue.add(ARTIST_PLATFORM_PROFILE_JOB_NAMES.SYNC, payload, jobOptions);

    return {
      artist_id: input.artistId,
      enqueued: [{ platform, job_id: String(job.id) }],
      skipped: [],
    };
  }

  private resolveExternalProfile(input: {
    platform: SocialPlatform;
    profileUrl?: string | null;
    cachedExternalId?: string | null;
  }): { externalId: string | null; externalUrl: string | null } {
    const rawUrl = input.profileUrl?.trim() ?? '';
    if (rawUrl) {
      if (input.platform === 'spotify') {
        const externalId = this.extractSpotifyArtistId(rawUrl);
        if (!externalId) throw new BadRequestException('Link do Spotify invÃ¡lido: informe uma URL de artista do Spotify');
        return {
          externalId,
          externalUrl: `https://open.spotify.com/artist/${externalId}`,
        };
      }

      const externalId = this.extractYouTubeChannelId(rawUrl);
      if (!externalId) {
        throw new BadRequestException('Link do YouTube invÃ¡lido: informe uma URL /channel/UC... ou um channelId UC...');
      }
      return {
        externalId,
        externalUrl: `https://www.youtube.com/channel/${externalId}`,
      };
    }

    const cachedExternalId = input.cachedExternalId?.trim() ?? '';
    if (!cachedExternalId) return { externalId: null, externalUrl: null };
    if (input.platform === 'spotify') {
      return {
        externalId: cachedExternalId,
        externalUrl: `https://open.spotify.com/artist/${cachedExternalId}`,
      };
    }
    return {
      externalId: cachedExternalId,
      externalUrl: `https://www.youtube.com/channel/${cachedExternalId}`,
    };
  }

  private extractSpotifyArtistId(value: string): string | null {
    const trimmed = value.trim();
    if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/([A-Za-z0-9]{22})(?:[/?#].*)?$/i);
    return match?.[1] ?? null;
  }

  private extractYouTubeChannelId(value: string): string | null {
    const trimmed = value.trim();
    if (/^UC[A-Za-z0-9_-]{22}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})(?:[/?#].*)?$/i);
    return match?.[1] ?? null;
  }

  private buildIdempotencyKey(
    tenantId: string,
    artistId: string,
    platform: SocialPlatform,
    externalRef: string,
  ): string {
    const hash = createHash('sha256').update(externalRef).digest('hex').slice(0, 24);
    return `${tenantId}:${artistId}:${platform}:manual:${hash}`;
  }
}
