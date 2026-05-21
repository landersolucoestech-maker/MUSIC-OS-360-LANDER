import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsIn, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReleaseStatus } from '@music-os-360/types';

const TYPES = ['album', 'ep', 'single', 'compilacao', 'live', 'outro'] as const;
type ReleaseType = typeof TYPES[number];

export class CreateReleaseDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: ReleaseType;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) upc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() distributor?: string;
  @ApiPropertyOptional() @IsOptional() releasedAt?: Date;
  @ApiPropertyOptional() @IsOptional() platforms?: string[];
  @ApiPropertyOptional() @IsOptional() coverUrl?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateReleaseDto extends PartialType(CreateReleaseDto) {
  @ApiPropertyOptional({ enum: ReleaseStatus })
  @IsOptional()
  @IsEnum(ReleaseStatus)
  status?: ReleaseStatus;
}

export class QueryReleaseDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ReleaseStatus }) @IsOptional() @IsEnum(ReleaseStatus) status?: ReleaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() distributor?: string;
}
