import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, IsPositive, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const TYPES    = ['nfe', 'nfse', 'nfce', 'rpa', 'recibo', 'other'] as const;
const STATUSES = ['pending', 'issued', 'cancelled', 'overdue'] as const;

export class CreateInvoiceDto {
  @ApiProperty({ enum: TYPES }) @IsIn(TYPES) type!: string;
  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)  number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3)    currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)  issuerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)   issuerDoc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)  recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)   recipientDoc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionId?: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate() issuedAt?: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @Type(() => Date) @IsDate() dueAt?: Date;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() r2Key?: string;
}

export class QueryInvoiceDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() artistId?: string;
}
