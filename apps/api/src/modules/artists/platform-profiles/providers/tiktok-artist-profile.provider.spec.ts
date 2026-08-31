import { TikTokArtistProfileProvider } from './tiktok-artist-profile.provider';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import type { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';

const CANONICAL_URLS = {
  spotifyUrl: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH',
};

describe('TikTokArtistProfileProvider.resolve (Fase 1.3 — handle cadastrado é PRIMÁRIO, canônico é fallback secundário)', () => {
  it('1) handle cadastrado resolve diretamente (exato, primário): followers persistidos, resolution=own_handle, VERIFIED_EXACT — nem consulta a cadeia canônica', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockResolvedValue('own-uuid'),
      resolveCanonicalArtistUuid: jest.fn(),
      getTikTokFollowers: jest.fn().mockResolvedValue({
        value: 654321,
        observedAt: new Date(),
        source: 'soundcharts',
        endpoint: '/x',
        field: 'y',
      }),
    } as unknown as SoundchartsService;
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayoficial',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('tiktok', 'djstayoficial');
    expect(soundcharts.resolveCanonicalArtistUuid).not.toHaveBeenCalled();
    expect(snapshot.followers).toBe(654321);
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.resolution).toBe('own_handle');
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
  });

  it('@handle e URL normalizam para o mesmo username', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockResolvedValue('own-uuid'),
      getTikTokFollowers: jest.fn().mockResolvedValue({ value: 1, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const byUrl = await provider.resolve({
      tenantId: 't1', artistId: 'a1', externalId: null,
      externalUrl: 'https://www.tiktok.com/@djstayoficial?lang=pt', canonicalUrls: CANONICAL_URLS,
    });
    expect(byUrl.username).toBe('djstayoficial');
  });

  it('2) handle cadastrado não indexado standalone (404): cai para o canônico, registry CONFIRMA o handle → ainda VERIFIED_EXACT', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({
        raw: {},
        identifiers: [{ platform: 'tiktok', identifier: 'djstayoficial' }],
      }),
      getTikTokFollowers: jest.fn().mockResolvedValue({ value: 8888, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayoficial',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.getTikTokFollowers).toHaveBeenCalledWith('canonical-uuid');
    expect(snapshot.followers).toBe(8888);
    expect(snapshot.raw_payload.resolution).toBe('canonical');
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
  });

  it('3) handle cadastrado não indexado, canônico tem dado mas registry NÃO lista TikTok: dado ainda é usado, mas rotulado INSUFFICIENT_EVIDENCE (nunca VERIFIED_EXACT sem prova)', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [] }),
      getTikTokFollowers: jest.fn().mockResolvedValue({ value: 4242, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayoficial',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(snapshot.followers).toBe(4242);
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.resolution).toBe('canonical');
    expect(snapshot.raw_payload.primary_identity_status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('4) handle cadastrado não indexado, registry do canônico aponta OUTRA conta de TikTok: rejeita o dado do canônico — nunca herda audiência de outra conta', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({
        raw: {},
        identifiers: [{ platform: 'tiktok', identifier: 'outra-conta-do-canonico' }],
      }),
      getTikTokFollowers: jest.fn(),
    } as unknown as SoundchartsService;
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayoficial',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.getTikTokFollowers).not.toHaveBeenCalled();
    expect(snapshot.followers).toBeNull();
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.primary_identity_status).toBe('PROFILE_NOT_FOUND');
    expect(snapshot.raw_payload.source).not.toBe('dev_mock');
  });

  it('5) conta não indexada em nenhum caminho (404 nos dois): followers=null, sync_status=success (NUNCA "Erro"), sem mock (USE_MOCK off)', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      // Own-handle 404 (não indexado standalone); canônico resolve via Spotify,
      // mas essa entidade também não tem TikTok indexado (404).
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [] }),
      getTikTokFollowers: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
    } as unknown as SoundchartsService;
    const provider = new TikTokArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayoficial',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(snapshot.followers).toBeNull();
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.primary_identity_status).toBe('PROFILE_NOT_FOUND');
    expect(snapshot.raw_payload.source).toBe('soundcharts');
    expect(snapshot.raw_payload.source).not.toBe('dev_mock');
  });

  describe('normalização do handle cadastrado (o identifier EXATO usado na resolução primária)', () => {
    const cases: Array<[string, string, string]> = [
      ['@handle', '@djstayoficial', 'djstayoficial'],
      ['URL completa', 'https://www.tiktok.com/@djstayoficial', 'djstayoficial'],
      ['URL com trailing slash', 'https://www.tiktok.com/@djstayoficial/', 'djstayoficial'],
      ['URL com query params', 'https://www.tiktok.com/@djstayoficial?lang=pt', 'djstayoficial'],
    ];

    it.each(cases)('%s normaliza para o identifier exato "%s" → "%s"', async (_label, input, expected) => {
      const soundcharts = {
        isConfigured: jest.fn().mockReturnValue(true),
        resolveArtistByPlatform: jest.fn().mockResolvedValue('own-uuid'),
        getTikTokFollowers: jest.fn().mockResolvedValue({ value: 1, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
      } as unknown as SoundchartsService;
      const provider = new TikTokArtistProfileProvider(soundcharts);
      const isUrl = /^https?:\/\//.test(input);

      const snapshot = await provider.resolve({
        tenantId: 't1', artistId: 'a1',
        externalId: isUrl ? null : input,
        externalUrl: isUrl ? input : null,
        canonicalUrls: CANONICAL_URLS,
      });

      expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('tiktok', expected);
      expect(snapshot.username).toBe(expected);
    });

    it('URL malformada (host errado) é rejeitada, nunca tratada como handle', async () => {
      const soundcharts = {
        isConfigured: jest.fn().mockReturnValue(true),
        resolveArtistByPlatform: jest.fn(),
      } as unknown as SoundchartsService;
      const provider = new TikTokArtistProfileProvider(soundcharts);

      await expect(
        provider.resolve({ tenantId: 't1', artistId: 'a1', externalId: null, externalUrl: 'https://twitter.com/djstayoficial', canonicalUrls: CANONICAL_URLS }),
      ).rejects.toThrow('TikTok username ausente ou inválido');
    });

    it('identifier vazio é rejeitado', async () => {
      const soundcharts = {
        isConfigured: jest.fn().mockReturnValue(true),
        resolveArtistByPlatform: jest.fn(),
      } as unknown as SoundchartsService;
      const provider = new TikTokArtistProfileProvider(soundcharts);

      await expect(
        provider.resolve({ tenantId: 't1', artistId: 'a1', externalId: null, externalUrl: '', canonicalUrls: CANONICAL_URLS }),
      ).rejects.toThrow('TikTok username ausente ou inválido');
    });
  });
});
