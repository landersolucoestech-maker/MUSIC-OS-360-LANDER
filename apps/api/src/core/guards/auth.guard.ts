/**
 * core/guards/auth.guard.ts
 *
 * Guard global de autenticaÃ§Ã£o via JWT do Supabase.
 * Verifica assinatura usando o JWKS pÃºblico do Supabase (ES256).
 * Rotas marcadas com @Public() sÃ£o excluÃ­das da validaÃ§Ã£o.
 *
 * JWKS endpoint: https://<SUPABASE_URL>/auth/v1/.well-known/jwks.json
 *
 * Claims Supabase:
 *   sub                  â†’ userId (UUID)
 *   email                â†’ email do usuÃ¡rio
 *   role                 â†’ "authenticated" (padrÃ£o Supabase)
 *   app_metadata.org_id  â†’ orgId do tenant
 *   app_metadata.role    â†’ papel RBAC da aplicaÃ§Ã£o
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

declare module 'express' {
  interface Request {
    auth?:          JwtAuth;
    tenant?:        Record<string, unknown>;
    currentMember?: Record<string, unknown>;
  }
}

export interface AuthClaims {
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
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new Error('SUPABASE_URL is required in production');
      }
      this.logger.error(
        'SUPABASE_URL nÃ£o configurado â€” JwtAuthGuard nÃ£o conseguirÃ¡ validar tokens. ' +
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


    const request = context.switchToHttp().getRequest<Request>();
    const token   = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticaÃ§Ã£o ausente');
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

  private verifyToken(token: string): Promise<AuthClaims> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        if (!header.kid) {
          return callback(new Error('JWT sem kid â€” nÃ£o Ã© possÃ­vel buscar chave JWKS'));
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
            this.logger.warn(`Falha na verificaÃ§Ã£o do JWT: ${err.message}`);
            return reject(new UnauthorizedException('Token invÃ¡lido ou expirado'));
          }
          if (!decoded || typeof decoded !== 'object') {
            return reject(new UnauthorizedException('Token invÃ¡lido'));
          }
          resolve(decoded as AuthClaims);
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
