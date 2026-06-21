import { BadRequestException } from '@nestjs/common';
import { ArtistExternalProfileSyncService } from './artist-external-profile-sync.service';
import { ArtistPlatformSyncProcessor } from '../../../queues/processors/artist-platform-sync.processor';
import { ARTIST_PLATFORM_PROFILE_JOB_NAMES } from '../../../queues/queue.constants';

const payload = {
  tenant_id: 'tenant-1',
  artist_id: 'artist-1',
  platform: 'spotify' as const,
  external_id: '4NHQUGzhtTLFvgF5SZesLK',
  external_url: 'https://open.spotify.com/artist/4NHQUGzhtTLFvgF5SZesLK',
  requested_by: 'user-1',
  reason: 'manual' as const,
  idempotency_key: 'tenant-1:artist-1:spotify:manual:hash',
};

const SPOTIFY_ID = '4NHQUGzhtTLFvgF5SZesLK';
const YOUTUBE_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';

describe('ArtistExternalProfileSyncService', () => {
  it('enfileira sync manual de Spotify com pending tenant-scoped', async () => {
    const artists = {
      findById: jest.fn().mockResolvedValue({ id: 'artist-1', spotify_artist_id: null, youtube_channel_id: null }),
    };
    const profiles = {
      hasRecentPending: jest.fn().mockResolvedValue(false),
      upsertPending: jest.fn().mockResolvedValue({}),
    };
    const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new ArtistExternalProfileSyncService(artists as never, profiles as never, queue as never);

    const result = await service.enqueueManualSync({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      platform: 'spotify',
      requestedBy: 'user-1',
      profileUrl: `https://open.spotify.com/artist/${SPOTIFY_ID}`,
    });

    expect(profiles.upsertPending).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      platform: 'spotify',
      externalId: SPOTIFY_ID,
      externalUrl: `https://open.spotify.com/artist/${SPOTIFY_ID}`,
    }));
    expect(queue.add).toHaveBeenCalledWith(
      ARTIST_PLATFORM_PROFILE_JOB_NAMES.SYNC,
      expect.objectContaining({ tenant_id: 'tenant-1', artist_id: 'artist-1', platform: 'spotify' }),
      expect.objectContaining({ attempts: 3, jobId: expect.stringContaining('tenant-1:artist-1:spotify:manual:') }),
    );
    expect(result.enqueued).toEqual([{ platform: 'spotify', job_id: 'job-1' }]);
  });

  it('enfileira sync manual de YouTube', async () => {
    const artists = {
      findById: jest.fn().mockResolvedValue({ id: 'artist-1', spotify_artist_id: null, youtube_channel_id: null }),
    };
    const profiles = {
      hasRecentPending: jest.fn().mockResolvedValue(false),
      upsertPending: jest.fn().mockResolvedValue({}),
    };
    const queue = { add: jest.fn().mockResolvedValue({ id: 'job-2' }) };
    const service = new ArtistExternalProfileSyncService(artists as never, profiles as never, queue as never);

    const result = await service.enqueueManualSync({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      platform: 'youtube',
      requestedBy: 'user-1',
      profileUrl: `https://www.youtube.com/channel/${YOUTUBE_ID}`,
    });

    expect(queue.add).toHaveBeenCalledWith(
      ARTIST_PLATFORM_PROFILE_JOB_NAMES.SYNC,
      expect.objectContaining({
        platform: 'youtube',
        external_id: YOUTUBE_ID,
        external_url: `https://www.youtube.com/channel/${YOUTUBE_ID}`,
      }),
      expect.any(Object),
    );
    expect(result.enqueued).toEqual([{ platform: 'youtube', job_id: 'job-2' }]);
  });

  it('retorna skipped quando artista nao tem perfil externo da plataforma', async () => {
    const artists = {
      findById: jest.fn().mockResolvedValue({ id: 'artist-1', spotify_artist_id: null, youtube_channel_id: null }),
    };
    const service = new ArtistExternalProfileSyncService(
      artists as never,
      { hasRecentPending: jest.fn(), upsertPending: jest.fn() } as never,
      { add: jest.fn() } as never,
    );

    const result = await service.enqueueManualSync({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      platform: 'spotify',
      requestedBy: 'user-1',
    });

    expect(result).toEqual({
      artist_id: 'artist-1',
      enqueued: [],
      skipped: [{ platform: 'spotify', reason: 'missing_external_profile' }],
    });
  });

  it('rejeita plataforma fora da Fase 1', async () => {
    const service = new ArtistExternalProfileSyncService({} as never, {} as never, null);
    await expect(service.enqueueManualSync({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      platform: 'instagram',
      requestedBy: 'user-1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita link Spotify que nao seja de artista', async () => {
    const artists = {
      findById: jest.fn().mockResolvedValue({ id: 'artist-1', spotify_artist_id: null, youtube_channel_id: null }),
    };
    const service = new ArtistExternalProfileSyncService(
      artists as never,
      { hasRecentPending: jest.fn(), upsertPending: jest.fn() } as never,
      { add: jest.fn() } as never,
    );

    await expect(service.enqueueManualSync({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      platform: 'spotify',
      requestedBy: 'user-1',
      profileUrl: 'https://open.spotify.com/track/abc',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ArtistPlatformSyncProcessor', () => {
  it('persiste success usando artista carregado por tenant + id', async () => {
    const findOne = jest.fn().mockResolvedValue({
      id: 'artist-1',
      tenant_id: 'tenant-1',
      spotify_artist_id: 'spotify-current',
      youtube_channel_id: null,
    });
    const ds = { getRepository: jest.fn(() => ({ findOne })) };
    const profiles = {
      upsertPending: jest.fn().mockResolvedValue({}),
      upsertSuccess: jest.fn().mockResolvedValue({}),
      markFailed: jest.fn(),
    };
    const spotify = {
      platform: 'spotify',
      resolve: jest.fn().mockResolvedValue({
        tenant_id: 'tenant-1',
        artist_id: 'artist-1',
        platform: 'spotify',
        external_id: SPOTIFY_ID,
        sync_status: 'success',
      }),
    };
    const processor = new ArtistPlatformSyncProcessor(
      ds as never,
      profiles as never,
      spotify as never,
      { platform: 'youtube' } as never,
    );

    await processor.process({ name: ARTIST_PLATFORM_PROFILE_JOB_NAMES.SYNC, data: payload } as never);

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'artist-1', tenant_id: 'tenant-1', deleted_at: null },
    });
    expect(spotify.resolve).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: SPOTIFY_ID,
      externalUrl: `https://open.spotify.com/artist/${SPOTIFY_ID}`,
    }));
    expect(profiles.upsertSuccess).toHaveBeenCalled();
    expect(profiles.markFailed).not.toHaveBeenCalled();
  });

  it('persiste failed quando provider falha', async () => {
    const ds = {
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue({ id: 'artist-1', tenant_id: 'tenant-1', spotify_artist_id: 'spotify-1' }),
      })),
    };
    const profiles = {
      upsertPending: jest.fn().mockResolvedValue({}),
      upsertSuccess: jest.fn(),
      markFailed: jest.fn().mockResolvedValue({}),
    };
    const spotify = {
      platform: 'spotify',
      resolve: jest.fn().mockRejectedValue(new Error('Spotify API error: 429')),
    };
    const processor = new ArtistPlatformSyncProcessor(
      ds as never,
      profiles as never,
      spotify as never,
      { platform: 'youtube' } as never,
    );

    await processor.process({ name: ARTIST_PLATFORM_PROFILE_JOB_NAMES.SYNC, data: payload } as never);

    expect(profiles.upsertSuccess).not.toHaveBeenCalled();
    expect(profiles.markFailed).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      platform: 'spotify',
      error: 'Spotify API error: 429',
    }));
  });
});
