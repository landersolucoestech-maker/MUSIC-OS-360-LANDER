import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TYPES    = ['show', 'festival', 'recording', 'meeting', 'interview', 'tour', 'other'] as const;
const STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed', 'postponed'] as const;

export class CreateEventDto {
  @ApiProperty() @IsString() @MaxLength(500) title!: string;
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) venue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(()=>Number) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ticketUrl?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;

  // ── Campos do formulário (chaves EXATAS do SchedulerFormModal) ───────────────
  // Regra de produto 2026-07-12: cada campo do form tem a sua coluna física.
  @ApiPropertyOptional() @IsOptional() @IsString() endereco?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contato_local?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) valor_cache?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) publico_esperado?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
  @ApiPropertyOptional() @IsOptional() participantes?: unknown[];
}

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
}

export class QueryEventDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
}
