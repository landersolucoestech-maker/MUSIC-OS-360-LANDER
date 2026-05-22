/**
 * core/guards/rate-limit.guard.ts
 *
 * Global rate limiting guard.
 * Runs before JwtAuthGuard/TenantGuard, therefore it must not rely on tenant context.
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitService } from '../security/rate-limit.service';

function firstForwardedIp(value: unknown): string | null {
  if (Array.isArray(value)) return firstForwardedIp(value[0]);
  if (typeof value !== 'string') return null;
  const first = value.split(',')[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function clientIp(request: Request): string {
  return (
    firstForwardedIp(request.headers['cf-connecting-ip']) ??
    firstForwardedIp(request.headers['x-real-ip']) ??
    firstForwardedIp(request.headers['x-forwarded-for']) ??
    request.ip ??
    request.socket?.remoteAddress ??
    'unknown-ip'
  );
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const routeKey = `${request.method}:${request.route?.path ?? request.path ?? 'unknown-route'}`;
    const identifier = `${clientIp(request)}:${routeKey}`;
    await this.rateLimitService.check('api', identifier);
    return true;
  }
}
