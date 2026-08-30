import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsIn, IsOptional, IsString, IsUUID, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IntegrationAudienceDto {
  @ApiPropertyOptional({ enum: ['none', 'all', 'plans', 'tenants'] })
  @IsIn(['none', 'all', 'plans', 'tenants'])
  mode!: 'none' | 'all' | 'plans' | 'tenants';

  @ApiPropertyOptional({ type: [String], description: 'Slugs de plano — usado quando mode=plans' })
  @IsOptional() @IsArray() @IsString({ each: true })
  plans?: string[];

  @ApiPropertyOptional({ type: [String], description: 'IDs de tenant — usado quando mode=tenants' })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  tenantIds?: string[];
}

/**
 * Só campos de GOVERNANÇA. Capacidade técnica e conexão do tenant não entram
 * aqui de propósito — ver integration-admin.service.ts.
 */
export class UpdatePlatformIntegrationDto {
  @ApiPropertyOptional({ description: 'Categoria (uuid) ou null para remover' })
  @IsOptional() @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: ['hidden','coming_soon','beta','available','temporarily_unavailable'] })
  @IsOptional() @IsIn(['hidden','coming_soon','beta','available','temporarily_unavailable'])
  publicationState?: 'hidden' | 'coming_soon' | 'beta' | 'available' | 'temporarily_unavailable';

  /** Estado operacional do adapter — governável, mas vetado pela capability em código. */
  @ApiPropertyOptional({ enum: ['planned','in_development','configuring','awaiting_provider','homologating','ready','degraded','disabled','retired'] })
  @IsOptional() @IsIn(['planned','in_development','configuring','awaiting_provider','homologating','ready','degraded','disabled','retired'])
  technicalState?: string;

  @ApiPropertyOptional({ type: IntegrationAudienceDto })
  @IsOptional() @ValidateNested() @Type(() => IntegrationAudienceDto)
  viewAudience?: IntegrationAudienceDto;

  @ApiPropertyOptional({ type: IntegrationAudienceDto })
  @IsOptional() @ValidateNested() @Type(() => IntegrationAudienceDto)
  useAudience?: IntegrationAudienceDto;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string | null;
}

/**
 * Entitlements de integração de um plano. Lista DINÂMICA de slugs comerciais —
 * sem chave por provedor, sem nome de plano em código.
 */
export class SetPlanIntegrationsDto {
  @ApiPropertyOptional({ type: [String], description: 'Slugs comerciais incluídos no plano' })
  @IsOptional() @IsArray() @IsString({ each: true })
  integrations?: string[];
}
