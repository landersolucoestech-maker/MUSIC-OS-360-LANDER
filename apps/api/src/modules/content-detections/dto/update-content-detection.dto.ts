import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateContentDetectionDto } from './create-content-detection.dto';

export class UpdateContentDetectionDto extends PartialType(CreateContentDetectionDto) {
  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}
