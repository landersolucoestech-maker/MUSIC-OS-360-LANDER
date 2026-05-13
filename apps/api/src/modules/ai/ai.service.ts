/**
 * ai.service.ts
 *
 * AI Gateway — OpenAI (primário) → Anthropic Claude (fallback) → Google Gemini (último recurso).
 * Regista cada request na tabela ai_jobs (custo, latência, tokens).
 * Adaptado para Drizzle ORM (sem PrismaService).
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService }              from '@nestjs/config';
import { eq }                         from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }      from '../../database/database.module';
import { aiJobs }                     from '../../database/schema';

// ─── Modelos e custos por 1M tokens (USD) ─────────────────────────────────────

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o':                  { input: 5.00,  output: 15.00  },
  'gpt-4o-mini':             { input: 0.15,  output: 0.60   },
  'claude-3-5-haiku-latest': { input: 0.80,  output: 4.00   },
  'claude-3-5-sonnet-latest':{ input: 3.00,  output: 15.00  },
  'gemini-1.5-flash':        { input: 0.075, output: 0.30   },
  'gemini-1.5-pro':          { input: 3.50,  output: 10.50  },
};

export interface AICompletionOptions {
  tenantId:    string;
  userId:      string;
  skill:       string;
  prompt:      string;
  systemPrompt?: string;
  maxTokens?:  number;
  temperature?: number;
  jsonMode?:   boolean;
}

export interface AICompletionResult {
  content:      string;
  provider:     string;
  model:        string;
  inputTokens:  number;
  outputTokens: number;
  costUsd:      number;
  latencyMs:    number;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  // ─── Gateway principal ────────────────────────────────────────────────────

  async complete(opts: AICompletionOptions): Promise<AICompletionResult> {
    const providers: Array<() => Promise<AICompletionResult>> = [];

    if (this.config.get('OPENAI_API_KEY')) {
      providers.push(() => this.openai(opts));
    }
    if (this.config.get('ANTHROPIC_API_KEY')) {
      providers.push(() => this.anthropic(opts));
    }
    if (this.config.get('GOOGLE_AI_API_KEY')) {
      providers.push(() => this.gemini(opts));
    }

    if (providers.length === 0) {
      throw new Error('Nenhum provider de AI configurado (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_AI_API_KEY)');
    }

    let lastError: unknown;
    for (const attempt of providers) {
      try {
        const result = await attempt();
        await this.recordJob({ ...opts, ...result, status: 'completed' });
        return result;
      } catch (err) {
        lastError = err;
        this.logger.warn(`AI provider falhou, tentando próximo: ${String(err)}`);
      }
    }
    throw new Error(`Todos os providers AI falharam. Último erro: ${String(lastError)}`);
  }

  // ─── OpenAI ───────────────────────────────────────────────────────────────

  private async openai(opts: AICompletionOptions): Promise<AICompletionResult> {
    const { OpenAI } = await import('openai');
    const client     = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
    const model      = 'gpt-4o-mini';

    const messages: { role: string; content: string }[] = [];
    if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
    messages.push({ role: 'user', content: opts.prompt });

    const t0  = Date.now();
    const res = await client.chat.completions.create({
      model,
      messages:    messages as any,
      max_tokens:  opts.maxTokens  ?? 2048,
      temperature: opts.temperature ?? 0.7,
      response_format: opts.jsonMode ? { type: 'json_object' } : undefined,
    } as any);
    const latencyMs = Date.now() - t0;

    const inputTokens  = res.usage?.prompt_tokens     ?? 0;
    const outputTokens = res.usage?.completion_tokens  ?? 0;
    const costUsd      = this.calcCost(model, inputTokens, outputTokens);

    return {
      content:  res.choices[0]?.message?.content ?? '',
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
    };
  }

  // ─── Anthropic Claude ─────────────────────────────────────────────────────

  private async anthropic(opts: AICompletionOptions): Promise<AICompletionResult> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client    = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY') });
    const model     = 'claude-3-5-haiku-latest';

    const t0  = Date.now();
    const res = await client.messages.create({
      model,
      max_tokens:  opts.maxTokens ?? 2048,
      system:      opts.systemPrompt,
      messages:    [{ role: 'user', content: opts.prompt }],
      temperature: opts.temperature ?? 0.7,
    } as any);
    const latencyMs = Date.now() - t0;

    const inputTokens  = res.usage.input_tokens  ?? 0;
    const outputTokens = res.usage.output_tokens ?? 0;
    const costUsd      = this.calcCost(model, inputTokens, outputTokens);
    const content      = res.content[0]?.type === 'text' ? res.content[0].text : '';

    return { content, provider: 'anthropic', model, inputTokens, outputTokens, costUsd, latencyMs };
  }

  // ─── Google Gemini ────────────────────────────────────────────────────────

  private async gemini(opts: AICompletionOptions): Promise<AICompletionResult> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(this.config.get<string>('GOOGLE_AI_API_KEY') ?? '');
    const model  = 'gemini-1.5-flash';

    const genModel = client.getGenerativeModel({ model });
    const prompt   = opts.systemPrompt ? `${opts.systemPrompt}\n\n${opts.prompt}` : opts.prompt;

    const t0  = Date.now();
    const res = await genModel.generateContent(prompt);
    const latencyMs = Date.now() - t0;

    const content      = res.response.text();
    const inputTokens  = res.response.usageMetadata?.promptTokenCount      ?? 0;
    const outputTokens = res.response.usageMetadata?.candidatesTokenCount   ?? 0;
    const costUsd      = this.calcCost(model, inputTokens, outputTokens);

    return { content, provider: 'google', model, inputTokens, outputTokens, costUsd, latencyMs };
  }

  // ─── Utilitários ──────────────────────────────────────────────────────────

  private calcCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[model] ?? { input: 1.0, output: 3.0 };
    return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
  }

  private async recordJob(data: AICompletionOptions & AICompletionResult & { status: string }): Promise<void> {
    try {
      await this.db.insert(aiJobs).values({
        tenant_id:     data.tenantId,
        user_id:       data.userId,
        provider:      data.provider,
        model:         data.model,
        skill:         data.skill,
        status:        data.status,
        input_tokens:  data.inputTokens,
        output_tokens: data.outputTokens,
        cost_usd:      String(data.costUsd),
        latency_ms:    data.latencyMs,
        completed_at:  new Date(),
        metadata:      { prompt: data.prompt.slice(0, 200) },
      });
    } catch (err) {
      this.logger.warn(`Erro ao registar AI job: ${String(err)}`);
    }
  }

  // ─── Helpers de domínio ───────────────────────────────────────────────────

  async generateBiography(tenantId: string, userId: string, artistName: string, context: string): Promise<string> {
    const result = await this.complete({
      tenantId, userId,
      skill:        'biography',
      systemPrompt: 'Você é um redator especializado em música. Escreva em português do Brasil.',
      prompt:       `Escreva uma biografia profissional de 3 parágrafos para o artista ${artistName}. Contexto: ${context}`,
    });
    return result.content;
  }

  async generateCampaignCopy(tenantId: string, userId: string, opts: { campaign: string; platform: string; goal: string }): Promise<string> {
    const result = await this.complete({
      tenantId, userId,
      skill:        'campaign_copy',
      systemPrompt: 'Você é especialista em marketing musical. Responda em português do Brasil.',
      prompt:       `Crie copy de campanha para ${opts.platform}. Campanha: ${opts.campaign}. Objetivo: ${opts.goal}`,
    });
    return result.content;
  }

  async analyzeContract(tenantId: string, userId: string, contractText: string): Promise<string> {
    const result = await this.complete({
      tenantId, userId,
      skill:        'contract_analysis',
      systemPrompt: 'Você é um advogado especializado em direito musical. Identifique cláusulas problemáticas. Responda em português do Brasil.',
      prompt:       `Analise este contrato e destaque pontos de atenção:\n\n${contractText.slice(0, 8000)}`,
    });
    return result.content;
  }

  async getCostSummary(tenantId: string): Promise<{ totalCostUsd: number; totalJobs: number }> {
    const jobs = await this.db.select().from(aiJobs)
      .where(eq(aiJobs.tenant_id, tenantId));

    const totalCostUsd = jobs.reduce((acc, j) => acc + parseFloat(String(j.cost_usd)), 0);
    return { totalCostUsd, totalJobs: jobs.length };
  }
}
