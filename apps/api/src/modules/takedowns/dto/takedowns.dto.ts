import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const STATUSES = ['pending', 'submitted', 'acknowledged', 'resolved', 'rejected', 'escalated'] as const;

export class CreateTakedownDto {
  @ApiProperty() @IsString() @MaxLength(255) platform!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiPropertyOptional() @IsOptional() requestedAt?: Date;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateTakedownDto extends PartialType(CreateTakedownDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() resolvedAt?: Date;
}

export class QueryTakedownDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() platform?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackId?: string;
}
