import { SoundchartsService } from '../../integrations/soundcharts/soundcharts.service';
import { buildCanonicalCandidates, resolveCanonicalUuidForProvider } from './soundcharts-canonical-candidates.util';

const URLS = {
  spotifyUrl: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH',
  youtubeUrl: 'https://www.youtube.com/channel/UCiGm_E4ZwYSHV3bcW1pnSeQ',
  deezerUrl: 'https://www.deezer.com/artist/9635624',
  soundcloudUrl: 'https://soundcloud.com/billieeilish',
};

describe('buildCanonicalCandidates', () => {
  it('extrai o id de cada plataforma na ordem spotify → youtube → deezer → soundcloud', () => {
    expect(buildCanonicalCandidates(URLS)).toEqual([
      { platform: 'spotify', externalId: '6qqNVTkY8uBg9cP3Jd7DAH' },
      { platform: 'youtube', externalId: 'UCiGm_E4ZwYSHV3bcW1pnSeQ' },
      { platform: 'deezer', externalId: '9635624' },
      { platform: 'soundcloud', externalId: 'billieeilish' },
    ]);
  });

  it('externalId null quando a URL da plataforma está ausente', () => {
    expect(buildCanonicalCandidates({})).toEqual([
      { platform: 'spotify', externalId: null },
      { platform: 'youtube', externalId: null },
      { platform: 'deezer', externalId: null },
      { platform: 'soundcloud', externalId: null },
    ]);
  });
});

describe('resolveCanonicalUuidForProvider — reuso de UUID entre plataformas (Soundcharts 06)', () => {
  it('Spotify resolve UUID → Instagram usa o mesmo UUID, sem consultar YouTube/Deezer/SoundCloud/handle próprio', async () => {
    const soundcharts = new SoundchartsService();
    soundcharts.resolveArtistByPlatform = jest.fn(async (platform: string) => {
      if (platform === 'spotify') return 'sc-uuid-1';
      throw new Error(`não deveria consultar ${platform}`);
    }) as never;

    const uuid = await resolveCanonicalUuidForProvider(soundcharts, URLS, 'instagram', 'billieeilish');

    expect(uuid).toBe('sc-uuid-1');
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledTimes(1);
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('spotify', '6qqNVTkY8uBg9cP3Jd7DAH');
  });

  it('Spotify resolve UUID → TikTok usa o mesmo UUID, sem consultar o handle próprio', async () => {
    const soundcharts = new SoundchartsService();
    soundcharts.resolveArtistByPlatform = jest.fn(async (platform: string) => {
      if (platform === 'spotify') return 'sc-uuid-1';
      throw new Error(`não deveria consultar ${platform}`);
    }) as never;

    const uuid = await resolveCanonicalUuidForProvider(soundcharts, URLS, 'tiktok', 'billieeilish');

    expect(uuid).toBe('sc-uuid-1');
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledTimes(1);
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('spotify', '6qqNVTkY8uBg9cP3Jd7DAH');
  });

  it('Spotify falha → YouTube resolve (Deezer/SoundCloud/handle próprio não são consultados)', async () => {
    const soundcharts = new SoundchartsService();
    const attempted: string[] = [];
    soundcharts.resolveArtistByPlatform = jest.fn(async (platform: string) => {
      attempted.push(platform);
      if (platform === 'spotify') throw new Error('não encontrado');
      if (platform === 'youtube') return 'sc-uuid-2';
      throw new Error(`não deveria consultar ${platform}`);
    }) as never;

    const uuid = await resolveCanonicalUuidForProvider(soundcharts, URLS, 'instagram', 'billieeilish');

    expect(uuid).toBe('sc-uuid-2');
    expect(attempted).toEqual(['spotify', 'youtube']);
  });

  it('Spotify e YouTube falham → Deezer resolve (SoundCloud/handle próprio não são consultados)', async () => {
    const soundcharts = new SoundchartsService();
    const attempted: string[] = [];
    soundcharts.resolveArtistByPlatform = jest.fn(async (platform: string) => {
      attempted.push(platform);
      if (platform === 'deezer') return 'sc-uuid-3';
      throw new Error('não encontrado');
    }) as never;

    const uuid = await resolveCanonicalUuidForProvider(soundcharts, URLS, 'tiktok', 'billieeilish');

    expect(uuid).toBe('sc-uuid-3');
    expect(attempted).toEqual(['spotify', 'youtube', 'deezer']);
  });

  it('todas as 4 canônicas falham → ownPlatform (handle próprio) é o fallback final', async () => {
    const soundcharts = new SoundchartsService();
    const attempted: string[] = [];
    soundcharts.resolveArtistByPlatform = jest.fn(async (platform: string) => {
      attempted.push(platform);
      if (platform === 'instagram') return 'sc-uuid-own';
      throw new Error('não encontrado');
    }) as never;

    const uuid = await resolveCanonicalUuidForProvider(soundcharts, URLS, 'instagram', 'billieeilish');

    expect(uuid).toBe('sc-uuid-own');
    expect(attempted).toEqual(['spotify', 'youtube', 'deezer', 'soundcloud', 'instagram']);
  });

  it('sem nenhuma URL canônica cadastrada, resolve direto pelo handle próprio', async () => {
    const soundcharts = new SoundchartsService();
    soundcharts.resolveArtistByPlatform = jest.fn(async (platform: string) => {
      if (platform === 'tiktok') return 'sc-uuid-own';
      throw new Error(`não deveria consultar ${platform}`);
    }) as never;

    const uuid = await resolveCanonicalUuidForProvider(soundcharts, undefined, 'tiktok', 'billieeilish');

    expect(uuid).toBe('sc-uuid-own');
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledTimes(1);
    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('tiktok', 'billieeilish');
  });

  it('todas as tentativas (inclusive ownPlatform) falham → erro agregado, sem UUID inventado', async () => {
    const soundcharts = new SoundchartsService();
    soundcharts.resolveArtistByPlatform = jest.fn(async () => { throw new Error('não encontrado'); }) as never;

    await expect(
      resolveCanonicalUuidForProvider(soundcharts, URLS, 'instagram', 'billieeilish'),
    ).rejects.toThrow(/não foi possível resolver o artista/);
  });
});
