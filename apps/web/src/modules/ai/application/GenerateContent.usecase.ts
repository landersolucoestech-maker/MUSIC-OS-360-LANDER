/**
 * modules/ai/application/GenerateContent.usecase.ts
 *
 * UseCase: geração de conteúdo genérico (post, caption, bio, press-release, email, ad…)
 *
 * Fluxo:
 *  1. Validar input
 *  2. Enriquecer com contexto de TenantMemory
 *  3. Enqueue via AIJobQueue
 *  4. AIWorker processa (sync ou aguardar via polling)
 *  5. Registar skill usage em TenantMemory
 *  6. Retornar resultado
 *
 * Para uso reactivo (não-bloqueante) → ver hooks/useAI.ts
 * Para resultado síncrono imediato → usar executeSync()
 */

import type { ContentType, AIJob, AIProviderName, AIModelId, AISkillName } from "../domain/ai.types";
import { getAIJobQueue } from "../queues/AIJobQueue";
import { getAIWorker } from "../workers/AIWorker";
import { getTenantMemory } from "../memory/TenantMemory";
import { getSkillEngine } from "../skills/SkillEngine";

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface GenerateContentInput {
  tenantId:    string;
  userId?:     string;
  artistName:  string;
  type:        ContentType;
  genre?:      string;
  platform?:   string;
  tone?:       string;
  language?:   string;
  context?:    string;
  provider?:   AIProviderName;
  model?:      AIModelId;
}

export interface GenerateContentResult {
  content:     string;
  type:        ContentType;
  artistName:  string;
  skill:       AISkillName;
  provider:    AIProviderName;
  model:       AIModelId;
  tokens:      number;
  costUsd:     number;
  generatedAt: string;
  jobId:       string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(input: GenerateContentInput): void {
  if (!input.tenantId?.trim()) {
    throw new Error("GenerateContent: tenantId é obrigatório.");
  }
  if (!input.artistName?.trim()) {
    throw new Error("GenerateContent: artistName é obrigatório.");
  }
  if (!input.type) {
    throw new Error("GenerateContent: type é obrigatório.");
  }
}

// ─── UseCase ─────────────────────────────────────────────────────────────────

export class GenerateContentUseCase {
  private readonly queue  = getAIJobQueue();
  private readonly memory = getTenantMemory();
  private readonly engine = getSkillEngine();

  /**
   * executeSync — executa directamente via SkillEngine (sem fila).
   * Uso: formulários, botões "Gerar" inline que aguardam resposta.
   */
  async executeSync(input: GenerateContentInput): Promise<GenerateContentResult> {
    validate(input);

    // Enriquecer com contexto de memória do tenant
    const ctx     = this.memory.getContext(input.tenantId);
    const tone     = input.tone     ?? ctx.preferredTone;
    const language = input.language ?? ctx.preferredLanguage;

    const enriched = { ...input, tone, language };

    const output = await this.engine.generateContent({
      tenantId:   enriched.tenantId,
      artistName: enriched.artistName,
      type:       enriched.type,
      genre:      enriched.genre,
      platform:   enriched.platform,
      tone,
      language,
      context:    enriched.context,
      provider:   enriched.provider,
      model:      enriched.model,
    });

    // Actualizar memória
    this.memory.addArtist(input.tenantId, input.artistName);
    this.memory.trackSkillUsage(input.tenantId, output.skill);

    return {
      ...output,
      jobId: `sync_${Date.now()}`,
    };
  }

  /**
   * enqueue — coloca job na fila para processamento assíncrono.
   * Uso: geração em background (lotes, processos longos).
   * Acompanhar com useAIJob(jobId).
   */
  enqueue(input: GenerateContentInput): AIJob {
    validate(input);

    const ctx      = this.memory.getContext(input.tenantId);
    const tone     = input.tone     ?? ctx.preferredTone;
    const language = input.language ?? ctx.preferredLanguage;

    // Determinar skill a partir do type (mapeamento no SkillEngine)
    const CONTENT_TYPE_SKILL_MAP: Record<ContentType, AISkillName> = {
      post:             "social-content",
      caption:          "social-content",
      bio:              "copywriting",
      "press-release":  "copywriting",
      email:            "copywriting",
      ad:               "paid-ads",
      lancamento:       "launch-strategy",
      engajamento:      "social-content",
      branding:         "copywriting",
      "launch-plan":    "launch-strategy",
      "campaign-brief": "paid-ads",
      copywriting:      "copywriting",
    };

    const skill = CONTENT_TYPE_SKILL_MAP[input.type] ?? "social-content";
    const meta  = this.engine.getSkillMetadata(skill);

    const job = this.queue.enqueue({
      skill,
      prompt: `Crie ${input.type} para o artista "${input.artistName}".${input.context ? ` Contexto: ${input.context}` : ""}`,
      context: {
        tenantId:     input.tenantId,
        userId:       input.userId,
        artistName:   input.artistName,
        genre:        input.genre,
        platform:     input.platform,
        tone,
        language,
        extraContext: input.context,
      },
      provider:    input.provider ?? meta?.preferredProvider,
      model:       input.model    ?? meta?.preferredModel,
      maxTokens:   meta?.maxTokens,
      temperature: meta?.temperature,
    });

    // Garantir que o worker está a correr
    getAIWorker();

    this.memory.addArtist(input.tenantId, input.artistName);
    this.memory.trackSkillUsage(input.tenantId, skill);

    return job;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: GenerateContentUseCase | null = null;

export function getGenerateContentUseCase(): GenerateContentUseCase {
  if (!_instance) _instance = new GenerateContentUseCase();
  return _instance;
}

