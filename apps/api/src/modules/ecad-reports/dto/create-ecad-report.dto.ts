import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateEcadReportDto {
  @IsString()
  periodo: string;

  @IsString()
  tipo: string;

  @IsOptional()
  @IsString()
  obra_id?: string;

  @IsOptional()
  @IsString()
  valor_bruto?: string;

  @IsOptional()
  @IsString()
  valor_liquido?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUrl()
  arquivo_url?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
