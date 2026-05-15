/**
 * core/guards/clerk-auth.guard.ts
 *
 * Guard global de autenticação via JWT do Supabase.
 * Decodifica o Bearer token e valida expiração.
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

  constructor(private readonly reflector: Reflector) {}

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

    const claims = this.decodeToken(token);

    request.auth = {
      userId:    String(claims.sub ?? ''),
      sessionId: String(claims.session_id ?? claims.jti ?? ''),
      orgId:     claims.app_metadata?.org_id ?? null,
      orgRole:   claims.app_metadata?.role   ?? null,
      claims:    claims as Record<string, unknown>,
    };

    return true;
  }

  private decodeToken(token: string): SupabaseClaims {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded !== 'object') {
        throw new UnauthorizedException('Token inválido');
      }
      const claims = decoded as SupabaseClaims;
      if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expirado');
      }
      return claims;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`Falha ao decodificar JWT: ${(err as Error).message}`);
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
