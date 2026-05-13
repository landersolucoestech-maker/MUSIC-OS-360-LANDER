import { Module } from '@nestjs/common';
import { EcadReportsController } from './ecad-reports.controller';
import { EcadReportsService }    from './ecad-reports.service';

@Module({
  controllers: [EcadReportsController],
  providers:   [EcadReportsService],
  exports:     [EcadReportsService],
})
export class EcadReportsModule {}
