import { Module } from '@nestjs/common';
import { LeadsController }   from './leads.controller';
import { LeadsService }      from './leads.service';
import { LeadEventsHandler } from './handlers/lead-events.handler';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports:     [ActivityLogsModule],
  controllers: [LeadsController],
  providers:   [LeadsService, LeadEventsHandler],
  exports:     [LeadsService],
})
export class LeadsModule {}
