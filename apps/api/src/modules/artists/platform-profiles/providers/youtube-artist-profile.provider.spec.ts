import { ConfigService } from '@nestjs/config';
import { YouTubeArtistProfileProvider } from './youtube-artist-profile.provider';
import type { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';

function configWithKey(): ConfigService {
  return { get: () => 'fake-youtube-key' } as unknown as ConfigService;
}

function channelStatisticsResponse(viewCount: string, videoCount: string) {
  return {
    ok: true,
    json: async () => ({ items: [{ statistics: { viewCount, videoCount } }] }),
  } as Response;
}

describe('YouTubeArtistProfileProvider.resolve', () => {
  const channelId = 'UCabcdefghijklmnopqrstuv';
  let fetchSpy: jest.SpyInstance;

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it('A) subscribers vem da Soundcharts, total_views/total_videos vêm da YouTube Data API', async () => {
    const soundcharts = {
      resolveArtistByPlatform: jest.fn().mockResolvedValue('uuid-1'),
      getYouTubeSubscribers: jest.fn().mockResolvedValue({ value: 15400, observedAt: new Date('2026-08-19T00:00:00Z'), source: 'soundcharts' }),
      isConfigured: jest.fn().mockReturnValue(true),
    } as unknown as SoundchartsService;
    const provider = new YouTubeArtistProfileProvider(configWithKey(), soundcharts);

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(channelStatisticsResponse('123456', '77'));

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: channelId,
      externalUrl: null,
    });

    expect(snapshot.subscribers).toBe(15400);
    expect(snapshot.total_views).toBe('123456');
    expect(snapshot.total_videos).toBe(77);
    expect(soundcharts.getYouTubeSubscribers).toHaveBeenCalledWith('uuid-1');
    // A chamada de estatísticas usa `statistics` (nunca `snippet`) e nunca pede subscriberCount.
    const fetchedUrl = fetchSpy.mock.calls[0][0] as string;
    expect(fetchedUrl).toContain('part=statistics');
  });

  it('B) subscriberCount devolvido pela YouTube API NUNCA substitui o valor da Soundcharts', async () => {
    const soundcharts = {
      resolveArtistByPlatform: jest.fn().mockResolvedValue('uuid-1'),
      getYouTubeSubscribers: jest.fn().mockResolvedValue({ value: 15400, observedAt: new Date(), source: 'soundcharts' }),
      isConfigured: jest.fn().mockReturnValue(true),
    } as unknown as SoundchartsService;
    const provider = new YouTubeArtistProfileProvider(configWithKey(), soundcharts);

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ statistics: { viewCount: '1', videoCount: '1', subscriberCount: '999999999' } }] }),
    } as Response);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: channelId,
      externalUrl: null,
    });

    expect(snapshot.subscribers).toBe(15400);
    expect(snapshot.subscribers).not.toBe(999999999);
  });

  it('estatísticas indisponíveis (YouTube API falha): total_views/total_videos ficam null, subscribers é preservado', async () => {
    const soundcharts = {
      resolveArtistByPlatform: jest.fn().mockResolvedValue('uuid-1'),
      getYouTubeSubscribers: jest.fn().mockResolvedValue({ value: 15400, observedAt: new Date(), source: 'soundcharts' }),
      isConfigured: jest.fn().mockReturnValue(true),
    } as unknown as SoundchartsService;
    const provider = new YouTubeArtistProfileProvider(configWithKey(), soundcharts);

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 403, json: async () => ({}) } as Response);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: channelId,
      externalUrl: null,
    });

    expect(snapshot.subscribers).toBe(15400);
    expect(snapshot.total_views).toBeNull();
    expect(snapshot.total_videos).toBeNull();
    expect(snapshot.sync_status).toBe('success');
  });

  it('14) FASE 1.3 — UUID do próprio handle DIVERGE do canônico (Spotify/Deezer): resolução exata pelo channelId cadastrado ainda é aceita; divergência vira só diagnóstico', async () => {
    const soundcharts = {
      resolveArtistByPlatform: jest.fn().mockResolvedValue('youtube-own-uuid'),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [] }),
      getYouTubeSubscribers: jest.fn().mockResolvedValue({ value: 555555, observedAt: new Date(), source: 'soundcharts' }),
      isConfigured: jest.fn().mockReturnValue(true),
    } as unknown as SoundchartsService;
    const provider = new YouTubeArtistProfileProvider(configWithKey(), soundcharts);
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(channelStatisticsResponse('1000', '10'));

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: channelId,
      externalUrl: null,
      canonicalUrls: {
        spotifyUrl: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH',
        deezerUrl: 'https://www.deezer.com/artist/9635624',
      },
    });

    expect(soundcharts.getYouTubeSubscribers).toHaveBeenCalledWith('youtube-own-uuid');
    expect(snapshot.subscribers).toBe(555555);
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
    expect(snapshot.raw_payload.cross_platform_status).toBe('CROSS_PLATFORM_DIVERGENT');
  });
});

describe('YouTubeArtistProfileProvider.parseRef', () => {
  const provider = new YouTubeArtistProfileProvider(new ConfigService(), {} as never);

  it('parses a /channel/UC… URL into a channel id', () => {
    expect(provider.parseRef('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv'))
      .toEqual({ kind: 'id', value: 'UCabcdefghijklmnopqrstuv' });
  });

  it('parses a bare UC… id', () => {
    expect(provider.parseRef('UCabcdefghijklmnopqrstuv'))
      .toEqual({ kind: 'id', value: 'UCabcdefghijklmnopqrstuv' });
  });

  it('parses an @handle URL', () => {
    expect(provider.parseRef('https://youtube.com/@MusicOS360'))
      .toEqual({ kind: 'handle', value: 'MusicOS360' });
  });

  it('parses a bare @handle (no URL)', () => {
    expect(provider.parseRef('@MusicOS360'))
      .toEqual({ kind: 'handle', value: 'MusicOS360' });
  });

  it('parses a legacy /user/NAME URL', () => {
    expect(provider.parseRef('https://www.youtube.com/user/SomeArtist'))
      .toEqual({ kind: 'username', value: 'SomeArtist' });
  });

  it('parses a custom /c/NAME URL', () => {
    expect(provider.parseRef('https://www.youtube.com/c/SomeArtist'))
      .toEqual({ kind: 'custom', value: 'SomeArtist' });
  });

  it('parses a bare legacy custom name', () => {
    expect(provider.parseRef('https://www.youtube.com/SomeArtist'))
      .toEqual({ kind: 'custom', value: 'SomeArtist' });
  });

  it('handles trailing slashes and query strings', () => {
    expect(provider.parseRef('https://www.youtube.com/@MusicOS360/videos?x=1'))
      .toEqual({ kind: 'handle', value: 'MusicOS360' });
  });

  it('returns null for empty/invalid input', () => {
    expect(provider.parseRef('')).toBeNull();
    expect(provider.parseRef('   ')).toBeNull();
    expect(provider.parseRef(null as unknown as string)).toBeNull();
  });
});
