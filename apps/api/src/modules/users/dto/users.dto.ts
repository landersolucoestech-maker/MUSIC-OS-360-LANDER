import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsEmail, Matches, MaxLength, IsObject } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

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

  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

/**
 * Atualização do perfil de membership.
 *
 * `email` e `userId` não pertencem a este endpoint: ambos vivem no provedor de
 * autenticação e exigem fluxos próprios de confirmação/admin.
 *
 * Task L: `status` (is_active) e `role` foram REMOVIDOS deste DTO — eram
 * aceites aqui via `PATCH /users/:id` (gate apenas 'manager') sem passar
 * pelas checagens de autorização/hierarquia que os endpoints dedicados têm
 * (`PATCH /users/:id/role`, gate 'admin', valida hierarquia via
 * assertCanAssignRole; `PATCH /users/:id/status`, gate 'owner', protege o
 * último owner via assertNotLastOwner). Um 'manager' conseguia se
 * auto-promover a 'owner' ou desativar o último owner do tenant contornando
 * essas proteções. Este DTO agora só cobre campos de perfil puro.
 */
export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  /** Concorrência otimista (Task L) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'Slug do novo papel a atribuir ao utilizador' })
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  role!: string;
  /** Concorrência otimista (Task L) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}

/** Task L: endpoint dedicado (PATCH /users/:id/status), separado de UpdateUserDto
 * para manter a mesma proteção contra o último owner que remove() já tinha. */
export class SetStatusDto {
  @ApiProperty({ enum: STATUSES }) @IsIn(STATUSES) status!: string;
  /** Concorrência otimista (Task L) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}

export class InviteUserDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() roleId!: string;
}

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}
