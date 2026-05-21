/**
 * ai.service.ts
 *
 * AI Gateway — OpenAI (primário) → Anthropic Claude (fallback) → Google Gemini (último recurso).
 * Regista cada request na tabela ai_jobs (custo, latência, tokens).
 */

import { Injectable, Logger, Inject, ForbiddenException } from '@nestjs/common';
import { ConfigService }              from '@nestjs/config';
import { DataSource, Repository }     from 'typeorm';
import { DATA_SOURCE }                from '../../database/database.module';
import { AIJobEntity }                from '../../database/entities';
import { AIJobStatus }                from '@music-os-360/types';
import { PLAN_LIMITS }                from '../billing/billing.service';

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o':                   { input: 5.00,  output: 15.00  },
  'gpt-4o-mini':              { input: 0.15,  output: 0.60   },
  'claude-3-5-haiku-latest':  { input: 0.80,  output: 4.00   },
  'claude-3-5-sonnet-latest': { input: 3.00,  output: 15.00  },
  'gemini-1.5-flash':         { input: 0.075, output: 0.30   },
  'gemini-1.5-pro':           { input: 3.50,  output: 10.50  },
};

export interface AICompletionOptions {
  tenantId:      string;
  userId:        string;
  skill:         string;
  prompt:        string;
  systemPrompt?: string;
  maxTokens?:    number;
  temperature?:  number;
  jsonMode?:     boolean;
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
  private readonly repo: Repository<AIJobEntity> | null = null;

  constructor(
    private readonly config: ConfigService,
    @Inject(DATA_SOURCE) ds: DataSource | null,
  ) {
    if (ds) this.repo = ds.getRepository(AIJobEntity);
  }

  async complete(opts: AICompletionOptions): Promise<AICompletionResult> {
    await this.enforceMonthlyLimit(opts.tenantId);

    const providers: Array<() => Promise<AICompletionResult>> = [];

    if (this.config.get('OPENAI_API_KEY'))     providers.push(() => this.openai(opts));
    if (this.config.get('ANTHROPIC_API_KEY'))  providers.push(() => this.anthropic(opts));
    if (this.config.get('GOOGLE_AI_API_KEY'))  providers.push(() => this.gemini(opts));

    if (providers.length === 0) {
      throw new Error('Nenhum provider de AI configurado');
    }

    let lastError: unknown;
    for (const attempt of providers) {
      try {
        const result = await attempt();
        await this.recordJob({ ...opts, ...result, status: AIJobStatus.COMPLETED });
        return result;
      } catch (err) {
        lastError = err;
        this.logger.warn(`AI provider falhou, tentando próximo: ${String(err)}`);
      }
    }
    throw new Error(`Todos os providers AI falharam. Último erro: ${String(lastError)}`);
  }

  private async enforceMonthlyLimit(tenantId: string): Promise<void> {
    if (!this.repo) return;

    const { monthlySpend, plan } = await this.getMonthlySpend(tenantId);
    const limit = PLAN_LIMITS[plan]?.monthlyAiUsd ?? null;

    if (limit !== null && monthlySpend >= limit) {
      this.logger.warn(`AI monthly limit exceeded: tenant=${tenantId} spend=$${monthlySpend.toFixed(4)} limit=$${limit}`);
      throw new ForbiddenException(
        `Limite mensal de AI atingido (USD ${monthlySpend.toFixed(2)} / USD ${limit}). ` +
        'Faça upgrade de plano ou aguarde o próximo ciclo.',
      );
    }
  }

  private async getMonthlySpend(tenantId: string): Promise<{ monthlySpend: number; plan: string }> {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const rows = await this.repo!
      .createQueryBuilder('j')
      .select('SUM(j.cost_usd::numeric)', 'total')
      .addSelect(
        `(SELECT t.plan FROM tenants t WHERE t.id = :tenantId LIMIT 1)`,
        'plan',
      )
      .where('j.tenant_id = :tenantId AND j.created_at >= :start AND j.status = :status', {
        tenantId, start, status: AIJobStatus.COMPLETED,
      })
      .setParameter('tenantId', tenantId)
      .getRawOne<{ total: string; plan: string }>();

    return {
      monthlySpend: parseFloat(rows?.total ?? '0') || 0,
      plan:         rows?.plan ?? 'starter',
    };
  }

  private async openai(opts: AICompletionOptions): Promise<AICompletionResult> {
    const { OpenAI } = await import('openai');
    const client     = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
    const model      = 'gpt-4o-mini';

    const messages: { role: string; content: string }[] = [];
    if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
    messages.push({ role: 'user', content: opts.prompt });

    const t0  = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await client.chat.completions.create({ model, messages: messages as any, max_tokens: opts.maxTokens ?? 2048, temperature: opts.temperature ?? 0.7, response_format: opts.jsonMode ? { type: 'json_object' } : undefined } as any);
    const latencyMs = Date.now() - t0;

    const inputTokens  = res.usage?.prompt_tokens    ?? 0;
    const outputTokens = res.usage?.completion_tokens ?? 0;
    return { content: res.choices[0]?.message?.content ?? '', provider: 'openai', model, inputTokens, outputTokens, costUsd: this.calcCost(model, inputTokens, outputTokens), latencyMs };
  }

  private async anthropic(opts: AICompletionOptions): Promise<AICompletionResult> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client    = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY') });
    const model     = 'claude-3-5-haiku-latest';

    const t0  = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await client.messages.create({ model, max_tokens: opts.maxTokens ?? 2048, system: opts.systemPrompt, messages: [{ role: 'user', content: opts.prompt }], temperature: opts.temperature ?? 0.7 } as any);
    const latencyMs = Date.now() - t0;

    const inputTokens  = res.usage.input_tokens  ?? 0;
    const outputTokens = res.usage.output_tokens ?? 0;
    const content      = res.content[0]?.type === 'text' ? res.content[0].text : '';
    return { content, provider: 'anthropic', model, inputTokens, outputTokens, costUsd: this.calcCost(model, inputTokens, outputTokens), latencyMs };
  }

  private async gemini(opts: AICompletionOptions): Promise<AICompletionResult> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client   = new GoogleGenerativeAI(this.config.get<string>('GOOGLE_AI_API_KEY') ?? '');
    const model    = 'gemini-1.5-flash';
    const genModel = client.getGenerativeModel({ model });
    const prompt   = opts.systemPrompt ? `${opts.systemPrompt}\n\n${opts.prompt}` : opts.prompt;

    const t0  = Date.now();
    const res = await genModel.generateContent(prompt);
    const latencyMs = Date.now() - t0;

    const content      = res.response.text();
    const inputTokens  = res.response.usageMetadata?.promptTokenCount    ?? 0;
    const outputTokens = res.response.usageMetadata?.candidatesTokenCount ?? 0;
    return { content, provider: 'google', model, inputTokens, outputTokens, costUsd: this.calcCost(model, inputTokens, outputTokens), latencyMs };
  }

  private calcCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[model] ?? { input: 1.0, output: 3.0 };
    return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
  }

  private async recordJob(data: AICompletionOptions & AICompletionResult & { status: AIJobStatus }): Promise<void> {
    if (!this.repo) return;
    try {
      const entity = this.repo.create({
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
      await this.repo.save(entity);
    } catch (err) {
      this.logger.warn(`Erro ao registar AI job: ${String(err)}`);
    }
  }

  async generateBiography(tenantId: string, userId: string, artistName: string, context: string): Promise<string> {
    const result = await this.complete({ tenantId, userId, skill: 'biography', systemPrompt: 'Você é um redator especializado em música. Escreva em português do Brasil.', prompt: `Escreva uma biografia profissional de 3 parágrafos para o artista ${artistName}. Contexto: ${context}` });
    return result.content;
  }

  async generateCampaignCopy(tenantId: string, userId: string, opts: { campaign: string; platform: string; goal: string }): Promise<string> {
    const result = await this.complete({ tenantId, userId, skill: 'campaign_copy', systemPrompt: 'Você é especialista em marketing musical. Responda em português do Brasil.', prompt: `Crie copy de campanha para ${opts.platform}. Campanha: ${opts.campaign}. Objetivo: ${opts.goal}` });
    return result.content;
  }

  async analyzeContract(tenantId: string, userId: string, contractText: string): Promise<string> {
    const result = await this.complete({ tenantId, userId, skill: 'contract_analysis', systemPrompt: 'Você é um advogado especializado em direito musical. Identifique cláusulas problemáticas. Responda em português do Brasil.', prompt: `Analise este contrato e destaque pontos de atenção:\n\n${contractText.slice(0, 8000)}` });
    return result.content;
  }

  async getCostSummary(tenantId: string): Promise<{
    totalCostUsd:   number;
    monthCostUsd:   number;
    monthLimit:     number | null;
    totalJobs:      number;
    plan:           string;
  }> {
    const { monthlySpend, plan } = await this.getMonthlySpend(tenantId);
    const limit = PLAN_LIMITS[plan]?.monthlyAiUsd ?? null;

    const allTime = await this.repo!
      .createQueryBuilder('j')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(j.cost_usd::numeric)', 'total')
      .where('j.tenant_id = :tenantId', { tenantId })
      .getRawOne<{ count: string; total: string }>();

    return {
      totalCostUsd: parseFloat(allTime?.total ?? '0') || 0,
      monthCostUsd: monthlySpend,
      monthLimit:   limit,
      totalJobs:    parseInt(allTime?.count ?? '0', 10),
      plan,
    };
  }
}
