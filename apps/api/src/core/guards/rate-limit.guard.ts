/**
 * core/guards/rate-limit.guard.ts
 *
 * RateLimitGuard — aplica rate limiting por categoria 'api' (120 req/min por tenant/IP).
 * Usar como @UseGuards(RateLimitGuard) em rotas específicas
 * ou registar como APP_GUARD para proteger toda a API.
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RateLimitService } from '../security/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request  = context.switchToHttp().getRequest<{
      tenant?: { id?: string };
      ip?:     string;
    }>();
    const identifier = request.tenant?.id ?? request.ip ?? 'unknown';
    await this.rateLimitService.check('api', identifier);
    return true;
  }
}
