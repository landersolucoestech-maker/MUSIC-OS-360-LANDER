import { PartialType } from '@nestjs/mapped-types';
import { CreateEcadReportDto } from './create-ecad-report.dto';

export class UpdateEcadReportDto extends PartialType(CreateEcadReportDto) {}
