import { Module } from '@nestjs/common';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService }    from './support-tickets.service';
import { TicketEventsHandler }      from './handlers/ticket-events.handler';

@Module({
  controllers: [SupportTicketsController],
  providers:   [SupportTicketsService, TicketEventsHandler],
  exports:     [SupportTicketsService],
})
export class SupportTicketsModule {}
