import { IsString, IsOptional, IsDateString, IsUrl } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  employee_id: string;

  @IsString()
  type: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

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
