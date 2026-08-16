import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateEcadReportDto } from './create-ecad-report.dto';

export class UpdateEcadReportDto extends PartialType(CreateEcadReportDto) {
  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}
