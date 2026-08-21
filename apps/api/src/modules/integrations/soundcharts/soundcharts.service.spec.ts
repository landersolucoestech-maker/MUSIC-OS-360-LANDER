import { SoundchartsService } from './soundcharts.service';
import {
  SoundchartsNotConfiguredError,
  SoundchartsNotFoundError,
  SoundchartsRateLimitError,
} from './soundcharts.errors';

const TOKEN_URL = 'https://account.soundcharts.com/oauth/token';

function tokenResponse(overrides: Partial<{ access_token: string; expires_in: number }> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'fake-token', token_type: 'bearer', expires_in: 900, ...overrides }),
  };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('SoundchartsService', () => {
  let service: SoundchartsService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env['SOUNDCHARTS_CLIENT_ID'] = 'test-client-id';
    process.env['SOUNDCHARTS_CLIENT_SECRET'] = 'test-client-secret';
    service = new SoundchartsService();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete process.env['SOUNDCHARTS_CLIENT_ID'];
    delete process.env['SOUNDCHARTS_CLIENT_SECRET'];
  });

  describe('autenticação e cache de token', () => {
    it('obtém um token via client_credentials (Basic auth ao endpoint de token)', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(200, { items: [{ date: '2026-08-18', followerCount: 100 }] }));

      await service.getInstagramFollowers('uuid-1');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(TOKEN_URL);
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>)['Authorization']).toMatch(/^Basic /);
      expect(init.body).toBe('grant_type=client_credentials');
    });

    it('reutiliza o token em cache enquanto ele ainda é válido (não pede um novo por chamada)', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(200, { items: [{ date: '2026-08-18', followerCount: 1 }] }))
        .mockResolvedValueOnce(jsonResponse(200, { items: [{ date: '2026-08-18', followerCount: 2 }] }));

      await service.getInstagramFollowers('uuid-1');
      await service.getTikTokFollowers('uuid-1');

      const tokenCalls = fetchMock.mock.calls.filter(([url]) => url === TOKEN_URL);
      expect(tokenCalls).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(3); // 1 token + 2 chamadas de dado
    });

    it('renova o token quando ele expira', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(200, { items: [{ date: '2026-08-18', followerCount: 1 }] }));
      await service.getInstagramFollowers('uuid-1');

      // Força a expiração sem depender de fake timers (sem convenção de clock injetável neste repo).
      (service as any).cachedToken.expiresAt = Date.now() - 1;

      fetchMock
        .mockResolvedValueOnce(tokenResponse({ access_token: 'fake-token-2' }))
        .mockResolvedValueOnce(jsonResponse(200, { items: [{ date: '2026-08-18', followerCount: 2 }] }));
      await service.getInstagramFollowers('uuid-1');

      const tokenCalls = fetchMock.mock.calls.filter(([url]) => url === TOKEN_URL);
      expect(tokenCalls).toHaveLength(2);
    });

    it('credencial ausente: lança SoundchartsNotConfiguredError e nunca chama fetch', async () => {
      delete process.env['SOUNDCHARTS_CLIENT_ID'];
      delete process.env['SOUNDCHARTS_CLIENT_SECRET'];

      await expect(service.getInstagramFollowers('uuid-1')).rejects.toBeInstanceOf(SoundchartsNotConfiguredError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Spotify monthly listeners', () => {
    it('usa exclusivamente /streaming/spotify/listening — nunca /audience/spotify', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(200, { items: [{ date: '2026-08-18', value: 100_900_923 }] }));

      const result = await service.getSpotifyMonthlyListeners('uuid-1');

      expect(result).toEqual({ value: 100_900_923, observedAt: new Date('2026-08-18'), source: 'soundcharts' });
      const dataCall = fetchMock.mock.calls.find(([url]) => url !== TOKEN_URL);
      expect(dataCall![0]).toContain('/streaming/spotify/listening');
      expect(dataCall![0]).not.toContain('/audience/spotify');
    });

    it('seleciona o item de data mais recente da série, independente da ordem do array', async () => {
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
        jsonResponse(200, {
          items: [
            { date: '2026-08-16', value: 1 },
            { date: '2026-08-18', value: 3 }, // mais recente no meio do array — não deve confiar em [0] nem em [length-1]
            { date: '2026-08-17', value: 2 },
          ],
        }),
      );

      const result = await service.getSpotifyMonthlyListeners('uuid-1');
      expect(result.value).toBe(3);
      expect(result.observedAt).toEqual(new Date('2026-08-18'));
    });
  });

  describe('followerCount das demais plataformas', () => {
    const cases: Array<[string, () => Promise<{ value: number }>]> = [
      ['instagram', () => service.getInstagramFollowers('uuid-1')],
      ['tiktok', () => service.getTikTokFollowers('uuid-1')],
      ['youtube', () => service.getYouTubeSubscribers('uuid-1')],
      ['deezer', () => service.getDeezerFans('uuid-1')],
      ['soundcloud', () => service.getSoundCloudFollowers('uuid-1')],
    ];

    it.each(cases)('%s: lê followerCount do item mais recente do endpoint /audience/%s', async (platform, call) => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(200, { items: [{ date: '2026-08-18', followerCount: 42_000 }] }));

      const result = await call();
      expect(result.value).toBe(42_000);
      const dataCall = fetchMock.mock.calls.find(([url]) => url !== TOKEN_URL);
      expect(dataCall![0]).toContain(`/audience/${platform}`);
    });
  });

  describe('erros HTTP', () => {
    it('404: lança SoundchartsNotFoundError', async () => {
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(404, { errors: [{ message: 'not found' }] }));
      await expect(service.getInstagramFollowers('uuid-1')).rejects.toBeInstanceOf(SoundchartsNotFoundError);
    });

    it('429: lança SoundchartsRateLimitError', async () => {
      fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(429, { errors: [{ message: 'rate limited' }] }));
      await expect(service.getInstagramFollowers('uuid-1')).rejects.toBeInstanceOf(SoundchartsRateLimitError);
    });
  });

  describe('resolução de artista e reuso de UUID (Soundcharts 06)', () => {
    it('resolveArtistByPlatform: cacheia o uuid por (platform, externalId) — segunda chamada não bate na rede', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(200, { uuid: 'sc-uuid-1' }));

      const first = await service.resolveArtistByPlatform('spotify', '6qqNVTkY8uBg9cP3Jd7DAH');
      const second = await service.resolveArtistByPlatform('spotify', '6qqNVTkY8uBg9cP3Jd7DAH');

      expect(first).toBe('sc-uuid-1');
      expect(second).toBe('sc-uuid-1');
      const resolveCalls = fetchMock.mock.calls.filter(([url]) => (url as string).includes('/artist/by-platform/'));
      expect(resolveCalls).toHaveLength(1); // dedup dentro da janela do cache — não repete a consulta pelo mesmo candidato
    });

    it('resolveCanonicalArtistUuid: usa o primeiro candidato que resolver e ignora os demais', async () => {
      const resolveSpy = jest.spyOn(service, 'resolveArtistByPlatform').mockImplementation(async (platform: string) => {
        if (platform === 'youtube') return 'sc-uuid-yt';
        throw new Error('não encontrado');
      });

      const uuid = await service.resolveCanonicalArtistUuid([
        { platform: 'spotify', externalId: null },
        { platform: 'youtube', externalId: 'UCiGm_E4ZwYSHV3bcW1pnSeQ' },
        { platform: 'deezer', externalId: '9635624' },
      ]);

      expect(uuid).toBe('sc-uuid-yt');
      expect(resolveSpy).toHaveBeenCalledTimes(1); // deezer nem chega a ser tentado
      resolveSpy.mockRestore();
    });
  });

  describe('Apple Music', () => {
    it('retorna NOT_SUPPORTED sem chamar a rede — nunca inventa um valor', () => {
      expect(service.getAppleMusicSupport()).toBe('NOT_SUPPORTED');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
