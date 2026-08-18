/**
 * Parsing de URL de artista do Spotify, compartilhado por SpotifyService e
 * SpotifyArtistProfileProvider. Usa `URL` (hostname real) em vez de regex
 * sobre a string inteira — `evil.com/artist/xyz` ou
 * `open.spotify.com/track/xyz` nunca devem ser aceitos como artista.
 */
export function parseSpotifyArtistId(value: string): string | null {
  if (!value) return null;

  // ID/URI puro (sem barras) — aceito diretamente, sem parsing de URL.
  if (/^[A-Za-z0-9]{10,}$/.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'open.spotify.com' && !host.endsWith('.open.spotify.com')) return null;

  // Segmentos do path, sem vazios (barra final ou dupla). Aceita o formato
  // padrão `/artist/{id}` e o com prefixo de locale `/intl-pt/artist/{id}`.
  const segments = url.pathname.split('/').filter(Boolean);
  const artistIdx = segments.indexOf('artist');
  if (artistIdx === -1 || artistIdx > 1) return null;
  const id = segments[artistIdx + 1];
  return id && /^[A-Za-z0-9]+$/.test(id) ? id : null;
}
