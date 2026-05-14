# MUSIC OS 360° — INTEGRAÇÕES COMPLETAS

## DIAGNÓSTICO ATUAL

Estado real de cada integração:

| Integração | Backend | Frontend (hooks) |
|---|---|---|
| ACRCloud | ✅ completo | ✅ usa backend |
| Autentique | ✅ completo | ✅ usa backend |
| Spotify | ✅ completo (OAuth 2.0) | ❌ usa sessionStorage |
| YouTube | ✅ (etapa anterior) | ❌ usa sessionStorage |
| Deezer | ✅ (etapa anterior) | ❌ apenas status mock |
| SoundCloud | ❌ não existe | ❌ usa sessionStorage |
| Apple Music | ❌ não existe | ❌ usa sessionStorage |
| Instagram | ❌ não existe | ❌ stub disabled |
| TikTok (orgânico) | ❌ não existe | ❌ stub disabled |
| TikTok Ads | ❌ não existe | ❌ usa sessionStorage |
| Google Ads | ❌ não existe | ❌ usa sessionStorage |
| Meta Ads | ❌ não existe | ❌ usa sessionStorage |
| Abramus | ❌ não existe | ❌ usa localStorage/mock |

**Problema raiz:** todos os hooks do frontend armazenam credenciais em
`sessionStorage`/`localStorage`. Credenciais precisam estar no banco (criptografadas).
O backend precisa fazer as chamadas às APIs externas, nunca o frontend.

---

## ARQUITETURA PADRÃO (seguir em TODAS as integrações)

```
Frontend hook → POST /api/v1/integrations/{provider}/configure
                     → backend salva em integrations.credentials_encrypted (AES-256-GCM)

Frontend hook → GET  /api/v1/integrations/{provider}/status
                     → backend lê do banco, retorna status

Frontend hook → GET  /api/v1/integrations/{provider}/metrics/...
                     → backend descriptografa credenciais, chama API externa, retorna dados

Para OAuth 2.0:
Frontend hook → GET  /api/v1/integrations/{provider}/auth
                     → backend retorna URL de redirect
Frontend popup → provider OAuth page → redirect back com code
Frontend hook → POST /api/v1/integrations/{provider}/callback { code, state }
                     → backend troca tokens, salva em oauth_connections (criptografado)
```

---

## ETAPA 1 — SERVIÇO BASE DE INTEGRAÇÃO (reutilizado por todos)

### 1.1 — Criar apps/api/src/modules/integrations/integration-base.service.ts

```typescript
/**
 * integration-base.service.ts
 *
 * Helper base para todos os serviços de integração.
 * Centraliza: salvar credenciais, ler credenciais, salvar tokens OAuth,
 * ler tokens OAuth com refresh automático.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and }            from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { EncryptionService }  from '../../core/security/encryption.service';
import { integrations, oauthConnections, OAuthConnection } from '../../database/schema';

@Injectable()
export class IntegrationBaseService {
  constructor(
    @Inject(DRIZZLE_DB) protected readonly db: DrizzleDB,
    protected readonly enc: EncryptionService,
  ) {}

  // ── Credentials (API keys / tokens) ───────────────────────────────────────

  protected async saveCredentials(tenantId: string, provider: string, creds: object): Promise<void> {
    const encrypted = this.enc.encrypt(JSON.stringify(creds));
    const [existing] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)))
      .limit(1);

    if (existing) {
      await this.db.update(integrations)
        .set({ credentials_encrypted: encrypted, status: 'connected', updated_at: new Date() })
        .where(eq(integrations.id, existing.id));
    } else {
      await this.db.insert(integrations).values({
        tenant_id: tenantId, provider, status: 'connected',
        credentials_encrypted: encrypted,
      });
    }
  }

  protected async loadCredentials<T>(tenantId: string, provider: string): Promise<T | null> {
    const [row] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)))
      .limit(1);

    if (!row?.credentials_encrypted) return null;
    return JSON.parse(this.enc.decrypt(row.credentials_encrypted)) as T;
  }

  protected async getStatus(tenantId: string, provider: string) {
    const [row] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)))
      .limit(1);

    return {
      connected:    !!row?.credentials_encrypted,
      status:       row?.status ?? 'disconnected',
      last_sync_at: row?.last_sync_at ?? null,
      last_error:   null,
    };
  }

  protected async disconnect(tenantId: string, provider: string): Promise<void> {
    await this.db.update(integrations)
      .set({ credentials_encrypted: null, status: 'disconnected', updated_at: new Date() })
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)));
  }

  // ── OAuth tokens ───────────────────────────────────────────────────────────

  protected async saveOAuthTokens(params: {
    tenantId: string;
    userId:   string;
    provider: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresIn?: number;
    scopes?: string;
  }): Promise<void> {
    const expiresAt = params.expiresIn
      ? new Date(Date.now() + params.expiresIn * 1000)
      : null;

    const [existing] = await this.db.select().from(oauthConnections)
      .where(and(
        eq(oauthConnections.tenant_id, params.tenantId),
        eq(oauthConnections.user_id,   params.userId),
        eq(oauthConnections.provider,  params.provider),
      )).limit(1);

    if (existing) {
      await this.db.update(oauthConnections).set({
        access_token_encrypted:  this.enc.encrypt(params.accessToken),
        refresh_token_encrypted: params.refreshToken ? this.enc.encrypt(params.refreshToken) : existing.refresh_token_encrypted,
        expires_at:  expiresAt,
        scopes:      params.scopes ?? existing.scopes,
        updated_at:  new Date(),
      }).where(eq(oauthConnections.id, existing.id));
    } else {
      await this.db.insert(oauthConnections).values({
        tenant_id: params.tenantId,
        user_id:   params.userId,
        provider:  params.provider,
        access_token_encrypted:  this.enc.encrypt(params.accessToken),
        refresh_token_encrypted: params.refreshToken ? this.enc.encrypt(params.refreshToken) : null,
        expires_at: expiresAt,
        scopes:     params.scopes ?? null,
      });
    }

    // Marcar integração como connected
    await this.saveCredentials(params.tenantId, params.provider, { oauth: true });
  }

  protected async getOAuthConnection(tenantId: string, userId: string, provider: string): Promise<OAuthConnection | null> {
    const [conn] = await this.db.select().from(oauthConnections)
      .where(and(
        eq(oauthConnections.tenant_id, tenantId),
        eq(oauthConnections.user_id,   userId),
        eq(oauthConnections.provider,  provider),
      )).limit(1);
    return conn ?? null;
  }

  protected async disconnectOAuth(tenantId: string, userId: string, provider: string): Promise<void> {
    await this.db.delete(oauthConnections).where(and(
      eq(oauthConnections.tenant_id, tenantId),
      eq(oauthConnections.user_id,   userId),
      eq(oauthConnections.provider,  provider),
    ));
    await this.disconnect(tenantId, provider);
  }
}
```

---

## ETAPA 2 — SOUNDCLOUD

### 2.1 — Criar apps/api/src/modules/integrations/soundcloud/soundcloud.service.ts

```typescript
/**
 * SoundCloud Service
 * API v2 pública para dados de artista (sem autenticação para dados públicos).
 * Para métricas privadas: requer OAuth 2.0 (credenciais guardadas criptografadas).
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { IntegrationBaseService } from '../integration-base.service';

const SC_API = 'https://api.soundcloud.com';

@Injectable()
export class SoundCloudService extends IntegrationBaseService {
  private readonly logger = new Logger(SoundCloudService.name);

  isConfigured(clientId?: string): boolean {
    return !!(clientId ?? this.config?.get('SOUNDCLOUD_CLIENT_ID'));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any, enc: any, private readonly config: ConfigService) {
    super(db, enc);
  }

  async configure(tenantId: string, creds: { client_id: string; client_secret: string; permalink?: string }): Promise<void> {
    await this.saveCredentials(tenantId, 'soundcloud', creds);
  }

  async getStatus(tenantId: string) {
    return super.getStatus(tenantId, 'soundcloud');
  }

  async disconnectProvider(tenantId: string): Promise<void> {
    return super.disconnect(tenantId, 'soundcloud');
  }

  async resolveUser(permalink: string) {
    const clientId = this.config.get<string>('SOUNDCLOUD_CLIENT_ID') ?? '';
    if (!clientId) return { error: 'SOUNDCLOUD_CLIENT_ID não configurado' };

    const url = `${SC_API}/resolve?url=https://soundcloud.com/${encodeURIComponent(permalink)}&client_id=${clientId}`;
    const res  = await fetch(url);
    if (!res.ok) return { error: `SoundCloud error: ${res.status}` };
    const data = await res.json() as any;

    return {
      id:          String(data.id),
      permalink:   data.permalink,
      username:    data.username,
      fullName:    data.full_name,
      followers:   data.followers_count ?? 0,
      following:   data.followings_count ?? 0,
      trackCount:  data.track_count ?? 0,
      playCount:   data.public_likes_count ?? 0,
      avatarUrl:   data.avatar_url ?? '',
      description: data.description ?? '',
      syncedAt:    new Date().toISOString(),
    };
  }

  async getTrackStats(trackId: string) {
    const clientId = this.config.get<string>('SOUNDCLOUD_CLIENT_ID') ?? '';
    if (!clientId) return { error: 'SOUNDCLOUD_CLIENT_ID não configurado' };

    const url = `${SC_API}/tracks/${encodeURIComponent(trackId)}?client_id=${clientId}`;
    const res  = await fetch(url);
    if (!res.ok) return { error: `SoundCloud error: ${res.status}` };
    const data = await res.json() as any;

    return {
      id:           String(data.id),
      title:        data.title,
      playCount:    data.playback_count ?? 0,
      downloadCount:data.download_count ?? 0,
      commentCount: data.comment_count ?? 0,
      likeCount:    data.likes_count ?? 0,
      repostCount:  data.reposts_count ?? 0,
      duration:     data.duration ?? 0,
      streamUrl:    data.stream_url ?? '',
      permalink:    data.permalink_url ?? '',
      artworkUrl:   data.artwork_url ?? '',
      syncedAt:     new Date().toISOString(),
    };
  }

  async searchTracks(query: string, limit = 10) {
    const clientId = this.config.get<string>('SOUNDCLOUD_CLIENT_ID') ?? '';
    if (!clientId) return [];

    const url = `${SC_API}/tracks?q=${encodeURIComponent(query)}&limit=${limit}&client_id=${clientId}`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as any[];

    return data.map((t: any) => ({
      id:         String(t.id),
      title:      t.title,
      plays:      t.playback_count ?? 0,
      likes:      t.likes_count ?? 0,
      permalink:  t.permalink_url ?? '',
      artworkUrl: t.artwork_url ?? '',
      user:       t.user?.username ?? '',
    }));
  }
}
```

---

## ETAPA 3 — APPLE MUSIC

### 3.1 — Criar apps/api/src/modules/integrations/apple-music/apple-music.service.ts

```typescript
/**
 * Apple Music Service
 * Usa Apple Developer JWT para endpoints públicos do catálogo.
 * Para métricas de artista (Apple Music for Artists): requer credenciais do Apple Developer Program.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto             from 'crypto';
import { IntegrationBaseService } from '../integration-base.service';

const AM_API = 'https://api.music.apple.com/v1';

interface AppleMusicCreds {
  team_id:    string;
  key_id:     string;
  private_key:string;   // PEM format
  artist_id?: string;
}

@Injectable()
export class AppleMusicService extends IntegrationBaseService {
  private readonly logger = new Logger(AppleMusicService.name);

  async configure(tenantId: string, creds: AppleMusicCreds): Promise<void> {
    await this.saveCredentials(tenantId, 'apple-music', creds);
  }

  async getStatus(tenantId: string) {
    return super.getStatus(tenantId, 'apple-music');
  }

  async disconnectProvider(tenantId: string): Promise<void> {
    return super.disconnect(tenantId, 'apple-music');
  }

  private generateDeveloperToken(creds: AppleMusicCreds): string {
    const now = Math.floor(Date.now() / 1000);
    const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: creds.key_id })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: creds.team_id,
      iat: now,
      exp: now + 3600,   // 1 hora
    })).toString('base64url');

    const data      = `${header}.${payload}`;
    const sign      = crypto.createSign('SHA256');
    sign.update(data);
    const signature = sign.sign(creds.private_key, 'base64url');
    return `${data}.${signature}`;
  }

  async getArtistFromCatalog(artistId: string, storefront = 'br', tenantId?: string) {
    let token: string;

    if (tenantId) {
      const creds = await this.loadCredentials<AppleMusicCreds>(tenantId, 'apple-music');
      if (!creds) return { error: 'Apple Music não configurado' };
      token = this.generateDeveloperToken(creds);
    } else {
      return { error: 'tenantId obrigatório' };
    }

    const url = `${AM_API}/catalog/${storefront}/artists/${encodeURIComponent(artistId)}`;
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return { error: `Apple Music API error: ${res.status}` };
    const data = await res.json() as any;
    const a    = data.data?.[0];
    if (!a) return { error: 'Artista não encontrado' };

    return {
      artistId,
      name:         a.attributes?.name ?? '',
      genreNames:   a.attributes?.genreNames ?? [],
      url:          a.attributes?.url ?? '',
      artworkUrl:   a.attributes?.artwork?.url?.replace('{w}', '300').replace('{h}', '300') ?? '',
      syncedAt:     new Date().toISOString(),
    };
  }

  async searchCatalog(query: string, storefront = 'br', tenantId?: string) {
    if (!tenantId) return [];

    const creds = await this.loadCredentials<AppleMusicCreds>(tenantId, 'apple-music');
    if (!creds) return [];
    const token = this.generateDeveloperToken(creds);

    const url = `${AM_API}/catalog/${storefront}/search?term=${encodeURIComponent(query)}&types=artists,songs&limit=10`;
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = await res.json() as any;

    return {
      artists: (data.results?.artists?.data ?? []).map((a: any) => ({
        id:   a.id,
        name: a.attributes?.name,
        url:  a.attributes?.url,
      })),
      songs: (data.results?.songs?.data ?? []).map((s: any) => ({
        id:          s.id,
        title:       s.attributes?.name,
        artist:      s.attributes?.artistName,
        album:       s.attributes?.albumName,
        releaseDate: s.attributes?.releaseDate,
        url:         s.attributes?.url,
        isrc:        s.attributes?.isrc,
      })),
    };
  }
}
```

---

## ETAPA 4 — INSTAGRAM (Meta Graph API)

### 4.1 — Criar apps/api/src/modules/integrations/instagram/instagram.service.ts

```typescript
/**
 * Instagram Service — Meta Graph API
 * OAuth 2.0 via Facebook Login.
 * Escopo: instagram_basic, instagram_manage_insights, pages_show_list
 *
 * Fluxo:
 *   1. getAuthUrl() → redirecionar para Facebook OAuth
 *   2. handleCallback(code) → trocar por token de longa duração
 *   3. syncMetrics() → buscar métricas de conta
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { IntegrationBaseService } from '../integration-base.service';

const FB_API     = 'https://graph.facebook.com/v19.0';
const FB_OAUTH   = 'https://www.facebook.com/v19.0/dialog/oauth';
const FB_TOKEN   = 'https://graph.facebook.com/v19.0/oauth/access_token';

const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

@Injectable()
export class InstagramService extends IntegrationBaseService {
  private readonly logger = new Logger(InstagramService.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any, enc: any, private readonly config: ConfigService) {
    super(db, enc);
  }

  getAuthUrl(tenantId: string, userId: string): string {
    const appId      = this.config.get<string>('META_APP_ID')       ?? '';
    const redirectUri= this.config.get<string>('META_REDIRECT_URI') ?? '';
    const state      = Buffer.from(JSON.stringify({ tenantId, userId, provider: 'instagram' })).toString('base64');

    return `${FB_OAUTH}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${SCOPES}&state=${encodeURIComponent(state)}&response_type=code`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const { tenantId, userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const appId      = this.config.get<string>('META_APP_ID')       ?? '';
    const appSecret  = this.config.get<string>('META_APP_SECRET')   ?? '';
    const redirectUri= this.config.get<string>('META_REDIRECT_URI') ?? '';

    // 1. Trocar código por short-lived token
    const tokenRes = await fetch(`${FB_TOKEN}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    const tokens   = await tokenRes.json() as any;

    // 2. Trocar por long-lived token (60 dias)
    const llRes  = await fetch(`${FB_TOKEN}?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokens.access_token}`);
    const llData = await llRes.json() as any;

    await this.saveOAuthTokens({
      tenantId,
      userId,
      provider:     'instagram',
      accessToken:  llData.access_token ?? tokens.access_token,
      expiresIn:    llData.expires_in,
      scopes:       SCOPES,
    });

    this.logger.log(`Instagram OAuth: ${userId}@${tenantId} conectado`);
  }

  async getStatus(tenantId: string) {
    return super.getStatus(tenantId, 'instagram');
  }

  async disconnectProvider(tenantId: string, userId: string): Promise<void> {
    return super.disconnectOAuth(tenantId, userId, 'instagram');
  }

  async getAccountMetrics(tenantId: string, userId: string) {
    const conn = await this.getOAuthConnection(tenantId, userId, 'instagram');
    if (!conn) return { error: 'Instagram não conectado' };

    const token = this.enc.decrypt(conn.access_token_encrypted);

    // Buscar páginas do usuário
    const pagesRes = await fetch(`${FB_API}/me/accounts?access_token=${token}`);
    const pages    = await pagesRes.json() as any;
    const page     = pages.data?.[0];
    if (!page) return { error: 'Nenhuma página do Facebook encontrada' };

    // Buscar conta Instagram vinculada
    const igRes  = await fetch(`${FB_API}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    const igData = await igRes.json() as any;
    const igId   = igData.instagram_business_account?.id;
    if (!igId) return { error: 'Conta Instagram Business não vinculada a esta página' };

    // Buscar métricas da conta
    const metrics = ['impressions', 'reach', 'profile_views', 'follower_count'];
    const insightsRes = await fetch(
      `${FB_API}/${igId}/insights?metric=${metrics.join(',')}&period=day&access_token=${page.access_token}`
    );
    const insights = await insightsRes.json() as any;

    // Buscar perfil básico
    const profileRes = await fetch(
      `${FB_API}/${igId}?fields=name,username,followers_count,media_count,biography&access_token=${page.access_token}`
    );
    const profile = await profileRes.json() as any;

    return {
      accountId:   igId,
      username:    profile.username,
      name:        profile.name,
      followers:   profile.followers_count ?? 0,
      mediaCount:  profile.media_count     ?? 0,
      biography:   profile.biography       ?? '',
      insights:    insights.data ?? [],
      syncedAt:    new Date().toISOString(),
    };
  }
}
```

---

## ETAPA 5 — TIKTOK

### 5.1 — Criar apps/api/src/modules/integrations/tiktok/tiktok.service.ts

```typescript
/**
 * TikTok Service
 * TikTok for Business API + TikTok Ads API.
 * Credenciais salvas criptografadas no banco.
 *
 * Para métricas orgânicas: requer TikTok Login Kit (OAuth 2.0)
 * Para anúncios: TikTok Ads API com app_id + secret
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { IntegrationBaseService } from '../integration-base.service';

const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_ADS   = 'https://business-api.tiktok.com/open_api/v1.3';

interface TikTokAdsCreds {
  app_id:         string;
  secret:         string;
  advertiser_id?: string;
}

@Injectable()
export class TikTokService extends IntegrationBaseService {
  private readonly logger = new Logger(TikTokService.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any, enc: any, private readonly config: ConfigService) {
    super(db, enc);
  }

  // ── TikTok Ads ─────────────────────────────────────────────────────────────

  async configureAds(tenantId: string, creds: TikTokAdsCreds): Promise<void> {
    await this.saveCredentials(tenantId, 'tiktok-ads', creds);
  }

  async getAdsStatus(tenantId: string) {
    return super.getStatus(tenantId, 'tiktok-ads');
  }

  async disconnectAds(tenantId: string): Promise<void> {
    return super.disconnect(tenantId, 'tiktok-ads');
  }

  async getAdsCampaigns(tenantId: string) {
    const creds = await this.loadCredentials<TikTokAdsCreds>(tenantId, 'tiktok-ads');
    if (!creds) return { error: 'TikTok Ads não configurado' };

    const url    = `${TIKTOK_ADS}/campaign/get/`;
    const body   = JSON.stringify({ advertiser_id: creds.advertiser_id, page_size: 20 });
    const res    = await fetch(url, {
      method: 'POST',
      headers: {
        'Access-Token': await this.getAdsAccessToken(creds),
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await res.json() as any;
    if (data.code !== 0) return { error: data.message };

    return {
      campaigns: (data.data?.list ?? []).map((c: any) => ({
        id:           c.campaign_id,
        name:         c.campaign_name,
        status:       c.status,
        budget:       c.budget,
        objectiveType:c.objective_type,
        createTime:   c.create_time,
      })),
      total: data.data?.page_info?.total_number ?? 0,
    };
  }

  async getAdsInsights(tenantId: string, campaignId: string) {
    const creds = await this.loadCredentials<TikTokAdsCreds>(tenantId, 'tiktok-ads');
    if (!creds) return { error: 'TikTok Ads não configurado' };

    const today = new Date().toISOString().split('T')[0];
    const url   = `${TIKTOK_ADS}/report/integrated/get/`;
    const body  = JSON.stringify({
      advertiser_id: creds.advertiser_id,
      report_type: 'BASIC',
      dimensions:  ['campaign_id'],
      metrics:     ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'video_play_actions', 'video_watched_2s', 'video_watched_6s', 'video_views_p100'],
      data_level:  'AUCTION_CAMPAIGN',
      start_date:  today,
      end_date:    today,
      filters:     [{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify([campaignId]) }],
    });

    const res  = await fetch(url, {
      method: 'POST',
      headers: {
        'Access-Token': await this.getAdsAccessToken(creds),
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await res.json() as any;
    if (data.code !== 0) return { error: data.message };
    return data.data?.list?.[0]?.metrics ?? {};
  }

  private async getAdsAccessToken(creds: TikTokAdsCreds): Promise<string> {
    // TikTok Ads usa app_id + secret para gerar access_token
    const res = await fetch(`${TIKTOK_ADS}/oauth2/access_token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: creds.app_id, secret: creds.secret, grant_type: 'client_credential' }),
    });
    const data = await res.json() as any;
    return data.data?.access_token ?? '';
  }

  // ── TikTok for Business (orgânico) ──────────────────────────────────────────

  getOAuthUrl(tenantId: string, userId: string): string {
    const clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY')     ?? '';
    const redirect  = this.config.get<string>('TIKTOK_REDIRECT_URI')   ?? '';
    const state     = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');
    const csrfState = Buffer.from(state).toString('hex').slice(0, 16);

    return `${TIKTOK_AUTH}?client_key=${clientKey}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&state=${csrfState}`;
  }

  async handleOAuthCallback(code: string, state: string): Promise<void> {
    const { tenantId, userId } = JSON.parse(Buffer.from(state, 'hex'), 'utf-8') as any;
    const clientKey    = this.config.get<string>('TIKTOK_CLIENT_KEY')    ?? '';
    const clientSecret = this.config.get<string>('TIKTOK_CLIENT_SECRET') ?? '';
    const redirect     = this.config.get<string>('TIKTOK_REDIRECT_URI')  ?? '';

    const res = await fetch(TIKTOK_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key:    clientKey,
        client_secret: clientSecret,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  redirect,
      }),
    });
    const data = await res.json() as any;

    await this.saveOAuthTokens({
      tenantId, userId, provider: 'tiktok',
      accessToken:  data.data?.access_token,
      refreshToken: data.data?.refresh_token,
      expiresIn:    data.data?.expires_in,
      scopes:       'user.info.basic,video.list',
    });
  }
}
```

---

## ETAPA 6 — GOOGLE ADS

### 6.1 — Criar apps/api/src/modules/integrations/google-ads/google-ads.service.ts

```typescript
/**
 * Google Ads Service
 * Google Ads API v17 — acesso via developer_token + OAuth 2.0.
 * Credenciais salvas criptografadas no banco.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { IntegrationBaseService } from '../integration-base.service';

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v17';
const GOOGLE_TOKEN   = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH    = 'https://accounts.google.com/o/oauth2/v2/auth';

interface GoogleAdsCreds {
  developer_token:    string;
  client_id:          string;
  client_secret:      string;
  refresh_token?:     string;
  customer_id?:       string;
  manager_account_id?:string;
}

@Injectable()
export class GoogleAdsService extends IntegrationBaseService {
  private readonly logger = new Logger(GoogleAdsService.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any, enc: any, private readonly config: ConfigService) {
    super(db, enc);
  }

  async configure(tenantId: string, creds: GoogleAdsCreds): Promise<void> {
    await this.saveCredentials(tenantId, 'google-ads', creds);
  }

  async getStatus(tenantId: string) {
    return super.getStatus(tenantId, 'google-ads');
  }

  async disconnectProvider(tenantId: string): Promise<void> {
    return super.disconnect(tenantId, 'google-ads');
  }

  getOAuthUrl(tenantId: string, userId: string): string {
    const clientId  = this.config.get<string>('GOOGLE_ADS_CLIENT_ID')  ?? '';
    const redirect  = this.config.get<string>('GOOGLE_ADS_REDIRECT_URI') ?? '';
    const state     = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');

    return `${GOOGLE_AUTH}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  }

  async handleOAuthCallback(code: string, state: string): Promise<void> {
    const { tenantId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const clientId     = this.config.get<string>('GOOGLE_ADS_CLIENT_ID')     ?? '';
    const clientSecret = this.config.get<string>('GOOGLE_ADS_CLIENT_SECRET') ?? '';
    const redirect     = this.config.get<string>('GOOGLE_ADS_REDIRECT_URI')  ?? '';

    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirect, grant_type: 'authorization_code',
      }),
    });
    const data = await res.json() as any;

    // Salvar refresh_token para uso futuro
    const existing = await this.loadCredentials<GoogleAdsCreds>(tenantId, 'google-ads') ?? {};
    await this.saveCredentials(tenantId, 'google-ads', {
      ...existing,
      refresh_token: data.refresh_token,
    });
  }

  private async getAccessToken(creds: GoogleAdsCreds): Promise<string> {
    if (!creds.refresh_token) throw new Error('Google Ads: refresh_token não configurado');

    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: creds.refresh_token,
        client_id:     creds.client_id,
        client_secret: creds.client_secret,
        grant_type:    'refresh_token',
      }),
    });
    const data = await res.json() as any;
    return data.access_token as string;
  }

  async getCampaigns(tenantId: string) {
    const creds = await this.loadCredentials<GoogleAdsCreds>(tenantId, 'google-ads');
    if (!creds) return { error: 'Google Ads não configurado' };

    const accessToken = await this.getAccessToken(creds);
    const customerId  = creds.customer_id ?? '';

    const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.impressions DESC LIMIT 20`;

    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization':       `Bearer ${accessToken}`,
        'developer-token':     creds.developer_token,
        'login-customer-id':   creds.manager_account_id ?? customerId,
        'Content-Type':        'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json() as any;
    if (data.error) return { error: data.error.message };

    return {
      campaigns: (data.results ?? []).map((r: any) => ({
        id:          r.campaign?.id,
        name:        r.campaign?.name,
        status:      r.campaign?.status,
        channelType: r.campaign?.advertisingChannelType,
        impressions: Number(r.metrics?.impressions ?? 0),
        clicks:      Number(r.metrics?.clicks ?? 0),
        costMicros:  Number(r.metrics?.costMicros ?? 0),
        costBrl:     (Number(r.metrics?.costMicros ?? 0) / 1_000_000).toFixed(2),
        conversions: Number(r.metrics?.conversions ?? 0),
      })),
    };
  }
}
```

---

## ETAPA 7 — ABRAMUS (ECAD / Direitos Autorais Brasil)

### 7.1 — Criar apps/api/src/modules/integrations/abramus/abramus.service.ts

```typescript
/**
 * Abramus Service
 * API interna da Abramus/ECAD para registro e consulta de obras/fonogramas.
 * Requer credenciais do Programa de Afiliados da Abramus.
 *
 * Nota: A Abramus não tem uma API pública documentada.
 * Este serviço implementa o padrão de credenciais + proxy de consultas.
 * As chamadas reais dependem do contrato com a Abramus.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IntegrationBaseService } from '../integration-base.service';

interface AbramusCreds {
  username: string;
  password: string;   // salvo criptografado, NUNCA exposto
  base_url?: string;
}

@Injectable()
export class AbramusService extends IntegrationBaseService {
  private readonly logger = new Logger(AbramusService.name);
  private readonly DEFAULT_URL = 'https://api.abramus.org.br';

  async configure(tenantId: string, creds: AbramusCreds): Promise<void> {
    await this.saveCredentials(tenantId, 'abramus', creds);
    this.logger.log(`Abramus configurado para tenant ${tenantId}`);
  }

  async getStatus(tenantId: string) {
    return super.getStatus(tenantId, 'abramus');
  }

  async disconnectProvider(tenantId: string): Promise<void> {
    return super.disconnect(tenantId, 'abramus');
  }

  private async getToken(tenantId: string): Promise<{ token: string; baseUrl: string }> {
    const creds = await this.loadCredentials<AbramusCreds>(tenantId, 'abramus');
    if (!creds) throw new Error('Abramus não configurado para este tenant');

    const baseUrl = creds.base_url ?? this.DEFAULT_URL;

    // Autenticação básica (padrão de muitas APIs de direitos)
    const res = await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.username, password: creds.password }),
    });

    if (!res.ok) throw new Error(`Abramus auth falhou: ${res.status}`);
    const data = await res.json() as any;
    return { token: data.token ?? data.access_token, baseUrl };
  }

  async searchArtist(tenantId: string, query: string) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const res  = await fetch(`${baseUrl}/associados/busca?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return { error: `Abramus search error: ${res.status}` };
      return res.json();
    } catch (err) {
      this.logger.error('Abramus searchArtist error', err);
      return { error: (err as Error).message };
    }
  }

  async searchWork(tenantId: string, query: { titulo?: string; compositor?: string; isrc?: string }) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const params = new URLSearchParams();
      if (query.titulo)     params.append('titulo',      query.titulo);
      if (query.compositor) params.append('compositor',  query.compositor);
      if (query.isrc)       params.append('isrc',        query.isrc);

      const res = await fetch(`${baseUrl}/obras/busca?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return { error: `Abramus search error: ${res.status}` };
      return res.json();
    } catch (err) {
      this.logger.error('Abramus searchWork error', err);
      return { error: (err as Error).message };
    }
  }

  async registerWork(tenantId: string, obra: {
    titulo: string; compositor: string; co_compositores?: string;
    tipo: string; genero?: string; iswc?: string;
  }) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const res = await fetch(`${baseUrl}/obras/registro`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(obra),
      });
      return res.json();
    } catch (err) {
      this.logger.error('Abramus registerWork error', err);
      return { error: (err as Error).message };
    }
  }

  async getStatements(tenantId: string, params: { periodo?: string; artista_id?: string }) {
    try {
      const { token, baseUrl } = await this.getToken(tenantId);
      const query = new URLSearchParams(params as Record<string, string>);
      const res   = await fetch(`${baseUrl}/extratos?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return { error: `Abramus extratos error: ${res.status}` };
      return res.json();
    } catch (err) {
      this.logger.error('Abramus getStatements error', err);
      return { error: (err as Error).message };
    }
  }
}
```

---

## ETAPA 8 — REGISTRAR TODOS OS SERVIÇOS

### 8.1 — Atualizar apps/api/src/modules/integrations/integrations.module.ts

Substituir o arquivo completamente:

```typescript
import { Module }             from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { ACRCloudService }    from './acrcloud/acrcloud.service';
import { AutentiqueService }  from './autentique/autentique.service';
import { SpotifyService }     from './spotify/spotify.service';
import { YouTubeService }     from './youtube/youtube.service';
import { DeezerService }      from './deezer/deezer.service';
import { SoundCloudService }  from './soundcloud/soundcloud.service';
import { AppleMusicService }  from './apple-music/apple-music.service';
import { InstagramService }   from './instagram/instagram.service';
import { TikTokService }      from './tiktok/tiktok.service';
import { GoogleAdsService }   from './google-ads/google-ads.service';
import { AbramusService }     from './abramus/abramus.service';
import { IntegrationBaseService } from './integration-base.service';
import { BullModule }         from '@nestjs/bullmq';
import { QUEUE_NAMES }        from '../../queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.STREAMING_SYNC }),
    BullModule.registerQueue({ name: QUEUE_NAMES.INTEGRATIONS_SYNC }),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationBaseService,
    ACRCloudService,
    AutentiqueService,
    SpotifyService,
    YouTubeService,
    DeezerService,
    SoundCloudService,
    AppleMusicService,
    InstagramService,
    TikTokService,
    GoogleAdsService,
    AbramusService,
  ],
  exports: [
    ACRCloudService,
    AutentiqueService,
    SpotifyService,
    YouTubeService,
    DeezerService,
    SoundCloudService,
    AppleMusicService,
    InstagramService,
    TikTokService,
    GoogleAdsService,
    AbramusService,
  ],
})
export class IntegrationsModule {}
```

### 8.2 — Atualizar apps/api/src/modules/integrations/integrations.controller.ts

Substituir completamente com o controller expandido:

```typescript
import {
  Controller, Get, Post, Delete, Body, Param, Query,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ACRCloudService }    from './acrcloud/acrcloud.service';
import { AutentiqueService }  from './autentique/autentique.service';
import { SpotifyService }     from './spotify/spotify.service';
import { YouTubeService }     from './youtube/youtube.service';
import { DeezerService }      from './deezer/deezer.service';
import { SoundCloudService }  from './soundcloud/soundcloud.service';
import { AppleMusicService }  from './apple-music/apple-music.service';
import { InstagramService }   from './instagram/instagram.service';
import { TikTokService }      from './tiktok/tiktok.service';
import { GoogleAdsService }   from './google-ads/google-ads.service';
import { AbramusService }     from './abramus/abramus.service';
import {
  ConfigureAutentiqueDto, SendForSignatureDto,
  RecognizeAudioDto, SpotifyConnectDto, SyncSpotifyArtistDto,
} from './dto/integrations.dto';

@ApiTags('Integrations')
@ApiBearerAuth('Clerk JWT')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly acrCloud:    ACRCloudService,
    private readonly autentique:  AutentiqueService,
    private readonly spotify:     SpotifyService,
    private readonly youtube:     YouTubeService,
    private readonly deezer:      DeezerService,
    private readonly soundcloud:  SoundCloudService,
    private readonly appleMusic:  AppleMusicService,
    private readonly instagram:   InstagramService,
    private readonly tiktok:      TikTokService,
    private readonly googleAds:   GoogleAdsService,
    private readonly abramus:     AbramusService,
  ) {}

  // ─── Status geral ──────────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Status de todas as integrações' })
  getStatus() {
    return {
      acrcloud:    { configured: this.acrCloud.isConfigured() },
      autentique:  { configured: true },
      spotify:     { configured: this.spotify.isConfigured() },
      youtube:     { configured: this.youtube.isConfigured() },
      deezer:      { configured: this.deezer.isConfigured() },
      soundcloud:  { configured: true },
      appleMusic:  { configured: true },
      instagram:   { configured: true },
      tiktok:      { configured: true },
      googleAds:   { configured: true },
      abramus:     { configured: true },
    };
  }

  // ─── ACRCloud ──────────────────────────────────────────────────────────────

  @Post('acrcloud/recognize')
  @ApiOperation({ summary: 'Identificar música por áudio' })
  @HttpCode(HttpStatus.OK)
  recognizeAudio(@Body() dto: RecognizeAudioDto) {
    return this.acrCloud.recognize(dto.audioBase64);
  }

  // ─── Autentique ────────────────────────────────────────────────────────────

  @Post('autentique/configure')
  @HttpCode(HttpStatus.OK)
  configureAutentique(@Request() req: any, @Body() dto: ConfigureAutentiqueDto) {
    return this.autentique.configure(req.tenantId, dto.apiToken);
  }

  @Post('autentique/send')
  sendForSignature(@Request() req: any, @Body() dto: SendForSignatureDto) {
    return this.autentique.sendForSignature({
      tenantId: req.tenantId, contractId: dto.contractId,
      name: dto.name, fileBase64: dto.fileBase64, signers: dto.signers,
    });
  }

  @Post('autentique/webhook')
  @HttpCode(HttpStatus.OK)
  autentiqueWebhook(@Body() payload: any) {
    return this.autentique.handleWebhook(payload);
  }

  // ─── Spotify ───────────────────────────────────────────────────────────────

  @Get('spotify/auth')
  spotifyAuthUrl(@Request() req: any) {
    return { url: this.spotify.getAuthUrl(req.tenantId, req.userId) };
  }

  @Post('spotify/callback')
  @HttpCode(HttpStatus.OK)
  spotifyCallback(@Body() dto: SpotifyConnectDto) {
    return this.spotify.handleCallback(dto.code, dto.state);
  }

  @Post('spotify/sync-artist')
  @HttpCode(HttpStatus.OK)
  syncSpotifyArtist(@Request() req: any, @Body() dto: SyncSpotifyArtistDto) {
    return this.spotify.syncArtistMetrics(req.tenantId, dto.spotifyArtistId);
  }

  @Delete('spotify/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  spotifyDisconnect(@Request() req: any) {
    return this.spotify.disconnect(req.tenantId, req.userId);
  }

  // ─── YouTube ───────────────────────────────────────────────────────────────

  @Get('youtube/status')
  youtubeStatus() { return { configured: this.youtube.isConfigured() }; }

  @Get('youtube/channel/:channelId')
  getYouTubeChannel(@Param('channelId') channelId: string) {
    return this.youtube.getChannelStats(channelId);
  }

  @Get('youtube/video/:videoId')
  getYouTubeVideo(@Param('videoId') videoId: string) {
    return this.youtube.getVideoStats(videoId);
  }

  @Get('youtube/search')
  searchYouTube(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.youtube.searchVideos(q, limit ? Number(limit) : 10);
  }

  // ─── Deezer ────────────────────────────────────────────────────────────────

  @Get('deezer/artist/:artistId')
  getDeezerArtist(@Param('artistId') artistId: string) {
    return this.deezer.getArtistStats(artistId);
  }

  @Get('deezer/artist/:artistId/top')
  getDeezerTopTracks(@Param('artistId') artistId: string, @Query('limit') limit?: string) {
    return this.deezer.getTopTracks(artistId, limit ? Number(limit) : 10);
  }

  @Get('deezer/album/:albumId')
  getDeezerAlbum(@Param('albumId') albumId: string) {
    return this.deezer.getAlbum(albumId);
  }

  @Get('deezer/search')
  searchDeezer(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.deezer.searchArtist(q, limit ? Number(limit) : 5);
  }

  // ─── SoundCloud ────────────────────────────────────────────────────────────

  @Post('soundcloud/configure')
  @HttpCode(HttpStatus.OK)
  configureSoundCloud(@Request() req: any, @Body() body: any) {
    return this.soundcloud.configure(req.tenantId, body);
  }

  @Get('soundcloud/status')
  getSoundCloudStatus(@Request() req: any) {
    return this.soundcloud.getStatus(req.tenantId);
  }

  @Delete('soundcloud/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectSoundCloud(@Request() req: any) {
    return this.soundcloud.disconnectProvider(req.tenantId);
  }

  @Get('soundcloud/user/:permalink')
  getSoundCloudUser(@Param('permalink') permalink: string) {
    return this.soundcloud.resolveUser(permalink);
  }

  @Get('soundcloud/track/:trackId')
  getSoundCloudTrack(@Param('trackId') trackId: string) {
    return this.soundcloud.getTrackStats(trackId);
  }

  @Get('soundcloud/search')
  searchSoundCloud(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.soundcloud.searchTracks(q, limit ? Number(limit) : 10);
  }

  // ─── Apple Music ───────────────────────────────────────────────────────────

  @Post('apple-music/configure')
  @HttpCode(HttpStatus.OK)
  configureAppleMusic(@Request() req: any, @Body() body: any) {
    return this.appleMusic.configure(req.tenantId, body);
  }

  @Get('apple-music/status')
  getAppleMusicStatus(@Request() req: any) {
    return this.appleMusic.getStatus(req.tenantId);
  }

  @Delete('apple-music/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectAppleMusic(@Request() req: any) {
    return this.appleMusic.disconnectProvider(req.tenantId);
  }

  @Get('apple-music/artist/:artistId')
  getAppleMusicArtist(@Request() req: any, @Param('artistId') artistId: string, @Query('storefront') storefront = 'br') {
    return this.appleMusic.getArtistFromCatalog(artistId, storefront, req.tenantId);
  }

  @Get('apple-music/search')
  searchAppleMusic(@Request() req: any, @Query('q') q: string, @Query('storefront') storefront = 'br') {
    return this.appleMusic.searchCatalog(q, storefront, req.tenantId);
  }

  // ─── Instagram ─────────────────────────────────────────────────────────────

  @Get('instagram/auth')
  instagramAuthUrl(@Request() req: any) {
    return { url: this.instagram.getAuthUrl(req.tenantId, req.userId) };
  }

  @Post('instagram/callback')
  @HttpCode(HttpStatus.OK)
  instagramCallback(@Body() body: { code: string; state: string }) {
    return this.instagram.handleCallback(body.code, body.state);
  }

  @Get('instagram/status')
  getInstagramStatus(@Request() req: any) {
    return this.instagram.getStatus(req.tenantId);
  }

  @Get('instagram/metrics')
  getInstagramMetrics(@Request() req: any) {
    return this.instagram.getAccountMetrics(req.tenantId, req.userId);
  }

  @Delete('instagram/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectInstagram(@Request() req: any) {
    return this.instagram.disconnectProvider(req.tenantId, req.userId);
  }

  // ─── TikTok ────────────────────────────────────────────────────────────────

  @Post('tiktok-ads/configure')
  @HttpCode(HttpStatus.OK)
  configureTikTokAds(@Request() req: any, @Body() body: any) {
    return this.tiktok.configureAds(req.tenantId, body);
  }

  @Get('tiktok-ads/status')
  getTikTokAdsStatus(@Request() req: any) {
    return this.tiktok.getAdsStatus(req.tenantId);
  }

  @Delete('tiktok-ads/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectTikTokAds(@Request() req: any) {
    return this.tiktok.disconnectAds(req.tenantId);
  }

  @Get('tiktok-ads/campaigns')
  getTikTokAdsCampaigns(@Request() req: any) {
    return this.tiktok.getAdsCampaigns(req.tenantId);
  }

  @Get('tiktok-ads/insights/:campaignId')
  getTikTokAdsInsights(@Request() req: any, @Param('campaignId') campaignId: string) {
    return this.tiktok.getAdsInsights(req.tenantId, campaignId);
  }

  @Get('tiktok/auth')
  tikTokOAuthUrl(@Request() req: any) {
    return { url: this.tiktok.getOAuthUrl(req.tenantId, req.userId) };
  }

  @Post('tiktok/callback')
  @HttpCode(HttpStatus.OK)
  tikTokCallback(@Body() body: { code: string; state: string }) {
    return this.tiktok.handleOAuthCallback(body.code, body.state);
  }

  // ─── Google Ads ────────────────────────────────────────────────────────────

  @Post('google-ads/configure')
  @HttpCode(HttpStatus.OK)
  configureGoogleAds(@Request() req: any, @Body() body: any) {
    return this.googleAds.configure(req.tenantId, body);
  }

  @Get('google-ads/auth')
  googleAdsAuthUrl(@Request() req: any) {
    return { url: this.googleAds.getOAuthUrl(req.tenantId, req.userId) };
  }

  @Post('google-ads/callback')
  @HttpCode(HttpStatus.OK)
  googleAdsCallback(@Body() body: { code: string; state: string }) {
    return this.googleAds.handleOAuthCallback(body.code, body.state);
  }

  @Get('google-ads/status')
  getGoogleAdsStatus(@Request() req: any) {
    return this.googleAds.getStatus(req.tenantId);
  }

  @Delete('google-ads/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectGoogleAds(@Request() req: any) {
    return this.googleAds.disconnectProvider(req.tenantId);
  }

  @Get('google-ads/campaigns')
  getGoogleAdsCampaigns(@Request() req: any) {
    return this.googleAds.getCampaigns(req.tenantId);
  }

  // ─── Abramus ───────────────────────────────────────────────────────────────

  @Post('abramus/configure')
  @HttpCode(HttpStatus.OK)
  configureAbramus(@Request() req: any, @Body() body: any) {
    return this.abramus.configure(req.tenantId, body);
  }

  @Get('abramus/status')
  getAbramusStatus(@Request() req: any) {
    return this.abramus.getStatus(req.tenantId);
  }

  @Delete('abramus/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectAbramus(@Request() req: any) {
    return this.abramus.disconnectProvider(req.tenantId);
  }

  @Get('abramus/search/artist')
  searchAbramusArtist(@Request() req: any, @Query('q') q: string) {
    return this.abramus.searchArtist(req.tenantId, q);
  }

  @Get('abramus/search/work')
  searchAbramusWork(@Request() req: any, @Query('titulo') titulo?: string, @Query('compositor') compositor?: string, @Query('isrc') isrc?: string) {
    return this.abramus.searchWork(req.tenantId, { titulo, compositor, isrc });
  }

  @Post('abramus/register/work')
  @HttpCode(HttpStatus.CREATED)
  registerAbramusWork(@Request() req: any, @Body() body: any) {
    return this.abramus.registerWork(req.tenantId, body);
  }

  @Get('abramus/statements')
  getAbramusStatements(@Request() req: any, @Query('periodo') periodo?: string, @Query('artista_id') artista_id?: string) {
    return this.abramus.getStatements(req.tenantId, { periodo, artista_id });
  }
}
```

---

## ETAPA 9 — ATUALIZAR ENV.SCHEMA.TS COM VARIÁVEIS DAS NOVAS INTEGRAÇÕES

Abrir apps/api/src/core/config/env.schema.ts e adicionar após as variáveis do Spotify:

```typescript
  // SoundCloud
  SOUNDCLOUD_CLIENT_ID:     z.string().optional(),
  SOUNDCLOUD_CLIENT_SECRET: z.string().optional(),

  // Meta (Facebook / Instagram)
  META_APP_ID:       z.string().optional(),
  META_APP_SECRET:   z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),

  // TikTok
  TIKTOK_CLIENT_KEY:    z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_REDIRECT_URI:  z.string().optional(),

  // Google Ads
  GOOGLE_ADS_CLIENT_ID:     z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_REDIRECT_URI:  z.string().optional(),
```

---

## ETAPA 10 — MIGRAR HOOKS FRONTEND PARA USAR BACKEND

### 10.1 — Atualizar client/src/modules/integrations/hooks/useSpotify.ts

Substituir as funções que usam `sessionStorage` para chamar o backend:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast }   from 'sonner';
import { api }     from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

// ─── Status ────────────────────────────────────────────────────────────────

export function useSpotifyStatus() {
  return useQuery({
    queryKey: ['integrations', 'spotify', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, status: 'mock', has_credentials: false })
      : api.get<any>('/integrations/status').then(r => ({ ...r.spotify, has_credentials: r.spotify?.configured })),
    staleTime: 60_000,
  });
}

// ─── Auth URL ──────────────────────────────────────────────────────────────

export function useSpotifyConnect() {
  return useMutation({
    mutationFn: async () => {
      if (MOCK_MODE) { toast.info('Mock mode — Spotify não disponível'); return; }
      const { url } = await api.get<{ url: string }>('/integrations/spotify/auth');
      window.open(url, '_blank', 'width=500,height=700');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Métricas de artista ────────────────────────────────────────────────────

export function useSpotifyArtistMetrics(spotifyArtistId?: string) {
  return useQuery({
    queryKey: ['integrations', 'spotify', 'artist', spotifyArtistId],
    queryFn:  () => api.post<any>('/integrations/spotify/sync-artist', { spotifyArtistId }),
    enabled:  !MOCK_MODE && !!spotifyArtistId,
    staleTime: 5 * 60_000,
  });
}

// ─── Disconnect ─────────────────────────────────────────────────────────────

export function useSpotifyDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/integrations/spotify/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'spotify'] });
      toast.success('Spotify desconectado.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
```

### 10.2 — Atualizar client/src/modules/integrations/hooks/useSoundCloud.ts

Substituir completamente:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast }   from 'sonner';
import { api }     from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useSoundCloudStatus() {
  return useQuery({
    queryKey: ['integrations', 'soundcloud', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, status: 'mock' })
      : api.get('/integrations/soundcloud/status'),
    staleTime: 60_000,
  });
}

export function useSoundCloudSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { client_id: string; client_secret: string; permalink?: string }) =>
      api.post('/integrations/soundcloud/configure', creds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'soundcloud'] });
      toast.success('SoundCloud configurado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSoundCloudDeleteCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/integrations/soundcloud/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'soundcloud'] });
      toast.success('SoundCloud desconectado.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSoundCloudUserMetrics(permalink?: string) {
  return useQuery({
    queryKey: ['integrations', 'soundcloud', 'user', permalink],
    queryFn:  () => api.get(`/integrations/soundcloud/user/${permalink}`),
    enabled:  !MOCK_MODE && !!permalink,
    staleTime: 5 * 60_000,
  });
}

export function useSoundCloudTrackMetrics(trackId?: string) {
  return useQuery({
    queryKey: ['integrations', 'soundcloud', 'track', trackId],
    queryFn:  () => api.get(`/integrations/soundcloud/track/${trackId}`),
    enabled:  !MOCK_MODE && !!trackId,
    staleTime: 5 * 60_000,
  });
}
```

### 10.3 — Atualizar client/src/modules/integrations/hooks/useAppleMusic.ts

Substituir completamente:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast }   from 'sonner';
import { api }     from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useAppleMusicStatus() {
  return useQuery({
    queryKey: ['integrations', 'apple-music', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, status: 'mock' })
      : api.get('/integrations/apple-music/status'),
    staleTime: 60_000,
  });
}

export function useAppleMusicSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { team_id: string; key_id: string; private_key: string; artist_id?: string }) =>
      api.post('/integrations/apple-music/configure', creds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'apple-music'] });
      toast.success('Apple Music configurado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAppleMusicArtistMetrics(artistId?: string) {
  return useQuery({
    queryKey: ['integrations', 'apple-music', 'artist', artistId],
    queryFn:  () => api.get(`/integrations/apple-music/artist/${artistId}`),
    enabled:  !MOCK_MODE && !!artistId,
    staleTime: 5 * 60_000,
  });
}

export function useAppleMusicDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/integrations/apple-music/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'apple-music'] });
      toast.success('Apple Music desconectado.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
```

### 10.4 — Atualizar client/src/modules/integrations/hooks/useInstagram.ts

Substituir completamente:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast }   from 'sonner';
import { api }     from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useInstagramStatus() {
  return useQuery({
    queryKey: ['integrations', 'instagram', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, status: 'mock' })
      : api.get('/integrations/instagram/status'),
    staleTime: 60_000,
  });
}

export function useInstagramConnect() {
  return useMutation({
    mutationFn: async () => {
      if (MOCK_MODE) { toast.info('Mock mode — Instagram não disponível'); return; }
      const { url } = await api.get<{ url: string }>('/integrations/instagram/auth');
      window.open(url, '_blank', 'width=600,height=700');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useInstagramAccountMetrics() {
  return useQuery({
    queryKey: ['integrations', 'instagram', 'metrics'],
    queryFn:  () => api.get('/integrations/instagram/metrics'),
    enabled:  !MOCK_MODE,
    staleTime: 5 * 60_000,
  });
}

export function useInstagramDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/integrations/instagram/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'instagram'] });
      toast.success('Instagram desconectado.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
```

### 10.5 — Atualizar client/src/modules/integrations/hooks/useTikTokAds.ts

Substituir completamente:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast }   from 'sonner';
import { api }     from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useTikTokAdsStatus() {
  return useQuery({
    queryKey: ['integrations', 'tiktok-ads', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, status: 'mock' })
      : api.get('/integrations/tiktok-ads/status'),
    staleTime: 60_000,
  });
}

export function useTikTokAdsSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { app_id: string; secret: string; advertiser_id?: string }) =>
      api.post('/integrations/tiktok-ads/configure', creds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'tiktok-ads'] });
      toast.success('TikTok Ads configurado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useTikTokAdsCampaigns() {
  return useQuery({
    queryKey: ['integrations', 'tiktok-ads', 'campaigns'],
    queryFn:  () => api.get('/integrations/tiktok-ads/campaigns'),
    enabled:  !MOCK_MODE,
    staleTime: 5 * 60_000,
  });
}

export function useTikTokAdsDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/integrations/tiktok-ads/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'tiktok-ads'] });
      toast.success('TikTok Ads desconectado.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
```

### 10.6 — Atualizar client/src/modules/integrations/hooks/useGoogleAds.ts

Substituir completamente:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast }   from 'sonner';
import { api }     from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useGoogleAdsStatus() {
  return useQuery({
    queryKey: ['integrations', 'google-ads', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, status: 'mock' })
      : api.get('/integrations/google-ads/status'),
    staleTime: 60_000,
  });
}

export function useGoogleAdsSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { developer_token: string; client_id: string; client_secret: string; customer_id?: string; manager_account_id?: string }) =>
      api.post('/integrations/google-ads/configure', creds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'google-ads'] });
      toast.success('Google Ads configurado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGoogleAdsConnect() {
  return useMutation({
    mutationFn: async () => {
      if (MOCK_MODE) return;
      const { url } = await api.get<{ url: string }>('/integrations/google-ads/auth');
      window.open(url, '_blank', 'width=600,height=700');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGoogleAdsCampaigns() {
  return useQuery({
    queryKey: ['integrations', 'google-ads', 'campaigns'],
    queryFn:  () => api.get('/integrations/google-ads/campaigns'),
    enabled:  !MOCK_MODE,
    staleTime: 5 * 60_000,
  });
}

export function useGoogleAdsDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/integrations/google-ads/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'google-ads'] });
      toast.success('Google Ads desconectado.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
```

### 10.7 — Atualizar client/src/modules/integrations/hooks/useAbramus.ts

Substituir as funções de credenciais/mock por chamadas ao backend.
Manter a interface dos tipos para não quebrar os componentes existentes.
Substituir apenas as funções de status, save e search:

```typescript
// Adicionar no topo (após os imports existentes):
import { api } from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

// Substituir useAbramusStatus — remover sessionStorage:
export function useAbramusStatus() {
  return useQuery({
    queryKey: ['integrations', 'abramus', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, status: 'mock', has_credentials: false })
      : api.get<any>('/integrations/abramus/status').then(s => ({
          ...s,
          has_credentials: s.connected,
          last_checked_at: new Date().toISOString(),
        })),
    staleTime: 60_000,
  });
}

// Substituir useAbramusSaveCredentials — remover sessionStorage:
export function useAbramusSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (creds: { username: string; base_url?: string; password: string }) =>
      api.post('/integrations/abramus/configure', creds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'abramus'] });
      toast.success('Abramus configurado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// Substituir useAbramusSearchArtist:
export function useAbramusSearchArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (query: string) =>
      MOCK_MODE
        ? Promise.resolve([])
        : api.get(`/integrations/abramus/search/artist?q=${encodeURIComponent(query)}`),
  });
}
```

### 10.8 — Atualizar client/src/modules/integrations/hooks/useYouTube.ts

Substituir completamente:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast }   from 'sonner';
import { api }     from '@/shared/lib/api-client';
import { MOCK_MODE } from '@/shared/lib/env';

export function useYouTubeStatus() {
  return useQuery({
    queryKey: ['integrations', 'youtube', 'status'],
    queryFn:  () => MOCK_MODE
      ? Promise.resolve({ connected: false, configured: false, status: 'mock' })
      : api.get('/integrations/youtube/status'),
    staleTime: 60_000,
  });
}

export function useYouTubeSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { api_key: string; channel_id?: string }) => {
      // YouTube usa api_key no backend via env var; apenas salvar channel_id
      return api.post('/integrations/soundcloud/configure', creds);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'youtube'] });
      toast.success('YouTube configurado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useYouTubeChannelMetrics(channelId?: string) {
  return useQuery({
    queryKey: ['integrations', 'youtube', 'channel', channelId],
    queryFn:  () => api.get(`/integrations/youtube/channel/${channelId}`),
    enabled:  !MOCK_MODE && !!channelId,
    staleTime: 5 * 60_000,
  });
}
```

---

## ETAPA 11 — VERIFICAR TYPECHECK E BUILD

```bash
cd apps/api
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
cd ../..
```

Erros mais prováveis e correções:

**Erro: `super(db, enc)` inválido porque os serviços estão estendendo `IntegrationBaseService`
mas os parâmetros injetados não batem:**

Para cada serviço que estende `IntegrationBaseService`, o `constructor` precisa
ter `@Inject(DRIZZLE_DB)` e `EncryptionService` como primeiros parâmetros.
Exemplo para SoundCloudService:
```typescript
constructor(
  @Inject(DRIZZLE_DB) db: DrizzleDB,
  enc: EncryptionService,
  private readonly config: ConfigService,
) {
  super(db, enc);
}
```

Adicionar os imports necessários em cada service:
```typescript
import { Inject }            from '@nestjs/common';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService } from '../../../core/security/encryption.service';
```

**Erro: `api.delete` não existe:** verificar que api-client.ts exporta método `delete`:
Se não existir, adicionar no api-client.ts:
```typescript
delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
```

```bash
cd apps/api && npm run build 2>&1 | tail -20
cd ../..
npm run build 2>&1 | tail -20
```

---

## ETAPA 12 — ATUALIZAR .env.example COM NOVAS VARIÁVEIS

Adicionar ao final do arquivo .env.example na raiz:

```bash
cat >> .env.example << 'EOF'

# ─── SoundCloud ────────────────────────────────────────────────────────────────
SOUNDCLOUD_CLIENT_ID=
SOUNDCLOUD_CLIENT_SECRET=

# ─── Meta (Facebook / Instagram) ──────────────────────────────────────────────
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://seuapp.com/oauth/meta/callback

# ─── TikTok ────────────────────────────────────────────────────────────────────
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://seuapp.com/oauth/tiktok/callback

# ─── Google Ads ────────────────────────────────────────────────────────────────
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REDIRECT_URI=https://seuapp.com/oauth/google-ads/callback
EOF
```

---

## VERIFICAÇÃO FINAL

```bash
echo "=== 1. Serviços criados? ==="
ls apps/api/src/modules/integrations/*/  2>/dev/null | grep "service.ts"

echo "=== 2. IntegrationBaseService existe? ==="
ls apps/api/src/modules/integrations/integration-base.service.ts 2>&1

echo "=== 3. Controller tem endpoints das novas integrações? ==="
grep -c "@Get\|@Post\|@Delete" apps/api/src/modules/integrations/integrations.controller.ts

echo "=== 4. Todos os serviços no módulo? ==="
grep "Service" apps/api/src/modules/integrations/integrations.module.ts | wc -l

echo "=== 5. Hooks frontend atualizados (sem sessionStorage)? ==="
grep -l "sessionStorage\|localStorage" \
  client/src/modules/integrations/hooks/useSpotify.ts \
  client/src/modules/integrations/hooks/useSoundCloud.ts \
  client/src/modules/integrations/hooks/useAppleMusic.ts \
  client/src/modules/integrations/hooks/useGoogleAds.ts \
  client/src/modules/integrations/hooks/useTikTokAds.ts \
  2>/dev/null

echo "=== 6. TypeScript errors? ==="
cd apps/api && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
cd ../..
```

Resultados esperados:
1. 11 service.ts listados
2. integration-base.service.ts existe
3. 30+ endpoints no controller
4. 12+ services no módulo
5. Nenhum arquivo com sessionStorage/localStorage
6. 0 erros TypeScript
```
