/**
 * integrations/types/index.ts
 * Shared types for the integrations facade layer.
 */

export type IntegrationPlatformId =
  | 'spotify'
  | 'youtube'
  | 'meta'
  | 'tiktok'
  | 'soundcloud';

export type IntegrationConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'pending';

export interface IntegrationStatusResult {
  platform: IntegrationPlatformId;
  connected: boolean;
  lastSyncAt: Date | null;
  error?: string;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface PlatformMetrics {
  followers?: number;
  views?: number;
  plays?: number;
  engagement?: number;
  period?: string;
}

export interface PlatformArtistProfile {
  externalId: string;
  name: string;
  imageUrl?: string;
  url?: string;
  followers?: number;
  monthlyListeners?: number;
}

export interface IntegrationClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}
