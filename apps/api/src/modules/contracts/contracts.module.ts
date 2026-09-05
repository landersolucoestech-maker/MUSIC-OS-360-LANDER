import { Module } from '@nestjs/common';
import { ContractsController }      from './contracts.controller';
import { ContractsService }         from './contracts.service';
import { ContractEventsHandler }    from './handlers/contract-events.handler';
import { ContractWorkflowHandler }  from './handlers/contract-workflow.handler';
import { ContractExpiryScheduler }  from './schedulers/contract-expiry.scheduler';
import { ActivityLogsModule }       from '../activity-logs/activity-logs.module';
import { FinancialRulesModule }     from '../financial-rules/financial-rules.module';

@Module({
  imports:     [ActivityLogsModule, FinancialRulesModule],
  controllers: [ContractsController],
  providers:   [ContractsService, ContractEventsHandler, ContractWorkflowHandler, ContractExpiryScheduler],
  exports:     [ContractsService],
})
export class ContractsModule {}
