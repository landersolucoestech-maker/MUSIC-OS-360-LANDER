/**
 * modules/ai/orchestrators/AIOrchestrator.ts
 *
 * Responsável por:
 *  — seleção automática de provider/modelo
 *  — roteamento de skills → provider mais adequado
 *  — retries com exponential backoff
 *  — fallback automático entre providers
 *  — tenant isolation
 *  — controlo de custo por request
 *  — observabilidade (execução registada no AIAnalytics)
 *  — controlo de tokens
 *
 * NÃO chamar providers directamente fora deste módulo.
 */

import type {
  AIProviderName,
  AIModelId,
  AISkillName,
  AIRequest,
  AIResponse,
  AIOrchestatorConfig,
  AIModel,
} from "../domain/ai.types";
import { AIError } from "../domain/ai.types";
import type { IAIProvider } from "../providers/AIProvider.interface";
import { OpenAIProvider } from "../providers/OpenAIProvider";
import { ClaudeProvider } from "../providers/ClaudeProvider";
import { GeminiProvider } from "../providers/GeminiProvider";
import { PerplexityProvider } from "../providers/PerplexityProvider";

// ─── Routing table — qual provider/modelo é preferido por skill ──────────────

const SKILL_ROUTING: Record<AISkillName, { provider: AIProviderName; model: AIModelId }> = {
  "social-content":     { provider: "openai",     model: "gpt-4o-mini" },
  "copywriting":        { provider: "claude",      model: "claude-3-5-sonnet" },
  "launch-strategy":    { provider: "claude",      model: "claude-3-5-sonnet" },
  "paid-ads":           { provider: "openai",      model: "gpt-4o" },
  "analytics-tracking": { provider: "openai",      model: "gpt-4o-mini" },
  "onboarding-cro":     { provider: "claude",      model: "claude-3-5-haiku" },
  "project-planning":   { provider: "claude",      model: "claude-3-5-sonnet" },
  "release-checklist":  { provider: "claude",      model: "claude-3-5-sonnet" },
  "contract-analysis":  { provider: "claude",      model: "claude-3-5-sonnet" },
  "catalog-metadata-validator": { provider: "claude", model: "claude-3-5-sonnet" },
  "financial-classification":   { provider: "claude", model: "claude-3-5-sonnet" },
  "crm-followup":               { provider: "claude", model: "claude-3-5-sonnet" },
  "audiovisual-briefing":       { provider: "claude", model: "claude-3-5-sonnet" },
  "marketing-calendar-builder": { provider: "claude", model: "claude-3-5-sonnet" },
  "artist-profile-analysis":    { provider: "claude", model: "claude-3-5-sonnet" },
  "licensing-opportunity-analysis": { provider: "claude", model: "claude-3-5-sonnet" },
  "rights-monitoring-analysis":     { provider: "claude", model: "claude-3-5-sonnet" },
  "support-triage":                 { provider: "claude", model: "claude-3-5-sonnet" },
};

const DEFAULT_CONFIG: AIOrchestatorConfig = {
  defaultProvider:       "openai",
  fallbackProviders:     ["claude", "gemini", "perplexity"],
  maxRetries:            3,
  retryDelayMs:          1000,
  timeoutMs:             30000,
  maxCostPerRequestUsd:  0.50,
  enableAnalytics:       true,
  enableMemory:          false,
};

// ─── Provider registry ────────────────────────────────────────────────────────

function buildRegistry(): Map<AIProviderName, IAIProvider> {
  const registry = new Map<AIProviderName, IAIProvider>();
  registry.set("openai",     new OpenAIProvider());
  registry.set("claude",     new ClaudeProvider());
  registry.set("gemini",     new GeminiProvider());
  registry.set("perplexity", new PerplexityProvider());
  return registry;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generateRequestId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function estimateCost(model: AIModel, estimatedTokens: number): number {
  const outTokens = estimatedTokens * 0.6;
  const inTokens  = estimatedTokens * 0.4;
  return inTokens * model.costPerInputToken + outTokens * model.costPerOutputToken;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class AIOrchestrator {
  private readonly registry: Map<AIProviderName, IAIProvider>;
  private readonly config: AIOrchestatorConfig;

  constructor(config: Partial<AIOrchestatorConfig> = {}) {
    this.config   = { ...DEFAULT_CONFIG, ...config };
    this.registry = buildRegistry();
  }

  // ── Seleciona provider para skill/request ────────────────────────────────

  private resolveProviderAndModel(
    skill: AISkillName,
    preferredProvider?: AIProviderName,
    preferredModel?: AIModelId,
  ): { provider: IAIProvider; model: AIModelId } {
    const routing = SKILL_ROUTING[skill];

    const providerName = preferredProvider ?? routing?.provider ?? this.config.defaultProvider;
    const modelId      = preferredModel    ?? routing?.model    ?? "gpt-4o-mini";

    const provider = this.registry.get(providerName);
    if (!provider) {
      throw new AIError("PROVIDER_UNAVAILABLE", `Provider "${providerName}" não encontrado`, providerName);
    }

    return { provider, model: modelId };
  }

  // ── Fallback chain ───────────────────────────────────────────────────────

  private getFallbackChain(excludeProvider: AIProviderName): IAIProvider[] {
    return this.config.fallbackProviders
      .filter((p) => p !== excludeProvider)
      .map((p) => this.registry.get(p))
      .filter((p): p is IAIProvider => p !== undefined);
  }

  // ── Execute com retries + fallback ───────────────────────────────────────

  async execute(params: {
    skill: AISkillName;
    prompt: string;
    tenantId: string;
    userId?: string;
    context?: Record<string, string | undefined>;
    provider?: AIProviderName;
    model?: AIModelId;
    maxTokens?: number;
    temperature?: number;
  }): Promise<AIResponse> {
    const requestId = generateRequestId();
    const createdAt = new Date().toISOString();

    const { provider: resolvedProvider, model: resolvedModel } = this.resolveProviderAndModel(
      params.skill,
      params.provider,
      params.model,
    );

    const request: AIRequest = {
      requestId,
      skill:   params.skill,
      prompt:  params.prompt,
      context: {
        tenantId:     params.tenantId,
        userId:       params.userId,
        artistName:   params.context?.artistName,
        genre:        params.context?.genre,
        platform:     params.context?.platform,
        tone:         params.context?.tone,
        language:     params.context?.language ?? "pt-BR",
        extraContext: params.context?.extraContext,
      },
      model:       resolvedModel,
      provider:    resolvedProvider.name,
      maxTokens:   params.maxTokens   ?? 1024,
      temperature: params.temperature ?? 0.7,
      createdAt,
    };

    // Verificar custo estimado antes de executar
    const allModels = resolvedProvider.supportedModels;
    const modelDef  = allModels.find((m) => m.id === resolvedModel);
    if (modelDef) {
      const estimatedCost = estimateCost(modelDef, (params.maxTokens ?? 1024) * 2);
      if (estimatedCost > this.config.maxCostPerRequestUsd) {
        throw new AIError(
          "TOKEN_LIMIT_EXCEEDED",
          `Custo estimado $${estimatedCost.toFixed(4)} excede limite $${this.config.maxCostPerRequestUsd}`,
          resolvedProvider.name,
        );
      }
    }

    // Executar com retries
    let lastError: AIError | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await resolvedProvider.generate(request);
        return response;
      } catch (err) {
        const aiErr = err instanceof AIError
          ? err
          : new AIError("UNKNOWN", String(err), resolvedProvider.name);

        lastError = aiErr;

        if (!aiErr.retryable || attempt === this.config.maxRetries) break;

        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }

    // Tentar fallback providers
    const fallbacks = this.getFallbackChain(resolvedProvider.name);
    for (const fallbackProvider of fallbacks) {
      try {
        const fallbackRequest: AIRequest = {
          ...request,
          provider: fallbackProvider.name,
          model:    fallbackProvider.supportedModels[0]?.id ?? "gpt-4o-mini",
        };
        const response = await fallbackProvider.generate(fallbackRequest);
        return response;
      } catch {
        // continuar para próximo fallback
      }
    }

    throw lastError ?? new AIError("UNKNOWN", "Todos os providers falharam", undefined, false);
  }

  // ── Lista todos os modelos disponíveis ───────────────────────────────────

  getAllModels(): AIModel[] {
    const models: AIModel[] = [];
    this.registry.forEach((provider) => {
      models.push(...provider.supportedModels);
    });
    return models;
  }

  // ── Health check de todos os providers ──────────────────────────────────

  async healthCheckAll() {
    const results = await Promise.allSettled(
      Array.from(this.registry.values()).map((p) => p.healthCheck()),
    );
    return results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _orchestratorInstance: AIOrchestrator | null = null;

export function getAIOrchestrator(config?: Partial<AIOrchestatorConfig>): AIOrchestrator {
  if (!_orchestratorInstance) {
    _orchestratorInstance = new AIOrchestrator(config);
  }
  return _orchestratorInstance;
}

