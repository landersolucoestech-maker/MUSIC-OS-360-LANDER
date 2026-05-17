import {
  Controller, Post, Get, Body,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { AIService }              from './ai.service';
import {
  AICompletionDto,
  GenerateBiographyDto,
  GenerateCampaignCopyDto,
  AnalyzeContractDto,
} from './dto/ai.dto';

@ApiTags('AI Gateway')
@ApiBearerAuth()
@RequireRole('editor')
@Controller('ai')
export class AIController {
  constructor(private readonly ai: AIService) {}

  // ─── Completion genérica ──────────────────────────────────────────────────

  @Post('complete')
  @ApiOperation({ summary: 'Completion genérica com fallback multi-provider' })
  @HttpCode(HttpStatus.OK)
  complete(@Request() req: any, @Body() dto: AICompletionDto) {
    return this.ai.complete({
      tenantId:     req.tenant?.id ?? req.tenantId,
      userId:       req.auth?.userId ?? req.userId,
      skill:        dto.skill,
      prompt:       dto.prompt,
      systemPrompt: dto.systemPrompt,
      maxTokens:    dto.maxTokens,
      temperature:  dto.temperature,
      jsonMode:     dto.jsonMode,
    });
  }

  /**
   * /generate — alias do /complete para compatibilidade com o frontend.
   * O frontend (useAI.ts / AIGenerateButton) envia { prompt, type }.
   */
  @Post('generate')
  @ApiOperation({ summary: 'Alias de /complete para o frontend (useAI hook)' })
  @HttpCode(HttpStatus.OK)
  async generate(
    @Request() req: any,
    @Body() body: { prompt: string; type?: string; systemPrompt?: string; jsonMode?: boolean; maxTokens?: number },
  ): Promise<{ content: string }> {
    const result = await this.ai.complete({
      tenantId:     req.tenant?.id ?? req.tenantId,
      userId:       req.auth?.userId ?? req.userId,
      skill:        body.type ?? 'general',
      prompt:       body.prompt,
      systemPrompt: body.systemPrompt,
      jsonMode:     body.jsonMode,
      maxTokens:    body.maxTokens,
    });
    return { content: result.content ?? '' };
  }

  // ─── Helpers de domínio ───────────────────────────────────────────────────

  @Post('biography')
  @ApiOperation({ summary: 'Gerar biografia de artista' })
  @HttpCode(HttpStatus.OK)
  async biography(@Request() req: any, @Body() dto: GenerateBiographyDto) {
    const content = await this.ai.generateBiography(
      req.tenant?.id ?? req.tenantId,
      req.auth?.userId ?? req.userId,
      dto.artistName,
      dto.context,
    );
    return { content };
  }

  @Post('campaign-copy')
  @ApiOperation({ summary: 'Gerar copy para campanha de marketing' })
  @HttpCode(HttpStatus.OK)
  async campaignCopy(@Request() req: any, @Body() dto: GenerateCampaignCopyDto) {
    const content = await this.ai.generateCampaignCopy(
      req.tenant?.id ?? req.tenantId,
      req.auth?.userId ?? req.userId,
      dto,
    );
    return { content };
  }

  @Post('analyze-contract')
  @RequireRole('manager')
  @ApiOperation({ summary: 'Analisar contrato e identificar cláusulas problemáticas (manager+)' })
  @HttpCode(HttpStatus.OK)
  async analyzeContract(@Request() req: any, @Body() dto: AnalyzeContractDto) {
    const content = await this.ai.analyzeContract(
      req.tenant?.id ?? req.tenantId,
      req.auth?.userId ?? req.userId,
      dto.contractText,
    );
    return { content };
  }

  // ─── Cost summary ─────────────────────────────────────────────────────────

  @Get('cost-summary')
  @RequireRole('admin')
  @ApiOperation({ summary: 'Resumo de custos de AI do tenant (admin+)' })
  getCostSummary(@Request() req: any) {
    return this.ai.getCostSummary(req.tenant?.id ?? req.tenantId);
  }
}
