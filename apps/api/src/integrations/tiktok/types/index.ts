export interface TikTokProfile {
  openId: string;
  nickname: string;
  avatarUrl?: string;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
}

export interface TikTokVideoStats {
  videoId: string;
  title?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  publishedAt: string;
}

export interface TikTokAdCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
}

export interface TikTokCredentials {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  openId?: string;
}
