import { IsString, IsOptional, IsInt, IsArray, IsObject, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkDto {
  @ApiProperty({ example: 'Noite Estrelada' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ example: 'T-034.521.489-2' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  iswc?: string;

  @ApiPropertyOptional({ example: 'MPB' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string = 'active';

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  authors?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  shares?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
