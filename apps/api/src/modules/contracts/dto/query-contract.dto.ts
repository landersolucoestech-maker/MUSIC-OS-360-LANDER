import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Fase 5 / C1: tipo/artista_id são os filtros canônicos (corrige o bug em
 * que ContractsService.list() lia esses nomes pt-BR enquanto o DTO só
 * declarava type/artistId — o filtro nunca funcionava). type/artistId
 * seguem aceitos temporariamente, resolvidos via
 * resolveContractQueryAliases(), marcados deprecated no Swagger.
 */
export class QueryContractDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'gravacao' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 'recording', deprecated: true, description: 'Use "tipo".' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artista_id?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Use "artista_id".' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({ example: 'autentique' })
  @IsOptional()
  @IsString()
  signing_platform?: string;
}
