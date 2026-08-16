import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryTransactionDto extends PaginationDto {
  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado, não lido pelo service. Use "tipo".' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado, não lido pelo service. Use "categoria".' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado, não lido pelo service. Use "artista_id".' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  // Nomes efetivamente lidos por TransactionsService.list().
  @ApiPropertyOptional({ example: 'receita' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 'streaming' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artista_id?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
