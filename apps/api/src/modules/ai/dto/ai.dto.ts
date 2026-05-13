import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AICompletionDto {
  @ApiProperty({ description: 'Skill / feature context (biografia, campaign_copy, ...)' })
  @IsString() @IsNotEmpty()
  skill!: string;

  @ApiProperty({ description: 'Prompt do utilizador' })
  @IsString() @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({ description: 'System prompt (instrução de contexto)' })
  @IsOptional() @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Máximo de tokens na resposta', default: 2048 })
  @IsOptional() @IsNumber() @Min(1) @Max(16000)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Temperature (criatividade 0-2)', default: 0.7 })
  @IsOptional() @IsNumber() @Min(0) @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Forçar resposta em JSON' })
  @IsOptional() @IsBoolean()
  jsonMode?: boolean;
}

export class GenerateBiographyDto {
  @ApiProperty({ description: 'Nome do artista' })
  @IsString() @IsNotEmpty()
  artistName!: string;

  @ApiProperty({ description: 'Contexto (estilo, história, conquistas)' })
  @IsString() @IsNotEmpty()
  context!: string;
}

export class GenerateCampaignCopyDto {
  @ApiProperty({ description: 'Nome da campanha' })
  @IsString() @IsNotEmpty()
  campaign!: string;

  @ApiProperty({ description: 'Plataforma (Instagram, TikTok, YouTube, ...)' })
  @IsString() @IsNotEmpty()
  platform!: string;

  @ApiProperty({ description: 'Objetivo da campanha' })
  @IsString() @IsNotEmpty()
  goal!: string;
}

export class AnalyzeContractDto {
  @ApiProperty({ description: 'Texto completo do contrato a analisar' })
  @IsString() @IsNotEmpty()
  contractText!: string;
}
