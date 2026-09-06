import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Fase 5 / C1: type/artist_id são os filtros canônicos (corrige o bug em
 * que ContractsService.list() lia esses nomes pt-BR enquanto o DTO só
 * declarava type/artistId — o filtro nunca funcionava). tipo/artistId
 * seguem aceitos temporariamente, resolvidos via
 * resolveContractQueryAliases(), marcados deprecated no Swagger. `type`
 * passou de nome legado a canônico na normalização de nomenclatura
 * (2026-09-05).
 */
export class QueryContractDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'gravacao' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'recording', deprecated: true, description: 'Use "type".' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artist_id?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Use "artist_id".' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({ example: 'autentique' })
  @IsOptional()
  @IsString()
  signing_platform?: string;
}
