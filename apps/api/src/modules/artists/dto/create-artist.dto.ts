import {
  IsString, IsOptional, MaxLength, IsObject, IsArray, IsEnum, IsNumber, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtistStatus } from '@music-os-360/types';

export class CreateArtistDto {
  @ApiProperty({ example: 'Seu Jorge' })
  @IsString()
  @MaxLength(255)
  nome_artistico!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) nome_civil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipo?: string;
  @ApiPropertyOptional({ enum: ArtistStatus }) @IsOptional() @IsEnum(ArtistStatus) status?: ArtistStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) genero_musical?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() foto_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() banner_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() spotify_artist_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() youtube_channel_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() especialidades?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cpf_cnpj?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;

  // ── Pessoal ──────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() data_nascimento?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rg?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endereco?: string;

  // ── Bancário ─────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() banco?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agencia?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conta?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chave_pix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() titular_conta?: string;

  // ── Plataformas extras ───────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() deezer_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() apple_music_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() soundcloud_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instagram?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tiktok?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() spotify_ouvintes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() youtube_inscritos?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deezer_fas?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() apple_music_albuns?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() soundcloud_seguidores?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() instagram_seguidores?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tiktok_seguidores?: number;

  // ── Perfil / Relacionamentos ──────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() tipo_perfil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() empresario_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() empresario_nome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() empresario_telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() empresario_email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_nome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_responsavel_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_responsavel_nome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_responsavel_telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gravadora_responsavel_email?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() relacionamentos?: unknown[];

  // ── Distribuidoras ────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsObject() distribuidoras_selecionadas?: Record<string, boolean>;
  @ApiPropertyOptional() @IsOptional() @IsObject() distribuidoras_emails?: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsObject() distribuidoras_empresa_selecionadas?: Record<string, boolean>;
  @ApiPropertyOptional() @IsOptional() @IsObject() distribuidoras_empresa_emails?: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsArray() distribuidoras_gerais?: unknown[];

  // ── Documentos / Mídia ───────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsArray() galeria_urls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() video_apresentacao_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() documentos?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsString() documentos_pessoais_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() presskit_url?: string;

  // ── Equipe / Contatos ────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() manager_nome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manager_contato?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() produtor_executivo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agencia_booking?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label_parceira?: string;
  // Vínculos com contatos do CRM (apenas referências: { contactId, distribuidoras? })
  @ApiPropertyOptional() @IsOptional() @IsArray() contatos_vinculados?: unknown[];
  // @deprecated Contatos embutidos (legado / auto-cadastro público). Mantido para retrocompat.
  @ApiPropertyOptional() @IsOptional() @IsArray() contatos_equipe?: unknown[];

  // ── Interno ───────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() notas_internas?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slug_artistico?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags_musicais?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() fase_carreira?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() genero?: string;

  // ── Contrato ─────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() contrato_id?: string;
}
