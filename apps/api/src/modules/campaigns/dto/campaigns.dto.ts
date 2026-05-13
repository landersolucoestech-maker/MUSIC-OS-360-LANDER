import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TYPES    = ['social', 'ads', 'email', 'influencer', 'pr', 'launch', 'other'] as const;
const STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const;

export class CreateCampaignDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(()=>Number) budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @ApiPropertyOptional() @IsOptional() startsAt?: Date;
  @ApiPropertyOptional() @IsOptional() endsAt?: Date;
  @ApiPropertyOptional() @IsOptional() platforms?: unknown[];
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class QueryCampaignDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
}
