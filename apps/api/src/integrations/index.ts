/**
 * apps/api/src/integrations/index.ts
 *
 * Integrations facade layer — organized entry point for all external platform
 * clients, types, and schemas.
 *
 * Hierarchy:
 *   integrations/
 *   ├── types/       ← shared integration types (status, tokens, etc.)
 *   ├── schemas/     ← shared Zod schemas (OAuth callback, metrics query)
 *   ├── spotify/     ← Spotify Web API: client/, services/, types/, schemas/
 *   ├── youtube/     ← YouTube Data + Analytics API
 *   ├── meta/        ← Meta Graph API (Facebook + Instagram)
 *   ├── tiktok/      ← TikTok Content + Ads API
 *   └── soundcloud/  ← SoundCloud API
 *
 * Usage:
 *   import { SpotifyApiClient } from '@api/integrations';
 *   import type { MetaAdCampaign } from '@api/integrations/meta';
 */

export * from './types';
export * from './schemas';
export * from './spotify';
export * from './youtube';
export * from './meta';
export * from './tiktok';
export * from './soundcloud';
