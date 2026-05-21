import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService }    from './contracts.service';
import { ContractEventsHandler } from './handlers/contract-events.handler';

@Module({
  controllers: [ContractsController],
  providers:   [ContractsService, ContractEventsHandler],
  exports:     [ContractsService],
})
export class ContractsModule {}
