import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  tipo_contrato?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  email_encrypted?: string;

  @IsOptional()
  @IsString()
  telefone_encrypted?: string;

  @IsOptional()
  @IsString()
  cpf_encrypted?: string;

  @IsOptional()
  @IsString()
  salario?: string;

  @IsOptional()
  @IsDateString()
  data_admissao?: string;

  @IsOptional()
  @IsDateString()
  data_demissao?: string;

  @IsOptional()
  documentos?: unknown[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
