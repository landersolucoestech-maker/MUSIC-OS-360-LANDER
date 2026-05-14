import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { eq, and }               from 'drizzle-orm';
import * as crypto               from 'crypto';
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

  // ── Status via oauth_connections (OAuth-only providers) ────────────────────

  async getOAuthStatus(tenantId: string, userId: string, provider: string): Promise<{ connected: boolean }> {
    const [conn] = await this.db.select({ id: oauthConnections.id }).from(oauthConnections)
      .where(and(
        eq(oauthConnections.tenant_id, tenantId),
        eq(oauthConnections.user_id,   userId),
        eq(oauthConnections.provider,  provider),
      ))
      .limit(1);
    return { connected: !!conn };
  }

  // ── Signed OAuth state (HMAC-SHA256) ───────────────────────────────────────

  /** TTL máximo do state OAuth: 10 minutos */
  private static readonly STATE_TTL_MS = 10 * 60 * 1_000;

  buildSignedState(payload: Record<string, string>): string {
    const full    = { ...payload, iat: String(Date.now()) };
    const json    = JSON.stringify(full);
    const b64     = Buffer.from(json).toString('base64url');
    const hmacKey = this.enc.getKeyBytes();
    const sig     = crypto.createHmac('sha256', hmacKey).update(b64).digest('base64url');
    return `${b64}.${sig}`;
  }

  verifySignedState(state: string): Record<string, string> {
    if (typeof state !== 'string' || state.length > 2048) {
      throw new UnauthorizedException('OAuth state inválido');
    }

    const dot = state.lastIndexOf('.');
    if (dot === -1 || dot === 0 || dot === state.length - 1) {
      throw new UnauthorizedException('OAuth state malformado');
    }

    const b64 = state.slice(0, dot);
    const sig  = state.slice(dot + 1);

    const hmacKey  = this.enc.getKeyBytes();
    const expected = crypto.createHmac('sha256', hmacKey).update(b64).digest('base64url');

    // Guard: ambos devem ter o mesmo comprimento para timingSafeEqual não lançar
    const sigBuf  = Buffer.from(sig,      'base64url');
    const expBuf  = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('OAuth state com assinatura inválida');
    }

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8')) as Record<string, string>;
    } catch {
      throw new UnauthorizedException('OAuth state malformado');
    }

    // Verificar TTL
    const iat = Number(parsed['iat'] ?? 0);
    if (!iat || Date.now() - iat > IntegrationBaseService.STATE_TTL_MS) {
      throw new UnauthorizedException('OAuth state expirado');
    }

    return parsed;
  }
}
