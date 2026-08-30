import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

const TYPES = ['feature', 'bug', 'question', 'billing', 'integration'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export class CreateSupportRequestDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: string;
  @ApiPropertyOptional({ enum: PRIORITIES }) @IsOptional() @IsIn(PRIORITIES) priority?: string;
}
