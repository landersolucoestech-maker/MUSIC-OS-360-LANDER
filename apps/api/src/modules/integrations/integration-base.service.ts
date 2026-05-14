import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and }               from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { integrations, oauthConnections } from '../../database/schema';
import { EncryptionService }     from '../../core/security/encryption.service';

@Injectable()
export class IntegrationBaseService {
  protected readonly logger = new Logger(IntegrationBaseService.name);

  constructor(
    @Inject(DRIZZLE_DB) protected readonly db: DrizzleDB,
    protected readonly enc: EncryptionService,
  ) {}

  // ── Credentials (API key / secret armazenados criptografados) ──────────────

  async saveCredentials(tenantId: string, provider: string, creds: Record<string, string>): Promise<void> {
    const credentials_encrypted = this.enc.encrypt(JSON.stringify(creds));
    const [existing] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)))
      .limit(1);

    if (existing) {
      await this.db.update(integrations)
        .set({ credentials_encrypted, status: 'connected', failure_count: 0, updated_at: new Date() })
        .where(eq(integrations.id, existing.id));
    } else {
      await this.db.insert(integrations).values({
        tenant_id: tenantId, provider, status: 'connected', credentials_encrypted,
      });
    }
  }

  async loadCredentials<T = Record<string, string>>(tenantId: string, provider: string): Promise<T | null> {
    const [row] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)))
      .limit(1);

    if (!row?.credentials_encrypted) return null;
    try {
      return JSON.parse(this.enc.decrypt(row.credentials_encrypted)) as T;
    } catch {
      return null;
    }
  }

  async getStatus(tenantId: string, provider: string): Promise<{ connected: boolean; last_sync_at: Date | null }> {
    const [row] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)))
      .limit(1);

    return {
      connected:    row?.status === 'connected',
      last_sync_at: row?.last_sync_at ?? null,
    };
  }

  async disconnect(tenantId: string, provider: string): Promise<void> {
    await this.db.update(integrations)
      .set({ status: 'disconnected', credentials_encrypted: null, updated_at: new Date() })
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, provider)));
  }

  // ── OAuth tokens ───────────────────────────────────────────────────────────

  async saveOAuthTokens(params: {
    tenantId:     string;
    userId:       string;
    provider:     string;
    accessToken:  string;
    refreshToken?: string;
    expiresIn?:   number;
    scopes?:      string;
  }): Promise<void> {
    const expiresAt = params.expiresIn
      ? new Date(Date.now() + params.expiresIn * 1000)
      : null;

    const [existing] = await this.db.select().from(oauthConnections)
      .where(and(
        eq(oauthConnections.tenant_id, params.tenantId),
        eq(oauthConnections.user_id,   params.userId),
        eq(oauthConnections.provider,  params.provider),
      ))
      .limit(1);

    const payload = {
      access_token_encrypted:  this.enc.encrypt(params.accessToken),
      refresh_token_encrypted: params.refreshToken ? this.enc.encrypt(params.refreshToken) : null,
      expires_at:  expiresAt,
      scopes:      params.scopes ?? null,
      updated_at:  new Date(),
    };

    if (existing) {
      await this.db.update(oauthConnections)
        .set({
          ...payload,
          refresh_token_encrypted: params.refreshToken
            ? this.enc.encrypt(params.refreshToken)
            : existing.refresh_token_encrypted,
        })
        .where(eq(oauthConnections.id, existing.id));
    } else {
      await this.db.insert(oauthConnections).values({
        tenant_id:  params.tenantId,
        user_id:    params.userId,
        provider:   params.provider,
        ...payload,
      });
    }
  }

  async getOAuthConnection(tenantId: string, userId: string, provider: string) {
    const [conn] = await this.db.select().from(oauthConnections)
      .where(and(
        eq(oauthConnections.tenant_id, tenantId),
        eq(oauthConnections.user_id,   userId),
        eq(oauthConnections.provider,  provider),
      ))
      .limit(1);

    if (!conn) return null;

    return {
      ...conn,
      accessToken:  this.enc.decrypt(conn.access_token_encrypted),
      refreshToken: conn.refresh_token_encrypted
        ? this.enc.decrypt(conn.refresh_token_encrypted)
        : null,
    };
  }

  async disconnectOAuth(tenantId: string, userId: string, provider: string): Promise<void> {
    await this.db.delete(oauthConnections)
      .where(and(
        eq(oauthConnections.tenant_id, tenantId),
        eq(oauthConnections.user_id,   userId),
        eq(oauthConnections.provider,  provider),
      ));
  }
}
