import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateArtistGoalDto {
  @IsString()
  artist_id: string;

  @IsString()
  title: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  meta_valor?: string;

  @IsOptional()
  @IsString()
  valor_atual?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  periodo?: string;

  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
