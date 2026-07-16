import { IsString, IsOptional, IsInt, IsObject, IsUUID, IsArray, IsBoolean, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhonogramDto {
  // Título: o formulário envia `titulo`; `title` é o alias EN legado.
  // O service exige pelo menos um dos dois.
  @ApiPropertyOptional({ example: 'Noite Estrelada (Ao Vivo)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ example: 'Noite Estrelada (Ao Vivo)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titulo?: string;

  @ApiPropertyOptional({ example: 'uuid-da-obra' })
  @IsOptional()
  @IsUUID()
  workId?: string;

  @ApiPropertyOptional({ example: 'uuid-do-artista' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({ example: 'BR-MSC-24-00001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  isrc?: string;

  @ApiPropertyOptional({ example: 'Pop' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genero_musical?: string | null;

  @ApiPropertyOptional({ example: 312, description: 'Duração em segundos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string = 'active';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  // ── Campos do formulário de Fonograma (chaves EXATAS do buildPayload) ────────
  // Regra de produto 2026-07-12: cada campo do form tem a sua coluna física.
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) cod_abramus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) cod_ecad?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) agregadora?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5) isrc_pais?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) isrc_registrante?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4) isrc_ano?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) isrc_designacao?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() criada_por_ia?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() instrumental?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() nacional?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() pub_simultanea?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() emissao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravacao_original?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() data_lancamento?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) duracao?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() duracao_min?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() duracao_seg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) midia?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) classificacao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) pais_origem?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) pais_publicacao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) gravadora?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() obra_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() artista_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() participacao?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsObject() arquivo_audio?: Record<string, unknown>;
}
