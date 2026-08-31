import { InstagramArtistProfileProvider } from './instagram-artist-profile.provider';
import { TikTokArtistProfileProvider } from './tiktok-artist-profile.provider';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import { isDevMockSocialMetricsEnabled, mockFollowersFor } from '../dev-social-metrics-mock';

/**
 * Instagram/TikTok em dev/local: quando a Soundcharts genuinamente não tem
 * conta social vinculada (404 real — confirmado contra a API, ver comentário
 * no topo dos providers), o card ficava "Indisponível" permanentemente,
 * mesmo com credenciais válidas, porque artistas sintéticos de seed nunca
 * estarão indexados na Soundcharts. Com USE_MOCK=true (flag já existente,
 * já bloqueada em staging/production por env.schema.ts) fora de
 * produção/staging, um fallback determinístico preenche o card para
 * demonstração/teste de layout — sempre depois que o dado real já foi
 * tentado e genuinamente não existe.
 */
function fakeSoundcharts(overrides: Partial<Record<keyof SoundchartsService, jest.Mock>> = {}) {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found')),
    resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('sc-uuid-1'),
    ...overrides,
  } as unknown as SoundchartsService;
}

describe('isDevMockSocialMetricsEnabled', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('false por padrão (USE_MOCK ausente)', () => {
    delete process.env['USE_MOCK'];
    process.env['NODE_ENV'] = 'development';
    expect(isDevMockSocialMetricsEnabled()).toBe(false);
  });

  it('true só com USE_MOCK=true E NODE_ENV=development', () => {
    process.env['USE_MOCK'] = 'true';
    process.env['NODE_ENV'] = 'development';
    expect(isDevMockSocialMetricsEnabled()).toBe(true);
  });

  it('nunca true em staging, mesmo com USE_MOCK=true', () => {
    process.env['USE_MOCK'] = 'true';
    process.env['NODE_ENV'] = 'staging';
    expect(isDevMockSocialMetricsEnabled()).toBe(false);
  });

  it('nunca true em production, mesmo com USE_MOCK=true', () => {
    process.env['USE_MOCK'] = 'true';
    process.env['NODE_ENV'] = 'production';
    expect(isDevMockSocialMetricsEnabled()).toBe(false);
  });
});

describe('mockFollowersFor', () => {
  it('é determinístico para o mesmo (artistId, platform)', () => {
    expect(mockFollowersFor('artist-1', 'instagram')).toBe(mockFollowersFor('artist-1', 'instagram'));
  });

  it('nunca retorna 0 e fica em uma faixa plausível', () => {
    const v = mockFollowersFor('artist-1', 'tiktok');
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(200_000);
  });

  it('artistas diferentes tendem a produzir valores diferentes', () => {
    expect(mockFollowersFor('artist-1', 'instagram')).not.toBe(mockFollowersFor('artist-2', 'instagram'));
  });
});

describe('Instagram/TikTok provider — fallback de dev quando Soundcharts não tem a conta', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('Instagram: USE_MOCK=false mantém "Indisponível" (followers null) — comportamento real preservado', async () => {
    delete process.env['USE_MOCK'];
    process.env['NODE_ENV'] = 'development';
    const getInstagramFollowers = jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found'));
    const soundcharts = fakeSoundcharts({ getInstagramFollowers });
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: 'djstay',
      externalUrl: null,
    });

    expect(snapshot.followers).toBeNull();
    expect(snapshot.sync_status).toBe('success');
    expect((snapshot.raw_payload as Record<string, unknown>)['source']).toBe('soundcharts');
  });

  it('Instagram: USE_MOCK=true em dev preenche followers com o fallback, marcado como dev_mock', async () => {
    process.env['USE_MOCK'] = 'true';
    process.env['NODE_ENV'] = 'development';
    const getInstagramFollowers = jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found'));
    const soundcharts = fakeSoundcharts({ getInstagramFollowers });
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: 'djstay',
      externalUrl: null,
    });

    expect(snapshot.followers).toBe(mockFollowersFor('artist-1', 'instagram'));
    expect(snapshot.sync_status).toBe('success');
    expect((snapshot.raw_payload as Record<string, unknown>)['source']).toBe('dev_mock');
  });

  it('Instagram: dado real da Soundcharts sempre vence o mock, mesmo com USE_MOCK=true', async () => {
    process.env['USE_MOCK'] = 'true';
    process.env['NODE_ENV'] = 'development';
    const getInstagramFollowers = jest.fn().mockResolvedValue({
      value: 124_221_841, observedAt: new Date('2026-08-18T00:00:00Z'), source: 'soundcharts' as const,
    });
    const soundcharts = fakeSoundcharts({ getInstagramFollowers });
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: 'billieeilish',
      externalUrl: null,
    });

    expect(snapshot.followers).toBe(124_221_841);
    expect((snapshot.raw_payload as Record<string, unknown>)['source']).toBe('soundcharts');
  });

  it('Instagram: USE_MOCK=true em production NUNCA ativa o fallback', async () => {
    process.env['USE_MOCK'] = 'true';
    process.env['NODE_ENV'] = 'production';
    const getInstagramFollowers = jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found'));
    const soundcharts = fakeSoundcharts({ getInstagramFollowers });
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: 'djstay',
      externalUrl: null,
    });

    expect(snapshot.followers).toBeNull();
    expect((snapshot.raw_payload as Record<string, unknown>)['source']).toBe('soundcharts');
  });

  it('TikTok: USE_MOCK=true em dev preenche followers com o fallback, marcado como dev_mock', async () => {
    process.env['USE_MOCK'] = 'true';
    process.env['NODE_ENV'] = 'development';
    const getTikTokFollowers = jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found'));
    const soundcharts = fakeSoundcharts({ getTikTokFollowers });
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: 'djstay',
      externalUrl: null,
    });

    expect(snapshot.followers).toBe(mockFollowersFor('artist-1', 'tiktok'));
    expect((snapshot.raw_payload as Record<string, unknown>)['source']).toBe('dev_mock');
  });
});
