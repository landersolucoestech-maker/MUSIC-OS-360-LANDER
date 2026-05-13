import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateContentDetectionDto {
  @IsString()
  plataforma: string;

  @IsOptional()
  @IsString()
  obra_id?: string;

  @IsOptional()
  @IsString()
  artista_id?: string;

  @IsOptional()
  @IsString()
  titulo_detectado?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  score?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
