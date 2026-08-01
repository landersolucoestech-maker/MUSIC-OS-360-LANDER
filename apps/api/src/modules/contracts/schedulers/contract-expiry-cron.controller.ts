/**
 * contract-expiry-cron.controller.ts
 *
 * Vercel Cron entry point for ContractExpiryScheduler.runCheck() — see
 * core/security/cron-auth.guard.ts and vercel.json's `crons` array.
 * GET, not POST: Vercel Cron always invokes via GET.
 */

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { CronAuthGuard } from '../../../core/security/cron-auth.guard';
import { ContractExpiryScheduler } from './contract-expiry.scheduler';

@Controller('internal/cron')
export class ContractExpiryCronController {
  private readonly logger = new Logger(ContractExpiryCronController.name);

  constructor(private readonly scheduler: ContractExpiryScheduler) {}

  @Get('contract-expiry')
  @UseGuards(CronAuthGuard)
  async run(): Promise<{ ok: true }> {
    await this.scheduler.runCheck();
    this.logger.log('contract-expiry cron run completed');
    return { ok: true };
  }
}
