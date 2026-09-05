import { Module } from '@nestjs/common';
import { InvoicesController }       from './invoices.controller';
import { InvoicesService }          from './invoices.service';
import { InvoiceEventsHandler }     from './handlers/invoice-events.handler';
import { InvoiceOverdueScheduler }  from './schedulers/invoice-overdue.scheduler';
import { ActivityLogsModule }       from '../activity-logs/activity-logs.module';
import { FinancialRulesModule }     from '../financial-rules/financial-rules.module';

@Module({
  imports:     [ActivityLogsModule, FinancialRulesModule],
  controllers: [InvoicesController],
  providers:   [InvoicesService, InvoiceEventsHandler, InvoiceOverdueScheduler],
  exports:     [InvoicesService],
})
export class InvoicesModule {}
