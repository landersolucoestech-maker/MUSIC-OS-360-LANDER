import {
  IsString, IsInt, IsIn, IsOptional, IsBoolean, IsObject, Min, Matches, Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'professional' })
  @IsString() @Length(2, 60)
  slug: string;

  @ApiProperty({ example: 'Professional' })
  @IsString() @Length(2, 120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 29900, description: 'Valor em centavos (> 0)' })
  @IsInt() @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'brl', default: 'brl' })
  @IsOptional() @IsString() @Matches(/^[a-z]{3}$/, { message: 'currency deve ser ISO 3 letras minúsculas' })
  currency?: string;

  @ApiPropertyOptional({ enum: ['month', 'year'], default: 'month' })
  @IsOptional() @IsIn(['month', 'year'])
  interval?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional() @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional() @IsObject()
  limits?: Record<string, unknown>;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
