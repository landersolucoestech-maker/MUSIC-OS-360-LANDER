/**
 * core/guards/clerk-auth.guard.ts
 *
 * Guard global de autenticação via JWT.
 * Valida o Bearer token (ou cookie musicos360_rt) em todas as rotas protegidas.
 * Rotas marcadas com @Public() são excluídas da validação.
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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const raw = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const padded = raw + '='.repeat((4 - raw.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
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

    const claims = decodeJwtPayload(token);

    if (!claims) {
      this.logger.warn('Token JWT malformado');
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    if (typeof claims['exp'] === 'number' && claims['exp'] * 1000 < Date.now()) {
      throw new UnauthorizedException('Token expirado');
    }

    request.auth = {
      userId:    String(claims['sub'] ?? ''),
      sessionId: String(claims['sid'] ?? claims['jti'] ?? ''),
      orgId:     typeof claims['org_id'] === 'string'   ? claims['org_id']   : null,
      orgRole:   typeof claims['org_role'] === 'string' ? claims['org_role'] : null,
      claims,
    };

    return true;
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.['musicos360_rt'] ?? null;
  }
}

/** @deprecated use JwtAuthGuard */
export { JwtAuthGuard as ClerkAuthGuard };
