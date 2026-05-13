import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsEmail, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const ROLES    = ['owner', 'manager', 'editor', 'viewer', 'accountant', 'artist'] as const;
const STATUSES = ['active', 'inactive', 'suspended', 'invited'] as const;

export class CreateUserDto {
  @ApiProperty() @IsString() clerkId!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiProperty({ enum: ROLES }) @IsIn(ROLES) role!: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}
