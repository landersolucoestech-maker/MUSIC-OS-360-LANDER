import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsEmail, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const STAGES   = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
const STATUSES = ['new', 'active', 'closed'] as const;

export class CreateLeadDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail()                  email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) source?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(STAGES)               stage?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(()=>Number) value?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
  @ApiPropertyOptional({ enum: STAGES })   @IsOptional() @IsIn(STAGES)   stage?: string;
}

export class QueryLeadDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
}
