import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsUUID, IsBoolean, MaxLength } from 'class-validator';

const ARTICLE_TYPES = ['article', 'faq', 'tutorial', 'internal_doc'] as const;
const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;

export class CreateKnowledgeCategoryDto {
  @ApiProperty() @IsString() @MaxLength(80) slug!: string;
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) color?: string;
}

export class UpdateKnowledgeCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) color?: string;
}

export class CreateKnowledgeArticleDto {
  @ApiProperty() @IsUUID() category_id!: string;
  @ApiProperty() @IsString() @MaxLength(300) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() summary?: string;
  @ApiProperty() @IsString() content!: string;
  @ApiPropertyOptional({ enum: ARTICLE_TYPES }) @IsOptional() @IsIn(ARTICLE_TYPES) type?: string;
  @ApiPropertyOptional({ enum: ARTICLE_STATUSES }) @IsOptional() @IsIn(ARTICLE_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
}

export class UpdateKnowledgeArticleDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() category_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ enum: ARTICLE_TYPES }) @IsOptional() @IsIn(ARTICLE_TYPES) type?: string;
  @ApiPropertyOptional({ enum: ARTICLE_STATUSES }) @IsOptional() @IsIn(ARTICLE_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
}

export class MoveKnowledgeArticleDto {
  @ApiProperty({ enum: ['up', 'down'] }) @IsIn(['up', 'down']) direction!: 'up' | 'down';
}
