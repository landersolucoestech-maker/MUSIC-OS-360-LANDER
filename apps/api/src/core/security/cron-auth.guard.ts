/**
 * core/security/cron-auth.guard.ts
 *
 * Authenticates requests to /internal/cron/* endpoints — the Vercel Cron
 * replacement for the setInterval-based schedulers (ContractExpiryScheduler,
 * InvoiceOverdueScheduler, DunningService) that used to self-trigger inside
 * the long-lived Node process. Vercel Functions don't persist between
 * invocations, so these are now invoked externally on a schedule and must
 * authenticate the caller instead of trusting "this only runs inside our
 * own process."
 *
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on
 * requests it triggers when the project has a CRON_SECRET env var
 * configured (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 *
 * Fail-closed: if CRON_SECRET isn't configured, every request is denied —
 * matches this project's convention elsewhere (e.g. AUTENTIQUE_WEBHOOK_SECRET)
 * of never falling back to "allow" when a required secret is missing.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class CronAuthGuard implements CanActivate {
  private readonly logger = new Logger(CronAuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('CRON_SECRET');
    if (!secret) {
      this.logger.warn('CronAuthGuard: CRON_SECRET não configurado — negando (fail-closed)');
      throw new UnauthorizedException('Cron endpoint not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'];
    const expected = `Bearer ${secret}`;

    if (header !== expected) {
      this.logger.warn('CronAuthGuard: Authorization header ausente ou inválido');
      throw new UnauthorizedException('Invalid cron credentials');
    }

    return true;
  }
}
