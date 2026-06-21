import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class MarketingPlanNodeDto {
  @ApiProperty()
  @IsUUID()
  marketingProjectId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  dependencies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metrics?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateMarketingStrategyDto extends MarketingPlanNodeDto {}

export class CreateMarketingObjectiveDto extends MarketingPlanNodeDto {
  @ApiProperty()
  @IsUUID()
  strategyId!: string;
}

export class CreateMarketingInitiativeDto extends MarketingPlanNodeDto {
  @ApiProperty()
  @IsUUID()
  objectiveId!: string;
}

export class CreateMarketingActionDto extends MarketingPlanNodeDto {
  @ApiProperty()
  @IsUUID()
  initiativeId!: string;
}
