import { Module } from '@nestjs/common';
import { ContractServiceTypesController } from './contract-service-types.controller';
import { ContractServiceTypesService } from './contract-service-types.service';

@Module({
  controllers: [ContractServiceTypesController],
  providers: [ContractServiceTypesService],
  exports: [ContractServiceTypesService],
})
export class ContractServiceTypesModule {}
