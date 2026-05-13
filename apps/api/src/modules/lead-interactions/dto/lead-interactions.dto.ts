import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TYPES = ['call', 'email', 'meeting', 'whatsapp', 'note', 'proposal', 'other'] as const;

export class CreateLeadInteractionDto {
  @ApiProperty() @IsUUID() leadId!: string;
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class QueryLeadInteractionDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()   leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
}
