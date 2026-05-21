import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TIPOS    = ['imposto', 'comissao', 'royalty', 'desconto', 'taxa', 'outros'] as const;
const CALCULOS = ['percentual', 'fixo', 'faixa'] as const;

export class CreateFinancialRuleDto {
  @ApiProperty() @IsString() @MaxLength(255) nome!: string;
  @ApiProperty({ enum: TIPOS }) @IsIn(TIPOS) tipo!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) categoria?: string;
  @ApiProperty({ enum: CALCULOS }) @IsIn(CALCULOS) calculo!: string;
  @ApiProperty() @IsNumber() @Type(() => Number) valor!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() condicoes?: Record<string, unknown>;
}

export class UpdateFinancialRuleDto extends PartialType(CreateFinancialRuleDto) {}

export class QueryFinancialRuleDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tipo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoria?: string;
  @ApiPropertyOptional() @IsOptional() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
