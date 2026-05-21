import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEmail, IsUUID, IsInt, IsIn, IsUrl,
  MaxLength, Min, Max, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Company DTOs ──────────────────────────────────────────────────────────────

export class CreateCompanyDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2)   state?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class QueryCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

// ── Contact DTOs ──────────────────────────────────────────────────────────────

export class CreateContactDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) job_title?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() company_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) assigned_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() social_links?: Record<string, string>;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {
  @ApiPropertyOptional() @IsOptional() @IsIn(['active', 'inactive', 'bounced']) status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) score?: number;
}

export class QueryContactDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() company_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tag?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

// ── Tag DTOs ──────────────────────────────────────────────────────────────────

export class CreateTagDto {
  @ApiProperty() @IsString() @MaxLength(100) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) color?: string;
}

// ── Task DTOs ─────────────────────────────────────────────────────────────────

const TASK_STATUSES   = ['pending', 'in_progress', 'done', 'cancelled'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class CreateCrmTaskDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(TASK_PRIORITIES) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contact_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() company_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) assigned_to?: string;
  @ApiPropertyOptional() @IsOptional() due_date?: string;
}

export class UpdateCrmTaskDto extends PartialType(CreateCrmTaskDto) {
  @ApiPropertyOptional() @IsOptional() @IsIn(TASK_STATUSES) status?: string;
}

export class QueryCrmTaskDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() contact_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
