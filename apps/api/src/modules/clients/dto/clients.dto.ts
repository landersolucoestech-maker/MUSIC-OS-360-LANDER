import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsEmail, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateClientDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['person', 'company']) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) document?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() address?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
  // ── Campos do CRM (Contatos = Clientes — mesma tabela física) ──────────────
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)  state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) instagram?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(15)  zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) responsible?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'blocked'] })
  @IsOptional() @IsIn(['active', 'inactive', 'blocked']) status?: string;
}

export class QueryClientDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}
