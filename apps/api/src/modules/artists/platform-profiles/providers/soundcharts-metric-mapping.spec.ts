import { ConfigService } from '@nestjs/config';
import { SpotifyArtistProfileProvider } from './spotify-artist-profile.provider';
import { YouTubeArtistProfileProvider } from './youtube-artist-profile.provider';
import { DeezerArtistProfileProvider } from './deezer-artist-profile.provider';
import { SoundCloudArtistProfileProvider } from './soundcloud-artist-profile.provider';
import { InstagramArtistProfileProvider } from './instagram-artist-profile.provider';
import { TikTokArtistProfileProvider } from './tiktok-artist-profile.provider';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';

/**
 * Prova, plataforma a plataforma, que o card exibido é alimentado
 * exclusivamente pela Soundcharts — nenhum provider chama uma API de
 * plataforma própria (Spotify/YouTube/Deezer/SoundCloud) para o valor do
 * card, e nenhum injeta IntegrationBaseService/OAuth de tenant
 * (Soundcharts 05, item 10).
 */
function fakeSoundcharts(overrides: Partial<Record<keyof SoundchartsService, jest.Mock>> = {}) {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    resolveArtistByPlatform: jest.fn().mockResolvedValue('sc-uuid-1'),
    resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('sc-uuid-1'),
    ...overrides,
  } as unknown as SoundchartsService;
}

const metric = (value: number) => ({ value, observedAt: new Date('2026-08-18T00:00:00Z'), source: 'soundcharts' as const });

describe('Fonte única Soundcharts por card de métrica do artista', () => {
  it('Spotify: monthly_listeners vem de getSpotifyMonthlyListeners — nunca de followers', async () => {
    const getSpotifyMonthlyListeners = jest.fn().mockResolvedValue(metric(78_029_948));
    const soundcharts = fakeSoundcharts({ getSpotifyMonthlyListeners });
    const provider = new SpotifyArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: '6qqNVTkY8uBg9cP3Jd7DAH',
      externalUrl: null,
    });

    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('spotify', '6qqNVTkY8uBg9cP3Jd7DAH');
    expect(getSpotifyMonthlyListeners).toHaveBeenCalledWith('sc-uuid-1');
    expect(snapshot.monthly_listeners).toBe(78_029_948);
    expect(snapshot.followers).toBeNull();
  });

  it('Instagram: followers vem de getInstagramFollowers, uuid resolvido pelo handle CADASTRADO (primário, Fase 1.3 — cadeia canônica nem é consultada quando o handle resolve sozinho)', async () => {
    const getInstagramFollowers = jest.fn().mockResolvedValue(metric(124_221_841));
    const soundcharts = fakeSoundcharts({ getInstagramFollowers });
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: null,
      externalUrl: 'https://www.instagram.com/billieeilish',
      canonicalUrls: { spotifyUrl: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH' },
    });

    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('instagram', 'billieeilish');
    expect(soundcharts.resolveCanonicalArtistUuid).not.toHaveBeenCalled();
    expect(getInstagramFollowers).toHaveBeenCalledWith('sc-uuid-1');
    expect(snapshot.followers).toBe(124_221_841);
  });

  it('TikTok: followers vem de getTikTokFollowers, uuid resolvido pelo handle CADASTRADO (primário, Fase 1.3 — cadeia canônica nem é consultada quando o handle resolve sozinho)', async () => {
    const getTikTokFollowers = jest.fn().mockResolvedValue(metric(75_000_000));
    const soundcharts = fakeSoundcharts({ getTikTokFollowers });
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: null,
      externalUrl: 'https://www.tiktok.com/@billieeilish',
      canonicalUrls: { spotifyUrl: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH' },
    });

    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('tiktok', 'billieeilish');
    expect(soundcharts.resolveCanonicalArtistUuid).not.toHaveBeenCalled();
    expect(getTikTokFollowers).toHaveBeenCalledWith('sc-uuid-1');
    expect(snapshot.followers).toBe(75_000_000);
  });

  it('YouTube: subscribers vem exclusivamente de getYouTubeSubscribers — a YouTube Data API nunca sobrescreve esse valor', async () => {
    const getYouTubeSubscribers = jest.fn().mockResolvedValue(metric(58_500_000));
    const soundcharts = fakeSoundcharts({ getYouTubeSubscribers });
    const config = { get: jest.fn().mockReturnValue('fake-youtube-key') } as unknown as ConfigService;
    const provider = new YouTubeArtistProfileProvider(config, soundcharts);
    // Estatísticas (views/videos) vêm da YouTube Data API (Métricas 09 fase 2) — nunca subscriberCount.
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ statistics: { viewCount: '999999999', videoCount: '42', subscriberCount: '1' } }] }),
    } as Response);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: 'UCiGm_E4ZwYSHV3bcW1pnSeQ',
      externalUrl: null,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1); // 1 chamada: só para estatísticas (id já é UC…, sem resolução de canal)
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('youtube', 'UCiGm_E4ZwYSHV3bcW1pnSeQ');
    expect(getYouTubeSubscribers).toHaveBeenCalledWith('sc-uuid-1');
    expect(snapshot.subscribers).toBe(58_500_000); // Soundcharts, nunca o subscriberCount=1 da Data API
    expect(snapshot.total_views).toBe('999999999');
    expect(snapshot.total_videos).toBe(42);
    fetchSpy.mockRestore();
  });

  it('Deezer: followers (fãs) vem de getDeezerFans', async () => {
    const getDeezerFans = jest.fn().mockResolvedValue(metric(9_223_417));
    const soundcharts = fakeSoundcharts({ getDeezerFans });
    const provider = new DeezerArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: '9635624',
      externalUrl: null,
    });

    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('deezer', '9635624');
    expect(getDeezerFans).toHaveBeenCalledWith('sc-uuid-1');
    expect(snapshot.followers).toBe(9_223_417);
  });

  it('SoundCloud: followers vem de getSoundCloudFollowers — sem SOUNDCLOUD_CLIENT_ID', async () => {
    const getSoundCloudFollowers = jest.fn().mockResolvedValue(metric(3_892_132));
    const soundcharts = fakeSoundcharts({ getSoundCloudFollowers });
    const provider = new SoundCloudArtistProfileProvider(soundcharts);
    const fetchSpy = jest.spyOn(global, 'fetch');

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: null,
      externalUrl: 'https://soundcloud.com/billieeilish',
    });

    expect(fetchSpy).not.toHaveBeenCalled(); // nenhuma chamada direta à SoundCloud API/OAuth
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('soundcloud', 'billieeilish');
    expect(getSoundCloudFollowers).toHaveBeenCalledWith('sc-uuid-1');
    expect(snapshot.followers).toBe(3_892_132);
    fetchSpy.mockRestore();
  });

  it('Apple Music: permanece NOT_SUPPORTED (nenhum provider de métrica de artista existe para Apple Music)', () => {
    expect(new SoundchartsService().getAppleMusicSupport()).toBe('NOT_SUPPORTED');
  });
});
