import { Module } from '@nestjs/common';
import { FinancialRulesController } from './financial-rules.controller';
import { FinancialRulesService }    from './financial-rules.service';

@Module({
  controllers: [FinancialRulesController],
  providers:   [FinancialRulesService],
  exports:     [FinancialRulesService],
})
export class FinancialRulesModule {}
