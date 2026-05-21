import { Module } from '@nestjs/common';
import { CrmService }                                                              from './crm.service';
import { CrmCompaniesController, CrmContactsController, CrmTagsController, CrmTasksController } from './crm.controller';

@Module({
  controllers: [CrmCompaniesController, CrmContactsController, CrmTagsController, CrmTasksController],
  providers:   [CrmService],
  exports:     [CrmService],
})
export class CrmModule {}
