import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsEmail, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const ROLES    = ['owner', 'manager', 'editor', 'viewer', 'accountant', 'artist'] as const;
const STATUSES = ['active', 'inactive', 'suspended', 'invited'] as const;

export class CreateUserDto {
  /** User identifier stored in clerk_user_id column. */
  @ApiProperty({ description: 'Identificador único do utilizador (JWT sub)' })
  @IsString()
  userId!: string;

  @ApiProperty() @IsEmail() email!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;

  @ApiProperty({ enum: ROLES }) @IsIn(ROLES) role!: string;

  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class AssignRoleDto {
  @ApiProperty({ enum: ROLES, description: 'Novo role a atribuir ao utilizador' })
  @IsIn(ROLES)
  role!: string;
}

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}
