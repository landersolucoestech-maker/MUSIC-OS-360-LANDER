import { Injectable, Logger } from '@nestjs/common';
import { assertAllowedHost } from '../../../core/resilience/safe-url';

const DEEZER_API = 'https://api.deezer.com';
const DEEZER_HOSTS = ['api.deezer.com'] as const;

@Injectable()
export class DeezerService {
  private readonly logger = new Logger(DeezerService.name);

  isConfigured(): boolean {
    return true; // API pública, sem chave necessária
  }

  async getArtistStats(artistId: string) {
    const url = assertAllowedHost(`${DEEZER_API}/artist/${encodeURIComponent(artistId)}`, DEEZER_HOSTS);
    const res = await fetch(url);
    if (!res.ok) return { error: `Deezer API error: ${res.status}` };
    const d = await res.json() as any;
    return {
      artistId: String(d.id),
      name:     d.name ?? '',
      fans:     d.nb_fan ?? 0,
      albums:   d.nb_album ?? 0,
      picture:  d.picture_medium ?? '',
      link:     d.link ?? '',
      syncedAt: new Date().toISOString(),
    };
  }

  async getTopTracks(artistId: string, limit = 10) {
    const url = assertAllowedHost(`${DEEZER_API}/artist/${encodeURIComponent(artistId)}/top?limit=${encodeURIComponent(String(limit))}`, DEEZER_HOSTS);
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.data ?? []).map((t: any) => ({
      id:       String(t.id),
      title:    t.title ?? '',
      rank:     t.rank ?? 0,
      duration: t.duration ?? 0,
      preview:  t.preview ?? '',
      album:    t.album?.title ?? '',
      cover:    t.album?.cover_medium ?? '',
    }));
  }

  async getAlbum(albumId: string) {
    const url = assertAllowedHost(`${DEEZER_API}/album/${encodeURIComponent(albumId)}`, DEEZER_HOSTS);
    const res = await fetch(url);
    if (!res.ok) return { error: `Deezer API error: ${res.status}` };
    const d = await res.json() as any;
    return {
      albumId:   String(d.id),
      title:     d.title ?? '',
      artistName: d.artist?.name ?? '',
      cover:     d.cover_medium ?? '',
      releaseDate: d.release_date ?? '',
      trackCount: d.nb_tracks ?? 0,
      fans:       d.fans ?? 0,
      syncedAt:  new Date().toISOString(),
    };
  }

  async searchArtist(query: string, limit = 5) {
    const res = await fetch(`${DEEZER_API}/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.data ?? []).map((a: any) => ({
      id:      String(a.id),
      name:    a.name ?? '',
      fans:    a.nb_fan ?? 0,
      picture: a.picture_medium ?? '',
      link:    a.link ?? '',
    }));
  }
}
