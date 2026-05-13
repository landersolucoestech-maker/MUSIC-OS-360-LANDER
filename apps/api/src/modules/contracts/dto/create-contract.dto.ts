import {
  IsString, IsOptional, IsArray, IsObject,
  IsUUID, IsDateString, MaxLength, IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({ example: 'Contrato de Gravação — Artista ABC' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiProperty({ example: 'recording' })
  @IsString()
  @MaxLength(100)
  type!: string;

  @ApiPropertyOptional({ example: 'uuid-do-artista' })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({ example: 'draft' })
  @IsOptional()
  @IsString()
  status?: string = 'draft';

  @ApiPropertyOptional({ example: '15000.00' })
  @IsOptional()
  @IsNumberString()
  value?: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'BRL';

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  parties?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
