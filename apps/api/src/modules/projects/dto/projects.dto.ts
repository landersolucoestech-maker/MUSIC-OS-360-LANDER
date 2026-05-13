import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TYPES    = ['album', 'ep', 'single', 'video', 'tour', 'podcast', 'other'] as const;
const STATUSES = ['planning', 'active', 'on-hold', 'completed', 'cancelled'] as const;

export class CreateProjectDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(()=>Number) budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @ApiPropertyOptional() @IsOptional() startsAt?: Date;
  @ApiPropertyOptional() @IsOptional() deadlineAt?: Date;
  @ApiPropertyOptional() @IsOptional() releasedAt?: Date;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class QueryProjectDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
}
