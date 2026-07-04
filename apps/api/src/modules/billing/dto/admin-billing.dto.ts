import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const TENANT_STATUSES = ['active', 'trial', 'suspended', 'cancelled', 'past_due', 'pending'] as const;
const PLAN_TIERS = ['starter', 'growth', 'pro', 'professional', 'enterprise'] as const;

export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan?: string;
}

export class UpdateAdminTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  owner_email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsIn(PLAN_TIERS)
  plan?: string;

  @IsOptional()
  @IsIn(TENANT_STATUSES)
  status?: string;
}
