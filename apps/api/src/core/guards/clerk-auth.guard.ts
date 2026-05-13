/**
 * core/guards/clerk-auth.guard.ts
 *
 * Guard global de autenticação via Clerk JWT.
 * Valida o Bearer token (ou cookie __session) em todas as rotas protegidas.
 * Rotas marcadas com @Public() são excluídas da validação.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';

export interface ClerkAuth {
  userId:    string;
  sessionId: string;
  orgId:     string | null;
  orgRole:   string | null;
  claims:    Record<string, unknown>;
}

declare module 'express' {
  interface Request {
    auth?:          ClerkAuth;
    tenant?:        Record<string, unknown>;
    currentMember?: Record<string, unknown>;
  }
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

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

    try {
      const secretKey = this.config.get<string>('CLERK_SECRET_KEY') ?? '';
      const payload   = await verifyToken(token, { secretKey });

      const claims = payload as unknown as Record<string, unknown>;

      request.auth = {
        userId:    payload.sub,
        sessionId: String(claims['sid'] ?? ''),
        orgId:     typeof claims['org_id'] === 'string'   ? claims['org_id']   : null,
        orgRole:   typeof claims['org_role'] === 'string' ? claims['org_role'] : null,
        claims,
      };

      return true;
    } catch (err) {
      this.logger.warn(`Token inválido: ${(err as Error).message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.['__session'] ?? null;
  }
}
