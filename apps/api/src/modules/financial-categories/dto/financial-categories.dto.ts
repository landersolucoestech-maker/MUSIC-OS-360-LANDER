import {
  IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID,
  MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const FINANCIAL_TRANSACTION_TYPES = ['REVENUE', 'EXPENSE', 'INVESTMENT', 'TAX', 'TRANSFER'] as const;
export const FINANCIAL_CATEGORY_KINDS = ['operational', 'managerial', 'accounting', 'tax', 'internal', 'automation', 'reporting'] as const;
export const FINANCIAL_CENTER_TYPES = ['COST_CENTER', 'REVENUE_CENTER'] as const;
export const FINANCIAL_RELATION_ROLES = ['payable_to', 'receivable_from', 'vendor', 'customer', 'partner', 'beneficiary'] as const;

export type FinancialTransactionType = typeof FINANCIAL_TRANSACTION_TYPES[number];
export type FinancialCategoryKind = typeof FINANCIAL_CATEGORY_KINDS[number];

export class CreateFinancialCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() parent_id?: string | null;
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) icon?: string;
  @ApiProperty({ enum: FINANCIAL_TRANSACTION_TYPES, isArray: true })
  @IsArray() @IsIn(FINANCIAL_TRANSACTION_TYPES, { each: true }) transaction_types!: FinancialTransactionType[];
  @ApiPropertyOptional({ enum: FINANCIAL_CATEGORY_KINDS }) @IsOptional() @IsIn(FINANCIAL_CATEGORY_KINDS) category_kind?: FinancialCategoryKind;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allow_manual_usage?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allow_ai_suggestions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) tree_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sort_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateFinancialCategoryDto extends PartialType(CreateFinancialCategoryDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() archived?: boolean;
}

export class QueryFinancialCategoryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: FINANCIAL_TRANSACTION_TYPES }) @IsOptional() @IsIn(FINANCIAL_TRANSACTION_TYPES) transaction_type?: FinancialTransactionType;
  @ApiPropertyOptional({ enum: FINANCIAL_CATEGORY_KINDS }) @IsOptional() @IsIn(FINANCIAL_CATEGORY_KINDS) category_kind?: FinancialCategoryKind;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parent_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) archived?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) favorite?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() entity_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() entity_id?: string;
}

export class MoveFinancialCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() parent_id?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) tree_order?: number;
}

export class ReorderFinancialCategoryDto {
  @ApiProperty() @IsInt() @Min(0) tree_order!: number;
}

export class MergeFinancialCategoryDto {
  @ApiProperty() @IsUUID() target_category_id!: string;
}

export class CategoryLinkDto {
  @ApiProperty() @IsString() @MaxLength(80) entity_type!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() entity_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) entity_label?: string;
  @ApiProperty({ enum: FINANCIAL_RELATION_ROLES }) @IsIn(FINANCIAL_RELATION_ROLES) relation_role!: typeof FINANCIAL_RELATION_ROLES[number];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class CategoryRuleDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiProperty() @IsObject() conditions!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() actions?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsUUID() category_id?: string;
}

export class UpdateCategoryRuleDto extends PartialType(CategoryRuleDto) {}

export class RuleContextDto {
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entity_text?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank_account?: string;
  @ApiPropertyOptional() @IsOptional() value?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() project_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() artist_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class SuggestFinancialCategoryDto extends RuleContextDto {
  @ApiPropertyOptional({ enum: FINANCIAL_TRANSACTION_TYPES }) @IsOptional() @IsIn(FINANCIAL_TRANSACTION_TYPES) transaction_type?: FinancialTransactionType;
}

export class ExecuteRulesDto {
  @ApiProperty() @ValidateNested() @Type(() => RuleContextDto) context!: RuleContextDto;
}
