import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { SupportTicketStatus, SupportTicketPriority } from '@music-os-360/types';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const PRIORITIES = Object.values(SupportTicketPriority) as string[];
const STATUSES   = Object.values(SupportTicketStatus) as string[];
const CATEGORIES = ['billing', 'technical', 'feature-request', 'access', 'other'] as const;

export class CreateSupportTicketDto {
  @ApiProperty() @IsString() @MaxLength(500) subject!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @ApiProperty({ enum: SupportTicketPriority }) @IsIn(PRIORITIES) priority!: string;
  @ApiPropertyOptional({ enum: CATEGORIES }) @IsOptional() @IsIn(CATEGORIES) category?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateSupportTicketDto extends PartialType(CreateSupportTicketDto) {
  @ApiPropertyOptional({ enum: SupportTicketStatus }) @IsOptional() @IsIn(STATUSES) status?: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate() resolvedAt?: Date;
  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}

export class QuerySupportTicketDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}
