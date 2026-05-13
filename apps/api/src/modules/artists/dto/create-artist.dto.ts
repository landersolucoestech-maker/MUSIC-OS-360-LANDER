import { IsString, IsOptional, MaxLength, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: 'em_negociacao' })
  @IsOptional()
  @IsString()
  status?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
