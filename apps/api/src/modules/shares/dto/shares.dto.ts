import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const ROLES = ['author', 'composer', 'producer', 'performer', 'publisher', 'master-owner', 'other'] as const;

export class CreateShareDto {
  @ApiProperty() @IsString() @MaxLength(255) holderName!: string;
  @ApiProperty({ enum: ROLES }) @IsIn(ROLES) role!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) @Type(()=>Number) percentage!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() workId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) holderDoc?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateShareDto extends PartialType(CreateShareDto) {
  @ApiPropertyOptional() @IsOptional() @IsIn(['active','inactive','transferred']) status?: string;
}

export class QueryShareDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() workId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}
