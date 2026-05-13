import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

const TYPES = ['exclusive', 'non-exclusive', 'distribution', 'service', 'publishing', 'other'] as const;

export class CreateContractTemplateDto {
  @ApiProperty({ example: 'Template Contrato de Exclusividade' })
  @IsString() @MaxLength(500)
  title!: string;

  @ApiProperty({ enum: TYPES, example: 'exclusive' })
  @IsIn(TYPES)
  type!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  variables?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
