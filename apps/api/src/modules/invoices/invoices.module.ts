import { Module } from '@nestjs/common';
import { InvoicesController }       from './invoices.controller';
import { InvoicesService }          from './invoices.service';
import { InvoiceEventsHandler }     from './handlers/invoice-events.handler';
import { InvoiceOverdueScheduler }  from './schedulers/invoice-overdue.scheduler';
import { InvoiceOverdueCronController } from './schedulers/invoice-overdue-cron.controller';
import { ActivityLogsModule }       from '../activity-logs/activity-logs.module';

@Module({
  imports:     [ActivityLogsModule],
  controllers: [InvoicesController, InvoiceOverdueCronController],
  providers:   [InvoicesService, InvoiceEventsHandler, InvoiceOverdueScheduler],
  exports:     [InvoicesService],
})
export class InvoicesModule {}
