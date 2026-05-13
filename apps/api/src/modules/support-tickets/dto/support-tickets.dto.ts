import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES   = ['open', 'in-progress', 'waiting', 'resolved', 'closed'] as const;
const CATEGORIES = ['billing', 'technical', 'feature-request', 'access', 'other'] as const;

export class CreateSupportTicketDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @ApiProperty({ enum: PRIORITIES }) @IsIn(PRIORITIES) priority!: string;
  @ApiPropertyOptional({ enum: CATEGORIES }) @IsOptional() @IsIn(CATEGORIES) category?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateSupportTicketDto extends PartialType(CreateSupportTicketDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() resolvedAt?: Date;
}

export class QuerySupportTicketDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}
