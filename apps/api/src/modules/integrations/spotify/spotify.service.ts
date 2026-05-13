import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, and }               from 'drizzle-orm';
import { InjectQueue }           from '@nestjs/bullmq';
import { Queue }                 from 'bullmq';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { oauthConnections, OAuthConnection } from '../../../database/schema';
import { EncryptionService }     from '../../../core/security/encryption.service';
import { QUEUE_NAMES }           from '../../../queues/queue.constants';

const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SPOTIFY_API      = 'https://api.spotify.com/v1';

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    @InjectQueue(QUEUE_NAMES.STREAMING_SYNC) private readonly syncQueue: Queue,
  ) {}

  isConfigured(): boolean {
    return !!(process.env['SPOTIFY_CLIENT_ID'] && process.env['SPOTIFY_CLIENT_SECRET']);
  }

  getAuthUrl(tenantId: string, userId: string): string {
    const clientId   = process.env['SPOTIFY_CLIENT_ID']   ?? '';
    const redirectUri = process.env['SPOTIFY_REDIRECT_URI'] ?? '';
    const state       = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');
    const params      = new URLSearchParams({
      response_type: 'code',
      client_id:     clientId,
      scope:         'user-read-private user-read-email',
      redirect_uri:  redirectUri,
      state,
    });
    return `${SPOTIFY_ACCOUNTS}/authorize?${params}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const { tenantId, userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const clientId      = process.env['SPOTIFY_CLIENT_ID']     ?? '';
    const clientSecret  = process.env['SPOTIFY_CLIENT_SECRET'] ?? '';
    const redirectUri   = process.env['SPOTIFY_REDIRECT_URI']  ?? '';

    const tokenRes = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });

    const tokens = await tokenRes.json() as any;
    await this.upsertConnection(tenantId, userId, tokens);

    await this.syncQueue.add('spotify:sync', { tenantId, userId }, { delay: 1000 });
    this.logger.log(`Spotify OAuth: ${userId}@${tenantId} conectado`);
  }

  async syncArtistMetrics(tenantId: string, spotifyArtistId: string): Promise<{ followers: number; popularity: number } | null> {
    const token = await this.getValidToken(tenantId);
    if (!token) return null;

    const res  = await fetch(`${SPOTIFY_API}/artists/${spotifyArtistId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json() as any;

    this.logger.log(`Spotify: ${data.name} — ${data.followers?.total?.toLocaleString()} followers`);
    return { followers: data.followers?.total ?? 0, popularity: data.popularity ?? 0 };
  }

  private async upsertConnection(tenantId: string, userId: string, tokens: any): Promise<void> {
    const expiresAt = new Date(Date.now() + (tokens.expires_in as number) * 1000);
    const [existing] = await this.db.select().from(oauthConnections)
      .where(and(eq(oauthConnections.tenant_id, tenantId), eq(oauthConnections.user_id, userId), eq(oauthConnections.provider, 'spotify')))
      .limit(1);

    if (existing) {
      await this.db.update(oauthConnections).set({
        access_token_encrypted:  this.encryption.encrypt(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token ? this.encryption.encrypt(tokens.refresh_token) : existing.refresh_token_encrypted,
        expires_at:  expiresAt,
        updated_at:  new Date(),
      }).where(eq(oauthConnections.id, existing.id));
    } else {
      await this.db.insert(oauthConnections).values({
        tenant_id: tenantId, user_id: userId, provider: 'spotify', expires_at: expiresAt,
        access_token_encrypted:  this.encryption.encrypt(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token ? this.encryption.encrypt(tokens.refresh_token) : null,
        scopes: 'user-read-private user-read-email',
      });
    }
  }

  async getValidToken(tenantId: string): Promise<string | null> {
    const [conn] = await this.db.select().from(oauthConnections)
      .where(and(eq(oauthConnections.tenant_id, tenantId), eq(oauthConnections.provider, 'spotify')))
      .limit(1);
    if (!conn) return null;

    if (conn.expires_at && conn.expires_at < new Date()) {
      return this.refreshToken(conn);
    }
    return this.encryption.decrypt(conn.access_token_encrypted);
  }

  private async refreshToken(conn: OAuthConnection): Promise<string> {
    const clientId     = process.env['SPOTIFY_CLIENT_ID']     ?? '';
    const clientSecret = process.env['SPOTIFY_CLIENT_SECRET'] ?? '';
    const refreshToken = this.encryption.decrypt(conn.refresh_token_encrypted ?? '');

    const res  = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    const data = await res.json() as any;

    await this.db.update(oauthConnections).set({
      access_token_encrypted: this.encryption.encrypt(data.access_token),
      expires_at:             new Date(Date.now() + data.expires_in * 1000),
      updated_at:             new Date(),
    }).where(eq(oauthConnections.id, conn.id));

    return data.access_token as string;
  }

  async disconnect(tenantId: string, userId: string): Promise<void> {
    await this.db.delete(oauthConnections)
      .where(and(eq(oauthConnections.tenant_id, tenantId), eq(oauthConnections.user_id, userId), eq(oauthConnections.provider, 'spotify')));
  }
}
