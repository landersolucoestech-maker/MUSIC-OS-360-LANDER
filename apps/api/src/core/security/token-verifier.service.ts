/**
 * core/security/token-verifier.service.ts
 *
 * Centralised JWT verification used by HTTP JwtAuthGuard and WS gateway.
 * Supports both Supabase JWKS (production) and HS256 dev fallback signed with
 * ENCRYPTION_KEY + issuer "music-os-360-dev" — matches dev-auth.controller flow.
 */

import { Global, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import type * as jwksRsaType from 'jwks-rsa';

// Lazy-loaded to avoid Jest parse errors when test suites that only need
// HTTP guards transitively import this file (jwks-rsa uses syntax ts-jest
// doesn't transform by default).
type JwksRsaFn = (options: jwksRsaType.Options) => jwksRsaType.JwksClient;
let _jwksRsa: JwksRsaFn | null = null;
function getJwksRsa(): JwksRsaFn {
  if (!_jwksRsa) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _jwksRsa = require('jwks-rsa');
  }
  return _jwksRsa!;
}

const DEV_ISSUER = 'music-os-360-dev';

export interface VerifiedClaims {
  sub: string;
  sessionId: string;
  orgId: string | null;
  orgRole: string | null;
  raw: Record<string, unknown>;
}

function normalizeSupabaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

@Global()
@Injectable()
export class TokenVerifierService implements OnModuleInit {
  private readonly logger = new Logger(TokenVerifierService.name);
  private jwksClient!: jwksRsaType.JwksClient;
  private issuer!: string;
  private readonly audience = 'authenticated';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const supabaseUrl = normalizeSupabaseUrl(
      this.config.get<string>('SUPABASE_URL') ?? process.env['VITE_SUPABASE_URL'] ?? '',
    );
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required for TokenVerifierService');
    }
    this.issuer = `${supabaseUrl}/auth/v1`;
    const jwksUri = `${this.issuer}/.well-known/jwks.json`;
    this.jwksClient = getJwksRsa()({
      jwksUri,
      cache: true,
      cacheMaxAge: 60 * 60 * 1000,
      rateLimit: true,
    });
  }

  /** Try the local HS256 dev token first; null if not signed by ENCRYPTION_KEY. */
  tryVerifyDevToken(token: string): Record<string, unknown> | null {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (isProd) return null;
    const secret = this.config.get<string>('ENCRYPTION_KEY');
    if (!secret) return null;
    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: DEV_ISSUER,
      });
      if (typeof decoded !== 'object' || !decoded) return null;
      return decoded as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /** Full Supabase ES256 verification via JWKS. */
  verifyProdToken(token: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        if (!header.kid) return callback(new Error('JWT kid missing'));
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };
      jwt.verify(
        token,
        getKey,
        { algorithms: ['ES256'], issuer: this.issuer, audience: this.audience },
        (err, decoded) => {
          if (err) return reject(err);
          if (!decoded || typeof decoded !== 'object') return reject(new Error('Invalid token'));
          resolve(decoded as Record<string, unknown>);
        },
      );
    });
  }

  /** Verify and normalise — used by both HTTP guard and WS gateway. */
  async verify(token: string): Promise<VerifiedClaims> {
    let claims = this.tryVerifyDevToken(token);
    if (!claims) {
      claims = await this.verifyProdToken(token);
    }
    const sub = String(claims['sub'] ?? '');
    if (!sub) throw new Error('JWT subject missing');
    const appMeta = (claims['app_metadata'] ?? {}) as { org_id?: string; role?: string };
    return {
      sub,
      sessionId: String(claims['session_id'] ?? claims['jti'] ?? ''),
      orgId: appMeta.org_id ?? null,
      orgRole: appMeta.role ?? null,
      raw: claims,
    };
  }
}
