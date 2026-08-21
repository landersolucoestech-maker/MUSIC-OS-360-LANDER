/**
 * platform-profiles/soundcharts-canonical-candidates.util.ts
 *
 * Constrói a lista de candidatos, em ordem de prioridade, para resolver o
 * UUID Soundcharts canônico de um artista — spotify → youtube → deezer →
 * soundcloud, os identificadores mais confiáveis na base da Soundcharts.
 * Usado por TODOS os providers de métrica para nunca fazer seis resoluções
 * independentes: o primeiro candidato que resolver dá o UUID reutilizado
 * pelas demais métricas do mesmo artista (Soundcharts 06).
 *
 * Extração pura/local (sem chamada de API) — para YouTube só reconhece um
 * id de canal UC… já explícito na URL; não resolve @handle aqui (isso exige
 * a YouTube Data API, mantida apenas dentro do YouTubeArtistProfileProvider
 * para o próprio caso do YouTube).
 */
import { parseSpotifyArtistId } from '../../integrations/spotify/spotify-url.util';
import type { SoundchartsService } from '../../integrations/soundcharts/soundcharts.service';
import type { ArtistEntity } from '../../../database/entities';

export interface CanonicalArtistUrls {
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  deezerUrl?: string | null;
  soundcloudUrl?: string | null;
}

/** As 4 URLs canônicas são sempre colunas dedicadas de ArtistEntity — ao contrário de
 * instagram_url/tiktok_url, que vivem em metadata (ver cachedProfileUrlFor em
 * artist-external-profile-sync.service.ts) e nunca participam da resolução canônica. */
export function canonicalUrlsFromArtist(artist: ArtistEntity): CanonicalArtistUrls {
  return {
    spotifyUrl: artist.spotify_url,
    youtubeUrl: artist.youtube_url,
    deezerUrl: artist.deezer_url,
    soundcloudUrl: artist.soundcloud_url,
  };
}

function extractYouTubeChannelId(value: string): string | null {
  const trimmed = value.trim();
  if (/^UC[A-Za-z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/channel\/(UC[A-Za-z0-9_-]{20,})(?:[/?#].*)?$/i);
  return match?.[1] ?? null;
}

function extractDeezerArtistId(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/artist\/(\d+)/);
  return match?.[1] ?? null;
}

function extractSoundCloudSlug(value: string): string | null {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^https?:\/\/(?:www\.|m\.)?soundcloud\.com\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i);
  return match?.[1] ?? null;
}

export function buildCanonicalCandidates(
  urls: CanonicalArtistUrls,
): Array<{ platform: string; externalId: string | null }> {
  return [
    { platform: 'spotify', externalId: urls.spotifyUrl ? parseSpotifyArtistId(urls.spotifyUrl) : null },
    { platform: 'youtube', externalId: urls.youtubeUrl ? extractYouTubeChannelId(urls.youtubeUrl) : null },
    { platform: 'deezer', externalId: urls.deezerUrl ? extractDeezerArtistId(urls.deezerUrl) : null },
    { platform: 'soundcloud', externalId: urls.soundcloudUrl ? extractSoundCloudSlug(urls.soundcloudUrl) : null },
  ];
}

/**
 * Resolve o UUID canônico tentando spotify/youtube/deezer/soundcloud
 * primeiro; só cai para o identificador da PRÓPRIA plataforma (ownPlatform)
 * se nenhum dos quatro canônicos resolver — relevante para Instagram/TikTok,
 * que não têm identificador canônico próprio nessa lista.
 */
export async function resolveCanonicalUuidForProvider(
  soundcharts: SoundchartsService,
  canonicalUrls: CanonicalArtistUrls | undefined,
  ownPlatform: string,
  ownExternalId: string | null,
): Promise<string> {
  const candidates = buildCanonicalCandidates(canonicalUrls ?? {});
  if (!candidates.some((c) => c.platform === ownPlatform)) {
    candidates.push({ platform: ownPlatform, externalId: ownExternalId });
  }
  return soundcharts.resolveCanonicalArtistUuid(candidates);
}
