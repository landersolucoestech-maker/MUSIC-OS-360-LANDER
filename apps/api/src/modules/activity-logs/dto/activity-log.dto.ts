import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsObject, MaxLength } from 'class-validator';

export class CreateActivityLogDto {
  @ApiProperty({ type: 'string', example: 'artist' })
  @IsString()
  @MaxLength(50)
  entity_type: string;

  @ApiProperty({ type: 'string', format: 'uuid' })
  @IsUUID()
  entity_id: string;

  @ApiProperty({ type: 'string', example: 'updated' })
  @IsString()
  @MaxLength(100)
  action: string;

  @ApiProperty({ type: 'string', example: 'Atualizou dados do artista' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ type: 'object', example: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'string', example: 'user-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  user_name?: string;

  @ApiPropertyOptional({ type: 'string', example: 'https://...' })
  @IsOptional()
  @IsString()
  user_avatar_url?: string;
}

export class QueryActivityLogDto {
  @ApiPropertyOptional({ type: 'string', example: 'artist' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ type: 'number', example: 50 })
  @IsOptional()
  limit?: number;
}
