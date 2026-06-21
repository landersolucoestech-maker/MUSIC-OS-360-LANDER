import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty() @IsString() @MaxLength(255) companyName!: string;

  @ApiProperty({
    enum: ['gravadora', 'editora', 'distribuidora', 'agencia', 'publisher', 'outro'],
  })
  @IsIn(['gravadora', 'editora', 'distribuidora', 'agencia', 'publisher', 'outro'])
  segment!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
