import { parseSpotifyArtistId } from './spotify-url.util';

describe('parseSpotifyArtistId', () => {
  it('extrai o id de uma URL de artista válida', () => {
    expect(parseSpotifyArtistId('https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ')).toBe(
      '1Xyo4u8uXC1ZmMpatF05PJ',
    );
  });

  it('extrai o id ignorando query string (?si=...)', () => {
    expect(
      parseSpotifyArtistId('https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ?si=abc123'),
    ).toBe('1Xyo4u8uXC1ZmMpatF05PJ');
  });

  it('extrai o id com prefixo de locale (/intl-pt/artist/...)', () => {
    expect(
      parseSpotifyArtistId('https://open.spotify.com/intl-pt/artist/1Xyo4u8uXC1ZmMpatF05PJ'),
    ).toBe('1Xyo4u8uXC1ZmMpatF05PJ');
  });

  it('aceita um artist id/URI puro (sem barras)', () => {
    expect(parseSpotifyArtistId('1Xyo4u8uXC1ZmMpatF05PJ')).toBe('1Xyo4u8uXC1ZmMpatF05PJ');
  });

  it('rejeita URL de track', () => {
    expect(parseSpotifyArtistId('https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb')).toBeNull();
  });

  it('rejeita URL de album', () => {
    expect(parseSpotifyArtistId('https://open.spotify.com/album/6habFhsOp2NvshLv26DqMb')).toBeNull();
  });

  it('rejeita URL de playlist', () => {
    expect(parseSpotifyArtistId('https://open.spotify.com/playlist/6habFhsOp2NvshLv26DqMb')).toBeNull();
  });

  it('rejeita hostname diferente de open.spotify.com (CWE-20 — evil.com/artist/x)', () => {
    expect(parseSpotifyArtistId('https://evil.com/artist/1Xyo4u8uXC1ZmMpatF05PJ')).toBeNull();
  });

  it('rejeita hostname que apenas contém "spotify.com" como substring', () => {
    expect(parseSpotifyArtistId('https://evil.com/open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ')).toBeNull();
  });

  it('rejeita string vazia', () => {
    expect(parseSpotifyArtistId('')).toBeNull();
  });

  it('rejeita URL malformada', () => {
    expect(parseSpotifyArtistId('not a url at all')).toBeNull();
  });
});
