import { SpotifyArtistProfileProvider } from './spotify-artist-profile.provider';

describe('SpotifyArtistProfileProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('extrai monthlyListeners da pagina publica e nao exige credenciais Spotify', async () => {
    delete process.env['SPOTIFY_CLIENT_ID'];
    delete process.env['SPOTIFY_CLIENT_SECRET'];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html><script>{"stats":{"monthlyListeners":123456}}</script></html>',
    } as Response);

    const provider = new SpotifyArtistProfileProvider();

    await expect(provider.isConfigured('tenant-1')).resolves.toBe(true);
    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalUrl: 'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
    });

    expect(snapshot.monthly_listeners).toBe(123456);
    expect(snapshot.platform).toBe('spotify');
    expect(snapshot.raw_payload).toEqual({
      source: 'spotify_public_artist_page',
      monthly_listeners: 123456,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
      expect.objectContaining({ redirect: 'follow' }),
    );
  });

  it('extrai monthlyListeners do initialState em base64', async () => {
    const payload = Buffer.from(
      JSON.stringify({ data: { artistUnion: { stats: { monthlyListeners: 987654 } } } }),
      'utf8',
    ).toString('base64');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => `<html><script id="initialState">${payload}</script></html>`,
    } as Response);

    const provider = new SpotifyArtistProfileProvider();
    const snapshot = await provider.resolve({
      tenantId: 'tenant-1',
      artistId: 'artist-1',
      externalId: '06HL4z0CvFAxyc27GXpf02',
    });

    expect(snapshot.monthly_listeners).toBe(987654);
  });

  it('falha explicitamente quando a pagina publica nao traz ouvintes mensais', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html><body>Spotify artist</body></html>',
    } as Response);

    const provider = new SpotifyArtistProfileProvider();

    await expect(
      provider.resolve({
        tenantId: 'tenant-1',
        artistId: 'artist-1',
        externalId: '06HL4z0CvFAxyc27GXpf02',
      }),
    ).rejects.toThrow('Spotify não expôs ouvintes mensais na página pública neste momento');
  });
});
