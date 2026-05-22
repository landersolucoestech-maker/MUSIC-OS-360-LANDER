import { Module } from '@nestjs/common';
import { TransactionsController }     from './transactions.controller';
import { TransactionsService }        from './transactions.service';
import { TransactionEventsHandler }   from './handlers/transaction-events.handler';
import { ActivityLogsModule }         from '../activity-logs/activity-logs.module';

@Module({
  imports:     [ActivityLogsModule],
  controllers: [TransactionsController],
  providers:   [TransactionsService, TransactionEventsHandler],
  exports:     [TransactionsService],
})
export class TransactionsModule {}
