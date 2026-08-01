/**
 * instagram-token-refresh-cron.controller.ts
 *
 * Vercel Cron entry point for InstagramTokenRefreshScheduler.runCheck() — see
 * core/security/cron-auth.guard.ts and vercel.json's `crons` array.
 * GET, not POST: Vercel Cron always invokes via GET.
 */

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { CronAuthGuard } from '../../../core/security/cron-auth.guard';
import { InstagramTokenRefreshScheduler } from './instagram-token-refresh.scheduler';

@Controller('internal/cron')
export class InstagramTokenRefreshCronController {
  private readonly logger = new Logger(InstagramTokenRefreshCronController.name);

  constructor(private readonly scheduler: InstagramTokenRefreshScheduler) {}

  @Get('instagram-token-refresh')
  @UseGuards(CronAuthGuard)
  async run(): Promise<{ ok: true; checked: number; refreshed: number; failed: number }> {
    const result = await this.scheduler.runCheck();
    this.logger.log('instagram-token-refresh cron run completed');
    return { ok: true, ...result };
  }
}
