import { PartialType } from '@nestjs/swagger';
import { CreateEcadReportDto } from './create-ecad-report.dto';

export class UpdateEcadReportDto extends PartialType(CreateEcadReportDto) {}
