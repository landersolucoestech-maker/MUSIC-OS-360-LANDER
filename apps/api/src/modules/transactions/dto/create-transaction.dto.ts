import {
  IsString, IsOptional, IsObject, IsUUID,
  IsDateString, MaxLength, IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 'revenue', description: 'revenue | expense' })
  @IsString()
  @MaxLength(50)
  type!: string;

  @ApiProperty({ example: 'streaming' })
  @IsString()
  @MaxLength(100)
  category!: string;

  @ApiProperty({ example: '1500.00' })
  @IsNumberString()
  amount!: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'BRL';

  @ApiPropertyOptional({ example: 'Receita Spotify Março 2024' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string = 'pending';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({ example: 'REF-2024-001' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referenceId?: string;

  @ApiPropertyOptional({ example: '2024-03-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
