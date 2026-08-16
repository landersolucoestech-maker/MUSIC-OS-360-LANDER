import { Module } from '@nestjs/common';
import { TransactionsController }     from './transactions.controller';
import { TransactionsService }        from './transactions.service';
import { TransactionEventsHandler }   from './handlers/transaction-events.handler';
import { ActivityLogsModule }         from '../activity-logs/activity-logs.module';
import { FinanceCategoryRulesModule } from '../finance-category-rules/finance-category-rules.module';

@Module({
  imports:     [ActivityLogsModule, FinanceCategoryRulesModule],
  controllers: [TransactionsController],
  providers:   [TransactionsService, TransactionEventsHandler],
  exports:     [TransactionsService],
})
export class TransactionsModule {}
