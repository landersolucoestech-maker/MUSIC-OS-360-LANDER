import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ArtistPlatformProfileEntity } from '../../../database/entities';
import type { SocialPlatform, SocialPlatformProfileSnapshot } from './social-platform-sync.types';
import { toSocialPlatformSnapshot } from './social-platform-sync.types';

@Injectable()
export class ArtistPlatformProfilesService {
  private readonly repo: Repository<ArtistPlatformProfileEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(ArtistPlatformProfileEntity);
  }

  private requireRepo(): Repository<ArtistPlatformProfileEntity> {
    if (!this.repo) throw new ServiceUnavailableException('Artist platform profile persistence unavailable');
    return this.repo;
  }

  async findByArtist(tenantId: string, artistId: string): Promise<SocialPlatformProfileSnapshot[]> {
    const rows = await this.requireRepo().find({
      where: { tenant_id: tenantId, artist_id: artistId } as never,
      order: { platform: 'ASC' } as never,
    });
    return rows.map(toSocialPlatformSnapshot);
  }

  async findByArtistAndPlatform(
    tenantId: string,
    artistId: string,
    platform: SocialPlatform,
  ): Promise<SocialPlatformProfileSnapshot | null> {
    const row = await this.requireRepo().findOne({
      where: { tenant_id: tenantId, artist_id: artistId, platform } as never,
    });
    return row ? toSocialPlatformSnapshot(row) : null;
  }

  async hasRecentPending(
    tenantId: string,
    artistId: string,
    platform: SocialPlatform,
    windowMs = 2 * 60 * 1000,
  ): Promise<boolean> {
    const row = await this.requireRepo().findOne({
      where: { tenant_id: tenantId, artist_id: artistId, platform } as never,
    });
    if (!row || row.sync_status !== 'pending') return false;
    return Date.now() - row.updated_at.getTime() < windowMs;
  }

  async upsertPending(input: {
    tenantId: string;
    artistId: string;
    platform: SocialPlatform;
    externalId?: string | null;
    externalUrl?: string | null;
  }): Promise<SocialPlatformProfileSnapshot> {
    const repo = this.requireRepo();
    const now = new Date();
    await repo
      .createQueryBuilder()
      .insert()
      .into(ArtistPlatformProfileEntity)
      .values({
        tenant_id: input.tenantId,
        artist_id: input.artistId,
        platform: input.platform,
        external_id: input.externalId ?? null,
        external_url: input.externalUrl ?? null,
        sync_status: 'pending',
        last_error: null,
        raw_payload: {},
        updated_at: now,
      } as never)
      .orUpdate(
        ['external_id', 'external_url', 'sync_status', 'last_error', 'updated_at'],
        ['tenant_id', 'artist_id', 'platform'],
      )
      .execute();

    return (await this.findByArtistAndPlatform(input.tenantId, input.artistId, input.platform))!;
  }

  async upsertSuccess(snapshot: SocialPlatformProfileSnapshot): Promise<SocialPlatformProfileSnapshot> {
    const repo = this.requireRepo();
    const now = new Date();
    await repo
      .createQueryBuilder()
      .insert()
      .into(ArtistPlatformProfileEntity)
      .values({
        ...snapshot,
        sync_status: 'success',
        last_error: null,
        last_synced_at: now,
        updated_at: now,
      } as never)
      .orUpdate(
        [
          'external_id',
          'external_url',
          'display_name',
          'username',
          'profile_url',
          'image_url',
          'followers',
          'subscribers',
          'monthly_listeners',
          'popularity',
          'total_views',
          'total_videos',
          'total_tracks',
          'total_albums',
          'raw_payload',
          'sync_status',
          'last_synced_at',
          'last_error',
          'updated_at',
        ],
        ['tenant_id', 'artist_id', 'platform'],
      )
      .execute();

    return (await this.findByArtistAndPlatform(snapshot.tenant_id, snapshot.artist_id, snapshot.platform))!;
  }

  async markFailed(input: {
    tenantId: string;
    artistId: string;
    platform: SocialPlatform;
    externalId?: string | null;
    externalUrl?: string | null;
    error: string;
  }): Promise<SocialPlatformProfileSnapshot> {
    const repo = this.requireRepo();
    const now = new Date();
    await repo
      .createQueryBuilder()
      .insert()
      .into(ArtistPlatformProfileEntity)
      .values({
        tenant_id: input.tenantId,
        artist_id: input.artistId,
        platform: input.platform,
        external_id: input.externalId ?? null,
        external_url: input.externalUrl ?? null,
        sync_status: 'failed',
        last_error: input.error.slice(0, 2000),
        last_synced_at: now,
        updated_at: now,
      } as never)
      .orUpdate(
        ['external_id', 'external_url', 'sync_status', 'last_error', 'last_synced_at', 'updated_at'],
        ['tenant_id', 'artist_id', 'platform'],
      )
      .execute();

    return (await this.findByArtistAndPlatform(input.tenantId, input.artistId, input.platform))!;
  }
}
