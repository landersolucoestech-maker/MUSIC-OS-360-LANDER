import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsUUID, IsInt, IsIn, IsBoolean, IsNumber,
  MaxLength, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Pipeline DTOs ──────────────────────────────────────────────────────────────

const PIPELINE_TYPES = ['sales', 'artist_acquisition', 'distribution', 'project', 'custom'] as const;

export class CreatePipelineDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional({ enum: PIPELINE_TYPES }) @IsOptional() @IsIn(PIPELINE_TYPES) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

// ── Stage DTOs ────────────────────────────────────────────────────────────────

export class CreateStageDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) position?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) color?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) sla_days?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) win_probability?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_terminal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_won?: boolean;
}

export class UpdateStageDto extends PartialType(CreateStageDto) {}

// ── Opportunity DTOs ───────────────────────────────────────────────────────────

const OPP_STATUSES = ['open', 'won', 'lost', 'archived'] as const;

export class CreateOpportunityDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() stage_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contact_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() company_id?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) value?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) probability?: number;
  @ApiPropertyOptional() @IsOptional() expected_close_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) assigned_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {
  @ApiPropertyOptional({ enum: OPP_STATUSES }) @IsOptional() @IsIn(OPP_STATUSES) status?: string;
}

export class MoveOpportunityDto {
  @ApiProperty() @IsUUID() stage_id!: string;
}

export class QueryOpportunityDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() stage_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
