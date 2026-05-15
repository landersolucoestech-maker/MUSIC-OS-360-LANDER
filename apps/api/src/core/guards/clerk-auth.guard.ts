/**
 * core/guards/clerk-auth.guard.ts
 *
 * Guard global de autenticação via JWT do Supabase.
 * Valida o Bearer token em todas as rotas protegidas usando o
 * SUPABASE_JWT_SECRET (HS256) do projeto Supabase.
 * Rotas marcadas com @Public() são excluídas da validação.
 *
 * Claims Supabase:
 *   sub              → userId (UUID do usuário)
 *   email            → email
 *   role             → "authenticated" (papel padrão Supabase)
 *   app_metadata.org_id   → orgId do tenant
 *   app_metadata.role     → papel RBAC da aplicação
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

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
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token   = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    const claims = this.verifyToken(token);

    request.auth = {
      userId:    String(claims.sub ?? ''),
      sessionId: String(claims.session_id ?? claims.jti ?? ''),
      orgId:     claims.app_metadata?.org_id   ?? null,
      orgRole:   claims.app_metadata?.role     ?? null,
      claims:    claims as Record<string, unknown>,
    };

    return true;
  }

  private verifyToken(token: string): SupabaseClaims {
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');

    // Em desenvolvimento sem secret configurado, apenas decodifica sem verificar
    if (!secret || secret === 'dev_supabase_jwt_secret_placeholder') {
      this.logger.warn(
        'SUPABASE_JWT_SECRET não configurado — decodificando JWT sem verificação de assinatura. ' +
        'Configure em produção.',
      );
      try {
        const decoded = jwt.decode(token);
        if (!decoded || typeof decoded !== 'object') {
          throw new UnauthorizedException('Token inválido ou expirado');
        }
        const claims = decoded as SupabaseClaims;
        if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
          throw new UnauthorizedException('Token expirado');
        }
        return claims;
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        throw new UnauthorizedException('Token inválido ou expirado');
      }
    }

    try {
      const verified = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (typeof verified !== 'object' || verified === null) {
        throw new UnauthorizedException('Token inválido');
      }
      return verified as SupabaseClaims;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expirado');
      }
      this.logger.warn(`Falha na verificação do JWT: ${(err as Error).message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
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
