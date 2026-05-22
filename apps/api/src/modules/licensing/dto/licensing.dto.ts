import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TIPOS    = ['sync', 'master', 'mecanica', 'performance', 'digital', 'publicidade', 'filme', 'outros'] as const;
const STATUSES = ['pendente', 'ativo', 'expirado', 'cancelado', 'negociacao'] as const;

export class CreateLicenseDto {
  @ApiProperty() @IsString() @MaxLength(500) titulo!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() obra_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) obra_musical?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) artista?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cliente_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) cliente?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) projeto?: string;
  @ApiPropertyOptional({ enum: TIPOS }) @IsOptional() @IsString() tipo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) tipo_uso?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) midia_destino?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) territorio?: string;
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() data_inicio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() data_fim?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) valor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) moeda?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}

export class UpdateLicenseDto extends PartialType(CreateLicenseDto) {}

export class QueryLicenseDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipo?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() obra_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cliente_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
