/**
 * invoice-overdue-cron.controller.ts
 *
 * Vercel Cron entry point for InvoiceOverdueScheduler.runCheck() — see
 * core/security/cron-auth.guard.ts and vercel.json's `crons` array.
 * GET, not POST: Vercel Cron always invokes via GET.
 */

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { CronAuthGuard } from '../../../core/security/cron-auth.guard';
import { InvoiceOverdueScheduler } from './invoice-overdue.scheduler';

@Controller('internal/cron')
export class InvoiceOverdueCronController {
  private readonly logger = new Logger(InvoiceOverdueCronController.name);

  constructor(private readonly scheduler: InvoiceOverdueScheduler) {}

  @Get('invoice-overdue')
  @UseGuards(CronAuthGuard)
  async run(): Promise<{ ok: true }> {
    await this.scheduler.runCheck();
    this.logger.log('invoice-overdue cron run completed');
    return { ok: true };
  }
}
