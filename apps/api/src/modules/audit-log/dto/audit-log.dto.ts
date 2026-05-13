import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryAuditLogDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityId?: string;
}
