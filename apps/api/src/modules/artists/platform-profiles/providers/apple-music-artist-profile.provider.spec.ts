import { AppleMusicArtistProfileProvider } from './apple-music-artist-profile.provider';
import { SoundchartsNotFoundError } from '../../../integrations/soundcharts/soundcharts.errors';
import type { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';

const CANONICAL_URLS = {
  spotifyUrl: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH',
};

describe('AppleMusicArtistProfileProvider.resolve (Fase 1.3 — ID cadastrado é PRIMÁRIO, canônico é fallback secundário)', () => {
  it('1) Apple Music ID cadastrado resolve diretamente (exato, primário): playlist_count vem dessa entidade, VERIFIED_EXACT — nem consulta a cadeia canônica', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockResolvedValue('own-uuid'),
      resolveCanonicalArtistUuid: jest.fn(),
      getAppleMusicPlaylistCount: jest.fn().mockResolvedValue({ value: 12, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new AppleMusicArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1', artistId: 'a1', externalId: '1543163588', externalUrl: null, canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.resolveArtistByPlatform).toHaveBeenCalledWith('apple-music', '1543163588');
    expect(soundcharts.resolveCanonicalArtistUuid).not.toHaveBeenCalled();
    expect(soundcharts.getAppleMusicPlaylistCount).toHaveBeenCalledWith('own-uuid');
    expect(snapshot.raw_payload.playlist_count).toBe(12);
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
  });

  it('2) ID cadastrado não indexado standalone (404): cai para o canônico, registry CONFIRMA o ID → ainda VERIFIED_EXACT', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [{ platform: 'apple-music', identifier: '1543163588' }] }),
      getAppleMusicPlaylistCount: jest.fn().mockResolvedValue({ value: 7, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new AppleMusicArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1', artistId: 'a1', externalId: '1543163588', externalUrl: null, canonicalUrls: CANONICAL_URLS,
    });

    expect(soundcharts.getAppleMusicPlaylistCount).toHaveBeenCalledWith('canonical-uuid');
    expect(snapshot.raw_payload.playlist_count).toBe(7);
    expect(snapshot.raw_payload.primary_identity_status).toBe('VERIFIED_EXACT');
  });

  it('3) ID cadastrado não indexado, canônico não confirma no registry: dado ainda é usado, mas rotulado INSUFFICIENT_EVIDENCE', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
      resolveCanonicalArtistUuid: jest.fn().mockResolvedValue('canonical-uuid'),
      getArtistIdentifiers: jest.fn().mockResolvedValue({ raw: {}, identifiers: [] }),
      getAppleMusicPlaylistCount: jest.fn().mockResolvedValue({ value: 3, observedAt: new Date(), source: 'soundcharts', endpoint: '/x', field: 'y' }),
    } as unknown as SoundchartsService;
    const provider = new AppleMusicArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1', artistId: 'a1', externalId: '1543163588', externalUrl: null, canonicalUrls: CANONICAL_URLS,
    });

    expect(snapshot.raw_payload.playlist_count).toBe(3);
    expect(snapshot.raw_payload.primary_identity_status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('4) nenhuma playlist encontrada: playlist_count=null, sync_status=success (nunca "Erro")', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn().mockResolvedValue('own-uuid'),
      getAppleMusicPlaylistCount: jest.fn().mockRejectedValue(new SoundchartsNotFoundError('not found', 404)),
    } as unknown as SoundchartsService;
    const provider = new AppleMusicArtistProfileProvider(soundcharts);

    const snapshot = await provider.resolve({
      tenantId: 't1', artistId: 'a1', externalId: '1543163588', externalUrl: null, canonicalUrls: CANONICAL_URLS,
    });

    expect(snapshot.raw_payload.playlist_count).toBeNull();
    expect(snapshot.sync_status).toBe('success');
  });

  it('5) Apple Music id ausente/inválido lança erro antes de qualquer chamada de rede', async () => {
    const soundcharts = {
      isConfigured: jest.fn().mockReturnValue(true),
      resolveArtistByPlatform: jest.fn(),
    } as unknown as SoundchartsService;
    const provider = new AppleMusicArtistProfileProvider(soundcharts);

    await expect(
      provider.resolve({ tenantId: 't1', artistId: 'a1', externalId: null, externalUrl: 'https://not-apple-music.com/x', canonicalUrls: CANONICAL_URLS }),
    ).rejects.toThrow('Apple Music artist id ausente ou inválido');
    expect(soundcharts.resolveArtistByPlatform).not.toHaveBeenCalled();
  });
});
