/**
 * dunning-cron.controller.ts
 *
 * Vercel Cron entry point for DunningService.runDunningCycle() — see
 * core/security/cron-auth.guard.ts and vercel.json's `crons` array.
 * GET, not POST: Vercel Cron always invokes via GET.
 */

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { CronAuthGuard } from '../../core/security/cron-auth.guard';
import { DunningService } from './dunning.service';

@Controller('internal/cron')
export class DunningCronController {
  private readonly logger = new Logger(DunningCronController.name);

  constructor(private readonly dunning: DunningService) {}

  @Get('dunning')
  @UseGuards(CronAuthGuard)
  async run(): Promise<{ ok: true }> {
    await this.dunning.runDunningCycle();
    this.logger.log('dunning cron run completed');
    return { ok: true };
  }
}
