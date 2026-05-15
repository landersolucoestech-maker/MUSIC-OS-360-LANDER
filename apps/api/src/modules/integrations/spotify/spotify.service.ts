import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectQueue }  from '@nestjs/bullmq';
import { Queue }        from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE }  from '../../../database/database.module';
import { OAuthConnectionEntity } from '../../../database/entities';
import { EncryptionService } from '../../../core/security/encryption.service';
import { QUEUE_NAMES }   from '../../../queues/queue.constants';

const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SPOTIFY_API      = 'https://api.spotify.com/v1';

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private readonly repo: Repository<OAuthConnectionEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly encryption: EncryptionService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.STREAMING_SYNC) private readonly syncQueue: Queue | null,
  ) {
    if (ds) this.repo = ds.getRepository(OAuthConnectionEntity);
  }

  isConfigured(): boolean {
    return !!(process.env['SPOTIFY_CLIENT_ID'] && process.env['SPOTIFY_CLIENT_SECRET']);
  }

  getAuthUrl(tenantId: string, userId: string): string {
    const clientId    = process.env['SPOTIFY_CLIENT_ID']   ?? '';
    const redirectUri = process.env['SPOTIFY_REDIRECT_URI'] ?? '';
    const state       = Buffer.from(JSON.stringify({ tenantId, userId })).toString('base64');
    const params      = new URLSearchParams({
      response_type: 'code', client_id: clientId, scope: 'user-read-private user-read-email',
      redirect_uri: redirectUri, state,
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

    if (this.syncQueue) await this.syncQueue.add('spotify:sync', { tenantId, userId }, { delay: 1000 });
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
    const existing  = await this.repo!
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId AND o.user_id = :userId AND o.provider = :provider', { tenantId, userId, provider: 'spotify' })
      .getOne();

    if (existing) {
      await this.repo!.update({ id: existing.id } as any, {
        access_token_encrypted:  this.encryption.encrypt(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token ? this.encryption.encrypt(tokens.refresh_token) : existing.refresh_token_encrypted,
        expires_at: expiresAt, updated_at: new Date(),
      } as any);
    } else {
      const entity = this.repo!.create({
        tenant_id: tenantId, user_id: userId, provider: 'spotify', expires_at: expiresAt,
        access_token_encrypted:  this.encryption.encrypt(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token ? this.encryption.encrypt(tokens.refresh_token) : null,
        scopes: 'user-read-private user-read-email',
      });
      await this.repo!.save(entity);
    }
  }

  async getValidToken(tenantId: string): Promise<string | null> {
    const conn = await this.repo!
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId AND o.provider = :provider', { tenantId, provider: 'spotify' })
      .getOne();
    if (!conn) return null;

    if (conn.expires_at && conn.expires_at < new Date()) {
      return this.refreshToken(conn);
    }
    return this.encryption.decrypt(conn.access_token_encrypted);
  }

  private async refreshToken(conn: OAuthConnectionEntity): Promise<string> {
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

    await this.repo!.update({ id: conn.id } as any, {
      access_token_encrypted: this.encryption.encrypt(data.access_token),
      expires_at: new Date(Date.now() + data.expires_in * 1000),
      updated_at: new Date(),
    } as any);

    return data.access_token as string;
  }

  async disconnect(tenantId: string, userId: string): Promise<void> {
    await this.repo!
      .createQueryBuilder()
      .delete()
      .from(OAuthConnectionEntity)
      .where('tenant_id = :tenantId AND user_id = :userId AND provider = :provider', { tenantId, userId, provider: 'spotify' })
      .execute();
  }
}
