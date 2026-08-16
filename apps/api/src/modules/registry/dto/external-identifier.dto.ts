import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { IdentifierProvider, IdentifierType } from '@music-os-360/types';

export class CreateExternalIdentifierDto {
  @IsEnum(IdentifierProvider)
  provider!: IdentifierProvider;

  @IsEnum(IdentifierType)
  identifier_type!: IdentifierType;

  @IsString() @MaxLength(100)
  identifier_value!: string;

  @IsOptional() @IsBoolean()
  is_primary?: boolean;

  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateExternalIdentifierDto {
  @IsOptional() @IsEnum(IdentifierProvider)
  provider?: IdentifierProvider;

  @IsOptional() @IsEnum(IdentifierType)
  identifier_type?: IdentifierType;

  @IsOptional() @IsString() @MaxLength(100)
  identifier_value?: string;

  @IsOptional() @IsBoolean()
  is_primary?: boolean;

  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;

  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @IsOptional() @IsString()
  expectedUpdatedAt?: string;
}
