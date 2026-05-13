import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TYPES    = ['album', 'ep', 'single', 'compilation', 'live', 'other'] as const;
const STATUSES = ['planning', 'scheduled', 'released', 'pulled', 'archived'] as const;

export class CreateReleaseDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) upc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() distributor?: string;
  @ApiPropertyOptional() @IsOptional() releasedAt?: Date;
  @ApiPropertyOptional() @IsOptional() platforms?: string[];
  @ApiPropertyOptional() @IsOptional() coverUrl?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateReleaseDto extends PartialType(CreateReleaseDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class QueryReleaseDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() distributor?: string;
}
