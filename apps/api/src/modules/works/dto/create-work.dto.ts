import { IsString, IsOptional, IsArray, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkDto {
  @ApiProperty({ example: 'Noite Estrelada' })
  @IsString()
  @MaxLength(500)
  titulo!: string;

  @ApiPropertyOptional({ example: 'composicao' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 'T-034.521.489-2' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  iswc?: string;

  @ApiPropertyOptional({ example: 'BR-AB1-24-00001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  isrc?: string;

  @ApiPropertyOptional({ example: 'MPB' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genero?: string;

  @ApiPropertyOptional({ example: 'pendente' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  compositor?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  compositores?: Record<string, unknown>[];

  @ApiPropertyOptional({ example: 'Editora XYZ' })
  @IsOptional()
  @IsString()
  editora?: string;

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
