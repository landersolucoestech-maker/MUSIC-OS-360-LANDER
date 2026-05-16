import { IsString, IsOptional, MaxLength, IsObject, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtistStatus } from '@music-os-360/types';

export class CreateArtistDto {
  @ApiProperty({ example: 'Seu Jorge' })
  @IsString()
  @MaxLength(255)
  nome_artistico!: string;

  @ApiPropertyOptional({ example: 'Jorge Mário da Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome_civil?: string;

  @ApiPropertyOptional({ example: 'solo', enum: ['solo', 'banda', 'duo'] })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ enum: ArtistStatus, example: ArtistStatus.EM_NEGOCIACAO })
  @IsOptional()
  @IsEnum(ArtistStatus)
  status?: ArtistStatus;

  @ApiPropertyOptional({ example: 'MPB' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genero_musical?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  foto_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  banner_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spotify_artist_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  youtube_channel_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  especialidades?: string[];

  @ApiPropertyOptional({ example: 'artista@email.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+55 11 91234-5678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefone?: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf_cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
