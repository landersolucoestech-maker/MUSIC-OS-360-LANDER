import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsHexColor,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CompanyAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(9) zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2) country?: string;
}

export class CompanyColorsDto {
  @ApiPropertyOptional() @IsOptional() @IsHexColor() primary?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() secondary?: string;
}

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ description: 'Razão social' })
  @IsOptional() @IsString() @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Nome fantasia' })
  @IsOptional() @IsString() @MaxLength(255)
  tradeName?: string;

  @ApiPropertyOptional({ description: 'CNPJ (será criptografado em repouso)' })
  @IsOptional() @IsString() @MaxLength(18)
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Inscrição Estadual' })
  @IsOptional() @IsString() @MaxLength(20)
  stateRegistration?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsObject() @ValidateNested() @Type(() => CompanyAddressDto)
  address?: CompanyAddressDto;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)
  whatsapp?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2048)
  website?: string;

  @ApiPropertyOptional({ description: 'Domínio customizado (sem protocolo, ex.: app.minhaempresa.com)' })
  @IsOptional() @IsString() @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2048)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2048)
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsObject() @ValidateNested() @Type(() => CompanyColorsDto)
  colors?: CompanyColorsDto;

  @ApiPropertyOptional({ description: 'IANA timezone, ex.: America/Sao_Paulo' })
  @IsOptional() @IsString() @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Código ISO 4217, ex.: BRL' })
  @IsOptional() @IsString() @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Código IETF, ex.: pt-BR' })
  @IsOptional() @IsString() @MaxLength(10)
  language?: string;
}
