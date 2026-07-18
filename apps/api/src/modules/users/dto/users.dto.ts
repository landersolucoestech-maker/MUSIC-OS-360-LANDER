import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsEmail, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// PASSO 12-G.1: 'accounting' é o slug canônico (roles seed / ROLE_PERMISSIONS / FunctionalRole.ACCOUNTING).
// 'accountant' era divergente (sem role/alias correspondente) → corrigido para o canônico.
const STATUSES = ['active', 'inactive', 'suspended', 'invited'] as const;

export class CreateUserDto {
  /** User identifier stored in auth_user_id column. */
  @ApiProperty({ description: 'Identificador único do utilizador (JWT sub)' })
  @IsString()
  userId!: string;

  @ApiProperty() @IsEmail() email!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;

  @ApiProperty({ description: 'Slug de papel global ou customizado do tenant' })
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  role!: string;

  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'Slug do novo papel a atribuir ao utilizador' })
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  role!: string;
}

export class InviteUserDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() roleId!: string;
}

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}
