import {
  IsString, IsOptional, IsArray, IsObject, IsBoolean, IsNumber,
  IsUUID, IsDateString, MaxLength, IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CreateContractDto aceita BOTH English camelCase e pt-BR snake_case.
 * Os campos pt-BR são repassados directamente para colunas da tabela `contracts`
 * (que usa nomes em pt-BR). Os campos English são suportados para clientes API
 * externos e novos serviços.
 *
 * Quando ambos estão presentes, pt-BR vence.
 */
export class CreateContractDto {
  // ── English (API public contract) ─────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Contrato de Gravação — Artista ABC' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ example: 'recording' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @ApiPropertyOptional({ example: 'uuid-do-artista' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  // Sem default — service.create() força ContractStatus.RASCUNHO na criação.
  // Manter default aqui injectava 'draft' em PATCH parcial (via PartialType)
  // e disparava workflow 'rascunho → draft' indevido.
  @ApiPropertyOptional({ example: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '15000.00' })
  @IsOptional()
  @IsNumberString()
  value?: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'BRL';

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  parties?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  // ── pt-BR (legacy + frontend) — passam directamente para a entity ────────
  @ApiPropertyOptional({ example: 'Contrato de Gravação — Artista ABC' })
  @IsOptional() @IsString() @MaxLength(500)
  titulo?: string;

  @ApiPropertyOptional({ example: 'gravacao' })
  @IsOptional() @IsString() @MaxLength(100)
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  artista_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  cliente_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  lancamento_id?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional() @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional() @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional() @IsNumber()
  valor?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  exclusivo?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacoes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  arquivo_url?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  autentique_doc_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  signing_platform?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional() @IsArray()
  versoes?: unknown[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional() @IsArray()
  signers?: unknown[];

  // Campo do wizard (regra 2026-07-12: 1 coluna por campo, nome exato)
  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  template_id?: string;
}
