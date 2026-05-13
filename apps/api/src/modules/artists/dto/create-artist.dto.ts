import { IsString, IsOptional, IsUrl, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArtistDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Joãozinho' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stageName?: string;

  @ApiPropertyOptional({ example: 'MPB' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string = 'active';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
