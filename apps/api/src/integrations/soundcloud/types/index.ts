export interface SoundCloudUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followersCount: number;
  followingsCount: number;
  trackCount: number;
  playlistCount: number;
  profileUrl: string;
}

export interface SoundCloudTrack {
  id: number;
  title: string;
  genre?: string;
  duration: number;
  playbackCount: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  waveformUrl?: string;
  artworkUrl?: string;
  streamUrl?: string;
  isrc?: string;
  createdAt: string;
}

export interface SoundCloudCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
}
