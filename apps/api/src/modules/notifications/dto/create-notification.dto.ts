import { IsString, IsOptional, IsUUID, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Contrato assinado' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ example: 'O contrato #123 foi assinado digitalmente.' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({ example: 'info', description: 'info | success | warning | error' })
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'contract' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entity?: string;

  @ApiPropertyOptional({ example: 'uuid-do-contrato' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
