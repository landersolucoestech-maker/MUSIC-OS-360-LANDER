export interface MetaPage {
  id: string;
  name: string;
  category?: string;
  followersCount: number;
  likesCount?: number;
  instagramBusinessAccountId?: string;
}

export interface MetaInsights {
  pageId: string;
  period: string;
  reach: number;
  impressions: number;
  engagement: number;
  pageViews: number;
}

export interface MetaAdCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
}

export interface MetaCredentials {
  appId: string;
  appSecret: string;
  accessToken?: string;
  adAccountId?: string;
}
