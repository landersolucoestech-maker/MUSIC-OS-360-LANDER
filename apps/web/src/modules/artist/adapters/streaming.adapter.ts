/**
 * modules/artist/adapters/streaming.adapter.ts
 *
 * Adaptador de streaming para o módulo artist.
 *
 * RESPONSABILIDADE: converter campos de streaming da entidade Artista
 * para o formato esperado pelo contrato IStreamingProvider, e vice-versa.
 *
 * ESTADO ACTUAL: transformações de/para MOCK_DATA (localStorage).
 * MIGRAÇÃO FUTURA: substituir a fonte dos dados pelas APIs reais
 *   via hooks (useSpotify, useYouTube, useDeezer, useAppleMusic, useSoundCloud).
 *   Os nomes dos campos e a estrutura deste adaptador permanecem estáveis.
 *
 * Plataformas cobertas:
 *   Spotify, YouTube, Deezer, Apple Music, SoundCloud
 *   (TikTok e Instagram têm campos próprios: instagram, tiktok_url em Artista)
 */

import type { Artista } from "@/modules/artist/types/artista.types";

// ─── Tipos de output do adaptador ────────────────────────────────────────────

export interface ArtistStreamingProfile {
  spotify?: {
    artist_id: string | null;
    monthly_listeners: number | null;
    /** MIGRAÇÃO FUTURA: preencher via useSpotifyArtistMetrics */
    followers?: number | null;
  } | null;

  youtube?: {
    channel_id: string | null;
    subscribers: number | null;
    /** MIGRAÇÃO FUTURA: preencher via useYouTubeChannelMetrics */
    total_views?: number | null;
  } | null;

  deezer?: {
    profile_url: string | null;
    fans: number | null;
    /** MIGRAÇÃO FUTURA: preencher via useDeezerArtistMetrics */
    albums_count?: number | null;
  } | null;

  apple_music?: {
    profile_url: string | null;
    albums_count: number | null;
    /** MIGRAÇÃO FUTURA: preencher via useAppleMusicArtistMetrics */
    shazam_count?: number | null;
  } | null;

  soundcloud?: {
    profile_url: string | null;
    followers: number | null;
    /** MIGRAÇÃO FUTURA: preencher via useSoundCloudArtistMetrics */
    plays?: number | null;
  } | null;
}

// ─── Funções de adaptação ────────────────────────────────────────────────────

/**
 * Extrai o perfil de streaming de um Artista (entidade local).
 * Campos nulos indicam que a integração ainda não está conectada
 * ou o artista não tem esse perfil configurado.
 */
export function toStreamingProfile(artista: Artista): ArtistStreamingProfile {
  return {
    spotify: {
      artist_id: artista.spotify_artist_id ?? null,
      monthly_listeners: artista.spotify_ouvintes ?? null,
    },
    youtube: {
      channel_id: artista.youtube_channel_id ?? null,
      subscribers: artista.youtube_inscritos ?? null,
    },
    deezer: {
      profile_url: artista.deezer_url ?? null,
      fans: artista.deezer_fas ?? null,
    },
    apple_music: {
      profile_url: artista.apple_music_url ?? null,
      albums_count: artista.apple_music_albuns ?? null,
    },
    soundcloud: {
      profile_url: artista.soundcloud_url ?? null,
      followers: artista.soundcloud_seguidores ?? null,
    },
  };
}

/**
 * Converte dados vindos de APIs de streaming reais para o formato
 * de actualização parcial da entidade Artista.
 *
 * MIGRAÇÃO FUTURA: receber dados de useSpotify, useYouTube, etc.
 * e chamar esta função para actualizar o registro local.
 */
export function fromStreamingProfile(
  profile: ArtistStreamingProfile
): Partial<Artista> {
  const patch: Partial<Artista> = {};

  if (profile.spotify !== undefined) {
    patch.spotify_artist_id = profile.spotify?.artist_id ?? null;
    patch.spotify_ouvintes = profile.spotify?.monthly_listeners ?? null;
  }
  if (profile.youtube !== undefined) {
    patch.youtube_channel_id = profile.youtube?.channel_id ?? null;
    patch.youtube_inscritos = profile.youtube?.subscribers ?? null;
  }
  if (profile.deezer !== undefined) {
    patch.deezer_url = profile.deezer?.profile_url ?? null;
    patch.deezer_fas = profile.deezer?.fans ?? null;
  }
  if (profile.apple_music !== undefined) {
    patch.apple_music_url = profile.apple_music?.profile_url ?? null;
    patch.apple_music_albuns = profile.apple_music?.albums_count ?? null;
  }
  if (profile.soundcloud !== undefined) {
    patch.soundcloud_url = profile.soundcloud?.profile_url ?? null;
    patch.soundcloud_seguidores = profile.soundcloud?.followers ?? null;
  }

  return patch;
}

/**
 * Verifica se um artista tem pelo menos uma plataforma de streaming configurada.
 */
export function hasStreamingProfile(artista: Artista): boolean {
  return Boolean(
    artista.spotify_artist_id ||
      artista.youtube_channel_id ||
      artista.deezer_url ||
      artista.apple_music_url ||
      artista.soundcloud_url
  );
}

/**
 * Lista as plataformas com perfil configurado para um artista.
 */
export function getConnectedStreamingPlatforms(
  artista: Artista
): Array<"spotify" | "youtube" | "deezer" | "apple_music" | "soundcloud"> {
  const platforms: Array<"spotify" | "youtube" | "deezer" | "apple_music" | "soundcloud"> = [];

  if (artista.spotify_artist_id) platforms.push("spotify");
  if (artista.youtube_channel_id) platforms.push("youtube");
  if (artista.deezer_url) platforms.push("deezer");
  if (artista.apple_music_url) platforms.push("apple_music");
  if (artista.soundcloud_url) platforms.push("soundcloud");

  return platforms;
}

