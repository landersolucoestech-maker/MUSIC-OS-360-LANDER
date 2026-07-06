import { BadRequestException, Inject, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
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
  private readonly logger = new Logger(ArtistExternalProfileSyncService.name);

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

    const startedAt = Date.now();
    const artist = await this.artists.findById(input.tenantId, input.artistId);
    const platform = input.platform;
    const normalized = this.resolveExternalProfile({
      platform,
      profileUrl: input.profileUrl,
      cachedProfileUrl: platform === 'spotify' ? artist.spotify_url : artist.youtube_url,
    });
    const externalId = normalized.externalId;
    const externalUrl = normalized.externalUrl;

    const logCtx =
      `tenant=${input.tenantId} artist=${input.artistId} platform=${platform} ` +
      `requestedBy=${input.requestedBy} externalId=${externalId ?? '-'} externalUrl=${externalUrl ?? '-'}`;
    this.logger.log(`[platform-sync/enqueue] solicitado ${logCtx}`);

    if (!externalId && !externalUrl) {
      this.logger.warn(`[platform-sync/enqueue] pulado reason=missing_external_profile ${logCtx}`);
      return {
        artist_id: input.artistId,
        enqueued: [],
        skipped: [{ platform, reason: 'missing_external_profile' }],
      };
    }

    if (await this.profiles.hasRecentPending(input.tenantId, input.artistId, platform)) {
      this.logger.warn(`[platform-sync/enqueue] pulado reason=pending_sync_exists ${logCtx}`);
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
      this.logger.error(`[platform-sync/enqueue] fila BullMQ indisponível (Redis off/no-op) ${logCtx}`);
      throw new ServiceUnavailableException(
        `Fila de sincronização indisponível: BullMQ está em modo no-op (Redis inacessível ou REDIS_QUEUE_URL ausente) — sync de ${platform} não pôde ser enfileirado`,
      );
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

    const jobOptions: Parameters<Queue<ArtistPlatformSyncJobPayload>['add']>[2] = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
      jobId: payload.idempotency_key,
    };

    let job;
    try {
      job = await this.queue.add(ARTIST_PLATFORM_PROFILE_JOB_NAMES.SYNC, payload, jobOptions);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[platform-sync/enqueue] BullMQ add falhou: ${message} jobId=${payload.idempotency_key} ${logCtx}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new ServiceUnavailableException(
        `Falha ao enfileirar sincronização de ${platform} no BullMQ: ${message}`,
      );
    }

    this.logger.log(
      `[platform-sync/enqueue] enfileirado job=${String(job.id)} latency_ms=${Date.now() - startedAt} ${logCtx}`,
    );

    return {
      artist_id: input.artistId,
      enqueued: [{ platform, job_id: String(job.id) }],
      skipped: [],
    };
  }

  private resolveExternalProfile(input: {
    platform: SocialPlatform;
    profileUrl?: string | null;
    cachedProfileUrl?: string | null;
  }): { externalId: string | null; externalUrl: string | null } {
    const rawUrl = input.profileUrl?.trim() ?? '';
    if (rawUrl) {
      if (input.platform === 'spotify') {
        const externalId = this.extractSpotifyArtistId(rawUrl);
        if (!externalId) throw new BadRequestException('Link do Spotify inválido: informe uma URL de artista do Spotify');
        return {
          externalId,
          externalUrl: `https://open.spotify.com/artist/${externalId}`,
        };
      }

      const externalId = this.extractYouTubeChannelId(rawUrl);
      if (!externalId) {
        throw new BadRequestException('Link do YouTube inválido: informe uma URL /channel/UC... ou um channelId UC...');
      }
      return {
        externalId,
        externalUrl: `https://www.youtube.com/channel/${externalId}`,
      };
    }

    const cachedProfileUrl = input.cachedProfileUrl?.trim() ?? '';
    if (!cachedProfileUrl) return { externalId: null, externalUrl: null };
    if (input.platform === 'spotify') {
      const externalId = this.extractSpotifyArtistId(cachedProfileUrl);
      return {
        externalId,
        externalUrl: externalId ? `https://open.spotify.com/artist/${externalId}` : cachedProfileUrl,
      };
    }
    const externalId = this.extractYouTubeChannelId(cachedProfileUrl);
    return {
      externalId,
      externalUrl: externalId ? `https://www.youtube.com/channel/${externalId}` : cachedProfileUrl,
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
    // BullMQ proíbe ':' em jobId customizado (separador de chaves Redis) —
    // Job.validateOptions lança "Custom Id cannot contain :". Usar '__'.
    return `${tenantId}__${artistId}__${platform}__manual__${hash}`;
  }
}
