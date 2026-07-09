export interface SpotifyArtist {
  id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  listeners: number | null;
  externalUrl: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  isrc?: string;
  previewUrl?: string;
  durationMs: number;
  popularity: number;
  albumId?: string;
}

export interface SpotifyStreamingStats {
  artistId: string;
  period: string;
  streams: number;
  listeners: number;
  saves: number;
  playlistReach: number;
}

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}
