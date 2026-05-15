export interface YouTubeChannel {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  customUrl?: string;
}

export interface YouTubeVideoStats {
  videoId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
}

export interface YouTubeAnalytics {
  channelId: string;
  period: string;
  views: number;
  watchTimeMinutes: number;
  subscribers: number;
  estimatedRevenue?: number;
}

export interface YouTubeCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}
