import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryTransactionDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'revenue' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'streaming' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artistId?: string;
}
