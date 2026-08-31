import { SpotifyArtistProfileProvider } from './spotify-artist-profile.provider';
import type { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';

const CANONICAL_URLS = {
  youtubeUrl: 'https://www.youtube.com/channel/UCiGm_E4ZwYSHV3bcW1pnSeQ',
  deezerUrl: 'https://www.deezer.com/artist/9635624',
};

describe('SpotifyArtistProfileProvider.resolve (Métricas Fase 1 — proteção contra conta homônima)', () => {
  it('10) UUID do próprio handle bate com o canônico independente: monthly_listeners é persistido normalmente', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockResolvedValue('same-uuid'),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('same-uuid'),
      getSpotifyMonthlyListeners: jest.fn().mockResolvedValue({
        value: 100900,
        observedAt: new Date(),
        source: 'soundcharts',
        endpoint: '/x',
        field: 'y',
      }),
    } as unknown as SoundchartsService;
    const provider = new SpotifyArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: '6qqNVTkY8uBg9cP3Jd7DAH',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(snapshot.monthly_listeners).toBe(100900);
    expect(snapshot.sync_status).toBe('success');
  });

  it('11) FASE 1.3 — UUID do próprio handle DIVERGE do canônico (YouTube/Deezer): resolução exata pelo artistId cadastrado ainda é aceita; divergência vira só diagnóstico', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockResolvedValue('spotify-own-uuid'),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [] }),
      getSpotifyMonthlyListeners: jest.fn().mockResolvedValue({ value: 999999, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new SpotifyArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'registered-id',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.getSpotifyMonthlyListeners).toHaveBeenCalledWith('spotify-own-uuid');
    expect(snapshot.monthly_listeners).toBe(999999);
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
    expect(snapshot.raw_payload.cross_platform_status).toBe('CROSS_PLATFORM_DIVERGENT');
    expect(snapshot.raw_payload.cross_platform_uuid).toBe('canonical-uuid');
  });
});
