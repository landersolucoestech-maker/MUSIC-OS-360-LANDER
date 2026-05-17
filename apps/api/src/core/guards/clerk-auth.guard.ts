/**
 * core/guards/clerk-auth.guard.ts
 *
 * Guard global de autenticação via JWT do Supabase.
 * Verifica assinatura usando o JWKS público do Supabase (ES256).
 * Rotas marcadas com @Public() são excluídas da validação.
 *
 * JWKS endpoint: https://<SUPABASE_URL>/auth/v1/.well-known/jwks.json
 *
 * Claims Supabase:
 *   sub                  → userId (UUID)
 *   email                → email do usuário
 *   role                 → "authenticated" (padrão Supabase)
 *   app_metadata.org_id  → orgId do tenant
 *   app_metadata.role    → papel RBAC da aplicação
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';

export const IS_PUBLIC_KEY = 'isPublic';

export interface JwtAuth {
  userId:    string;
  sessionId: string;
  orgId:     string | null;
  orgRole:   string | null;
  claims:    Record<string, unknown>;
}

/** @deprecated use JwtAuth */
export type ClerkAuth = JwtAuth;

declare module 'express' {
  interface Request {
    auth?:          JwtAuth;
    tenant?:        Record<string, unknown>;
    currentMember?: Record<string, unknown>;
  }
}

interface SupabaseClaims {
  sub?:           string;
  email?:         string;
  role?:          string;
  aud?:           string | string[];
  exp?:           number;
  iat?:           number;
  jti?:           string;
  session_id?:    string;
  app_metadata?:  { org_id?: string; role?: string; [key: string]: unknown };
  user_metadata?: Record<string, unknown>;
  [key: string]:  unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwksClient!: jwksRsa.JwksClient;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const supabaseUrl =
      this.config.get<string>('SUPABASE_URL') ??
      process.env['VITE_SUPABASE_URL'] ??
      '';

    if (!supabaseUrl) {
      this.logger.error(
        'SUPABASE_URL não configurado — JwtAuthGuard não conseguirá validar tokens. ' +
        'Defina SUPABASE_URL (ou VITE_SUPABASE_URL) nas Secrets do Replit.',
      );
    }

    const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    this.logger.log(`JWKS endpoint: ${jwksUri}`);

    this.jwksClient = jwksRsa({
      jwksUri,
      cache:       true,
      cacheMaxAge: 60 * 60 * 1000, // 1 hora
      rateLimit:   true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // ── DEV AUTH BYPASS ────────────────────────────────────────────────────────
    // Nunca activo em produção (NODE_ENV=production).
    if (
      process.env['DEV_AUTH_BYPASS'] === 'true' &&
      process.env['NODE_ENV'] !== 'production'
    ) {
      const request = context.switchToHttp().getRequest<Request>();
      request.auth = {
        userId:    'dev-user',
        sessionId: 'dev-session',
        orgId:     'dev-org',
        orgRole:   'owner',
        claims:    { sub: 'dev-user', email: 'dev@musicos360.local', app_metadata: { org_id: 'dev-org', role: 'owner' } },
      };
      this.logger.warn('[DEV AUTH BYPASS] JwtAuthGuard bypassed — req.auth injectado com dev-user/owner');
      return true;
    }
    // ──────────────────────────────────────────────────────────────────────────

    const request = context.switchToHttp().getRequest<Request>();
    const token   = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    const claims = await this.verifyToken(token);

    request.auth = {
      userId:    String(claims.sub ?? ''),
      sessionId: String(claims.session_id ?? claims.jti ?? ''),
      orgId:     claims.app_metadata?.org_id ?? null,
      orgRole:   claims.app_metadata?.role   ?? null,
      claims:    claims as Record<string, unknown>,
    };

    return true;
  }

  private verifyToken(token: string): Promise<SupabaseClaims> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        if (!header.kid) {
          return callback(new Error('JWT sem kid — não é possível buscar chave JWKS'));
        }
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };

      jwt.verify(
        token,
        getKey,
        { algorithms: ['ES256'] },
        (err, decoded) => {
          if (err) {
            if (err instanceof jwt.TokenExpiredError) {
              return reject(new UnauthorizedException('Token expirado'));
            }
            this.logger.warn(`Falha na verificação do JWT: ${err.message}`);
            return reject(new UnauthorizedException('Token inválido ou expirado'));
          }
          if (!decoded || typeof decoded !== 'object') {
            return reject(new UnauthorizedException('Token inválido'));
          }
          resolve(decoded as SupabaseClaims);
        },
      );
    });
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return null;
  }
}

/** @deprecated use JwtAuthGuard */
export { JwtAuthGuard as ClerkAuthGuard };
