import {
  Controller, Post, Get, Body,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AIService }              from './ai.service';
import {
  AICompletionDto,
  GenerateBiographyDto,
  GenerateCampaignCopyDto,
  AnalyzeContractDto,
} from './dto/ai.dto';

@ApiTags('AI Gateway')
@ApiBearerAuth('Clerk JWT')
@Controller('ai')
export class AIController {
  constructor(private readonly ai: AIService) {}

  // ─── Completion genérica ──────────────────────────────────────────────────

  @Post('complete')
  @ApiOperation({ summary: 'Completion genérica com fallback multi-provider' })
  @HttpCode(HttpStatus.OK)
  complete(@Request() req: any, @Body() dto: AICompletionDto) {
    return this.ai.complete({
      tenantId:    req.tenantId,
      userId:      req.userId,
      skill:       dto.skill,
      prompt:      dto.prompt,
      systemPrompt: dto.systemPrompt,
      maxTokens:   dto.maxTokens,
      temperature: dto.temperature,
      jsonMode:    dto.jsonMode,
    });
  }

  /**
   * /generate — alias do /complete para compatibilidade com o frontend.
   * O frontend (useAI.ts / AIGenerateButton) envia { prompt, type }.
   * Mapeamos `type` para `skill` e retornamos { content } como esperado.
   */
  @Post('generate')
  @ApiOperation({ summary: 'Alias de /complete para o frontend (useAI hook)' })
  @HttpCode(HttpStatus.OK)
  async generate(
    @Request() req: any,
    @Body() body: { prompt: string; type?: string },
  ): Promise<{ content: string }> {
    const result = await this.ai.complete({
      tenantId: req.tenantId,
      userId:   req.userId,
      skill:    body.type ?? 'general',
      prompt:   body.prompt,
    });
    return { content: result.content ?? '' };
  }

  // ─── Helpers de domínio ───────────────────────────────────────────────────

  @Post('biography')
  @ApiOperation({ summary: 'Gerar biografia de artista' })
  @HttpCode(HttpStatus.OK)
  async biography(@Request() req: any, @Body() dto: GenerateBiographyDto) {
    const content = await this.ai.generateBiography(req.tenantId, req.userId, dto.artistName, dto.context);
    return { content };
  }

  @Post('campaign-copy')
  @ApiOperation({ summary: 'Gerar copy para campanha de marketing' })
  @HttpCode(HttpStatus.OK)
  async campaignCopy(@Request() req: any, @Body() dto: GenerateCampaignCopyDto) {
    const content = await this.ai.generateCampaignCopy(req.tenantId, req.userId, dto);
    return { content };
  }

  @Post('analyze-contract')
  @ApiOperation({ summary: 'Analisar contrato e identificar cláusulas problemáticas' })
  @HttpCode(HttpStatus.OK)
  async analyzeContract(@Request() req: any, @Body() dto: AnalyzeContractDto) {
    const content = await this.ai.analyzeContract(req.tenantId, req.userId, dto.contractText);
    return { content };
  }

  // ─── Cost summary ─────────────────────────────────────────────────────────

  @Get('cost-summary')
  @ApiOperation({ summary: 'Resumo de custos de AI do tenant' })
  getCostSummary(@Request() req: any) {
    return this.ai.getCostSummary(req.tenantId);
  }
}
