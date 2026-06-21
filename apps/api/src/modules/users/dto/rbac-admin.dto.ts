import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTenantRoleDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[a-z0-9_-]+$/) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAssignable?: boolean;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
  @ApiPropertyOptional({ minimum: 0, maximum: 89 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(89)
  hierarchyLevel?: number;
}

export class UpdateTenantRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAssignable?: boolean;
}

export class DuplicateTenantRoleDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[a-z0-9_-]+$/) slug?: string;
}

export class RoleInheritanceDto {
  @ApiProperty() @IsString() parentRoleId!: string;
}
