import { IsString, IsOptional, IsUrl, IsDateString } from 'class-validator';

export class CreatePayrollEntryDto {
  @IsString()
  employee_id: string;

  @IsString()
  competencia: string;

  @IsString()
  salario_bruto: string;

  @IsOptional()
  @IsString()
  descontos?: string;

  @IsString()
  salario_liquido: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUrl()
  arquivo_url?: string;

  @IsOptional()
  @IsDateString()
  pago_em?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
