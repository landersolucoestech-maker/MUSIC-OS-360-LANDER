import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, Min, Max, MaxLength, IsUUID, IsArray, IsInt, IsDateString, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const ROLES = ['author', 'composer', 'producer', 'performer', 'publisher', 'master-owner', 'other'] as const;

export class CreateShareDto {
  // ── Aliases EN legados (integrações/registry) — opcionais ────────────────────
  // holderName é a única entrada que alimenta titular_nome (toColumns() em
  // shares.service.ts) — não existe um campo `titular_nome` direto no DTO.
  // Rejeita vazio/só-espaços em vez de aceitar e persistir um titular em branco.
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  @Matches(/\S/, { message: 'holderName não pode ser vazio ou conter apenas espaços' })
  holderName?: string;
  @ApiPropertyOptional({ enum: ROLES }) @IsOptional() @IsIn(ROLES) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number) percentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() workId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) holderDoc?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;

  // ── Campos do formulário (chaves EXATAS do SharePendenteFormModal) ───────────
  // Regra de produto 2026-07-12: cada campo do form tem a sua coluna física.
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) share_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number) percentual?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() acordo_notas?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() acordo_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) direcao?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() lancamento_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) nome_musica?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) detentor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) destinatario?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) tipo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) artista_externo?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() artista_projeto_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() artist_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pagador?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) pagador_contato?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) origem_acordo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() data_prevista?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentos?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() versao?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() historico?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) valor_total?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) valor_liquidado?: number;
}

export class UpdateShareDto extends PartialType(CreateShareDto) {
  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}

export class QueryShareDto extends PaginationDto {
  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado, não lido pelo service. Use "obra_id".' })
  @IsOptional() @IsString() workId?: string;
  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado, não lido pelo service. Use "fonograma_id".' })
  @IsOptional() @IsString() trackId?: string;
  @ApiPropertyOptional({ deprecated: true, description: 'Alias legado, não lido pelo service. Use "papel".' })
  @IsOptional() @IsString() role?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() obra_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fonograma_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() papel?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['a_receber', 'a_enviar']) direcao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() share_type?: string;
}
