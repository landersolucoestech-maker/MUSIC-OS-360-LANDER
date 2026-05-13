import { IsString, IsOptional, IsDateString, IsUrl } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  employee_id: string;

  @IsString()
  tipo: string;

  @IsDateString()
  data_inicio: string;

  @IsDateString()
  data_fim: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  aprovado_por?: string;

  @IsOptional()
  @IsUrl()
  documento_url?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
