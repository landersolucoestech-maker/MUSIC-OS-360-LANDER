import { Module } from '@nestjs/common';
import { FinanceCategoryRulesController } from './finance-category-rules.controller';
import { FinanceCategoryRulesService }    from './finance-category-rules.service';

@Module({
  controllers: [FinanceCategoryRulesController],
  providers:   [FinanceCategoryRulesService],
  exports:     [FinanceCategoryRulesService],
})
export class FinanceCategoryRulesModule {}
