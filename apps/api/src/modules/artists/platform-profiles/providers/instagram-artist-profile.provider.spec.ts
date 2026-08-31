import { InstagramArtistProfileProvider } from './instagram-artist-profile.provider';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import type { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';

const CANONICAL_URLS = {
  spotifyUrl: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH',
};

describe('InstagramArtistProfileProvider.resolve (Fase 1.3 — handle cadastrado é PRIMÁRIO, canônico é fallback secundário)', () => {
  it('1) handle cadastrado resolve diretamente (exato, primário): followers persistidos, resolution=own_handle, VERIFIED_EXACT — nem consulta a cadeia canônica', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockResolvedValue('own-uuid'),
      resolveCanonicalArtistUuid: jest.fn(),
      getInstagramFollowers: jest.fn().mockResolvedValue({
        value: 123456,
        observedAt: new Date(),
        source: 'soundcharts',
        endpoint: '/x',
        field: 'y',
      }),
    } as unknown as SoundchartsService;
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayofc',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('instagram', 'djstayofc');
    expect(soundcharts.resolveCanonicalArtistUuid).not.toHaveBeenCalled();
    expect(soundcharts.getInstagramFollowers).toHaveBeenCalledWith('own-uuid');
    expect(snapshot.followers).toBe(123456);
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.resolution).toBe('own_handle');
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
  });

  it('2) handle cadastrado não indexado standalone (404): cai para o canônico, registry CONFIRMA o handle → ainda VERIFIED_EXACT', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({
        raw: {},
        identifiers: [{ platform: 'instagram', identifier: 'djstayofc' }],
      }),
      getInstagramFollowers: jest.fn().mockResolvedValue({ value: 9999, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayofc',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.getInstagramFollowers).toHaveBeenCalledWith('canonical-uuid');
    expect(snapshot.followers).toBe(9999);
    expect(snapshot.raw_payload.resolution).toBe('canonical');
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
  });

  it('3) handle cadastrado não indexado, canônico tem dado mas registry NÃO lista Instagram: dado ainda é usado, mas rotulado INSUFFICIENT_EVIDENCE (nunca VERIFIED_EXACT sem prova)', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [] }),
      getInstagramFollowers: jest.fn().mockResolvedValue({ value: 4242, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayofc',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(snapshot.followers).toBe(4242);
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.resolution).toBe('canonical');
    expect(snapshot.raw_payload.primary_identity_status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('4) handle cadastrado não indexado, registry do canônico aponta OUTRA conta de Instagram: rejeita o dado do canônico — nunca herda audiência de outra conta', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({
        raw: {},
        identifiers: [{ platform: 'instagram', identifier: 'outra-conta-do-canonico' }],
      }),
      getInstagramFollowers: jest.fn(),
    } as unknown as SoundchartsService;
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayofc',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    // Nunca busca a métrica do canônico quando o registry aponta outra conta.
    expect(soundcharts.getInstagramFollowers).not.toHaveBeenCalled();
    expect(snapshot.followers).toBeNull();
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.primary_identity_status).toBe('PROFILE_NOT_FOUND');
    expect(snapshot.raw_payload.source).not.toBe('dev_mock');
  });

  it('5) conta não indexada em nenhum caminho (404 nos dois): followers=null, sync_status=success (NUNCA "Erro"), sem mock (USE_MOCK off)', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      // Own-handle 404 (não indexado standalone); canônico resolve via Spotify,
      // mas essa entidade também não tem Instagram indexado (404).
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [] }),
      getInstagramFollowers: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
    } as unknown as SoundchartsService;
    const provider = new InstagramArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1',
      artistId: 'a1',
      externalId: 'djstayofc',
      externalUrl: null,
      canonicalUrls: CANONICAL_URLS,
    });

    expect(snapshot.followers).toBeNull();
    expect(snapshot.sync_status).toBe('success');
    expect(snapshot.raw_payload.primary_identity_status).toBe('PROFILE_NOT_FOUND');
    expect(snapshot.raw_payload.source).toBe('soundcharts');
    expect(snapshot.raw_payload.source).not.toBe('dev_mock');
  });

  it('6) username inválido lança erro antes de qualquer chamada de rede', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn(),
    } as unknown as SoundchartsService;
    const provider = new InstagramArtistProfileProvider(soundcharts);

    await expect(
      provider.resolve({ tenantId: 't1', artistId: 'a1', externalId: null, externalUrl: 'https://not-instagram.com/x', canonicalUrls: CANONICAL_URLS }),
    ).rejects.toThrow('Instagram username ausente ou inválido');
    expect(soundcharts.resolveArtistByPlatform).not.toHaveBeenCalled();
  });

  describe('normalização do handle cadastrado (o identifier EXATO usado na resolução primária)', () => {
    const cases: Array<[string, string, string]> = [
      ['@handle', '@djstayofc', 'djstayofc'],
      ['URL completa', 'https://www.instagram.com/djstayofc', 'djstayofc'],
      ['URL com trailing slash', 'https://instagram.com/djstayofc/', 'djstayofc'],
      ['URL com query params', 'https://www.instagram.com/djstayofc/?hl=pt-br', 'djstayofc'],
    ];

    it.each(cases)('%s normaliza para o identifier exato "%s" → "%s"', async (_label, input, expected) => {
      const soundcharts = {
        isConfigured: jest.fn().mockReturnValue(true),
        resolveArtistByPlatform: jest.fn().mockResolvedValue('own-uuid'),
        getInstagramFollowers: jest.fn().mockResolvedValue({ value: 1, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
      } as unknown as SoundchartsService;
      const provider = new InstagramArtistProfileProvider(soundcharts);
      const isUrl = /^https?:\/\//.test(input);

      const snapshot = await provider.resolve({
        tenantId: 't1', artistId: 'a1',
        externalId: isUrl ? null : input,
        externalUrl: isUrl ? input : null,
        canonicalUrls: CANONICAL_URLS,
      });

      expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('instagram', expected);
      expect(snapshot.username).toBe(expected);
    });

    it('URL malformada (host errado) é rejeitada, nunca tratada como handle', async () => {
      const soundcharts = {
        isConfigured: jest.fn().mockReturnValue(true),
        resolveArtistByPlatform: jest.fn(),
      } as unknown as SoundchartsService;
      const provider = new InstagramArtistProfileProvider(soundcharts);

      await expect(
        provider.resolve({ tenantId: 't1', artistId: 'a1', externalId: null, externalUrl: 'https://twitter.com/djstayofc', canonicalUrls: CANONICAL_URLS }),
      ).rejects.toThrow('Instagram username ausente ou inválido');
    });

    it('identifier vazio é rejeitado', async () => {
      const soundcharts = {
        isConfigured: jest.fn().mockReturnValue(true),
        resolveArtistByPlatform: jest.fn(),
      } as unknown as SoundchartsService;
      const provider = new InstagramArtistProfileProvider(soundcharts);

      await expect(
        provider.resolve({ tenantId: 't1', artistId: 'a1', externalId: null, externalUrl: '', canonicalUrls: CANONICAL_URLS }),
      ).rejects.toThrow('Instagram username ausente ou inválido');
    });
  });
});
