import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const STATUSES = ['draft', 'review', 'approved', 'rejected', 'archived'] as const;

export class CreateBriefingDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaignId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() objectives?: unknown[];
  @ApiPropertyOptional() @IsOptional() dueAt?: Date;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateBriefingDto extends PartialType(CreateBriefingDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class QueryBriefingDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaignId?: string;
}
