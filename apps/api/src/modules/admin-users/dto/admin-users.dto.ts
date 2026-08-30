import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUsersQueryDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsString() @MaxLength(50) status?: string;
  @IsOptional() @IsString() @MaxLength(50) tenantId?: string;
}
