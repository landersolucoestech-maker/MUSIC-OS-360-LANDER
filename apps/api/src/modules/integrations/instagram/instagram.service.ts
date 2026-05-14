import { Injectable, Inject } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { EncryptionService }  from '../../../core/security/encryption.service';
import { IntegrationBaseService } from '../integration-base.service';

const META_API   = 'https://graph.facebook.com/v19.0';
const PROVIDER   = 'instagram';
const SCOPES     = 'instagram_basic,instagram_manage_insights,pages_show_list';

@Injectable()
export class InstagramService extends IntegrationBaseService {
  constructor(
    @Inject(DRIZZLE_DB) db: DrizzleDB,
    enc: EncryptionService,
    private readonly config: ConfigService,
  ) {
    super(db, enc);
  }

  isConfigured(): boolean {
    return !!(this.config.get('META_APP_ID') && this.config.get('META_APP_SECRET'));
  }

  getAuthUrl(tenantId: string, userId: string): string {
    const appId      = this.config.get<string>('META_APP_ID') ?? '';
    const redirectUri = this.config.get<string>('META_REDIRECT_URI') ?? '';
    const state       = Buffer.from(JSON.stringify({ tenantId, userId, provider: PROVIDER })).toString('base64');
    const params      = new URLSearchParams({
      client_id:     appId,
      redirect_uri:  redirectUri,
      scope:         SCOPES,
      response_type: 'code',
      state,
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const { tenantId, userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const appId       = this.config.get<string>('META_APP_ID')       ?? '';
    const appSecret   = this.config.get<string>('META_APP_SECRET')   ?? '';
    const redirectUri = this.config.get<string>('META_REDIRECT_URI') ?? '';

    // 1. Trocar code por short-lived token
    const tokenRes = await fetch(
      `${META_API}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
    );
    const shortToken = await tokenRes.json() as any;
    if (shortToken.error) throw new Error(shortToken.error.message);

    // 2. Trocar por long-lived token (~60 dias)
    const longRes = await fetch(
      `${META_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken.access_token}`,
    );
    const longToken = await longRes.json() as any;
    if (longToken.error) throw new Error(longToken.error.message);

    await this.saveOAuthTokens({
      tenantId,
      userId,
      provider:    PROVIDER,
      accessToken: longToken.access_token,
      expiresIn:   longToken.expires_in ?? 5_184_000, // 60 dias
      scopes:      SCOPES,
    });

    this.logger.log(`Instagram OAuth: ${userId}@${tenantId} conectado`);
  }

  async getProviderStatus(tenantId: string) {
    return this.getStatus(tenantId, PROVIDER);
  }

  async disconnectProvider(tenantId: string, userId: string): Promise<void> {
    await this.disconnectOAuth(tenantId, userId, PROVIDER);
  }

  async getAccountMetrics(tenantId: string, userId: string) {
    const conn = await this.getOAuthConnection(tenantId, userId, PROVIDER);
    if (!conn) return { error: 'Instagram não conectado' };

    const token = conn.accessToken;

    // Buscar páginas vinculadas
    const pagesRes = await fetch(`${META_API}/me/accounts?access_token=${token}`);
    const pages    = await pagesRes.json() as any;
    if (pages.error) return { error: pages.error.message };

    const pageData = pages.data?.[0];
    if (!pageData) return { error: 'Nenhuma página Facebook encontrada' };

    // Buscar conta Instagram Business vinculada à página
    const igRes = await fetch(
      `${META_API}/${pageData.id}?fields=instagram_business_account&access_token=${pageData.access_token}`,
    );
    const igData = await igRes.json() as any;
    const igId   = igData.instagram_business_account?.id;
    if (!igId) return { error: 'Conta Instagram Business não encontrada' };

    // Métricas da conta
    const metricsRes = await fetch(
      `${META_API}/${igId}?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${pageData.access_token}`,
    );
    const metrics = await metricsRes.json() as any;
    return {
      instagramId:    igId,
      username:       metrics.username ?? '',
      name:           metrics.name ?? '',
      biography:      metrics.biography ?? '',
      followers:      metrics.followers_count ?? 0,
      following:      metrics.follows_count ?? 0,
      mediaCount:     metrics.media_count ?? 0,
      profilePicture: metrics.profile_picture_url ?? '',
      syncedAt:       new Date().toISOString(),
    };
  }
}
