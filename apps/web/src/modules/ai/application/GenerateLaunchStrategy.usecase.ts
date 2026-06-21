/**
 * modules/ai/application/GenerateLaunchStrategy.usecase.ts
 *
 * UseCase: geração de estratégia completa de lançamento musical.
 *
 * Produz:
 *  — estratégia de lançamento (launch-strategy skill)
 *  — conteúdo social para o período de lançamento (social-content skill)
 *  — copy de press-release (copywriting skill)
 *
 * Integra com TenantMemory para enriquecer contexto do artista.
 */

import type { AIJob, AIProviderName, AIModelId } from "../domain/ai.types";
import { getAIJobQueue }    from "../queues/AIJobQueue";
import { getAIWorker }      from "../workers/AIWorker";
import { getTenantMemory }  from "../memory/TenantMemory";
import { getSkillEngine }   from "../skills/SkillEngine";
import type { LaunchStrategyInput } from "../skills/launch-strategy";
import type { SocialContentInput }  from "../skills/social-content";
import type { CopywritingInput }    from "../skills/copywriting";

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface GenerateLaunchStrategyInput {
  tenantId:       string;
  userId?:        string;
  artistName:     string;
  genre?:         string;
  releaseTitle:   string;
  releaseType:    "single" | "EP" | "álbum";
  releaseDate?:   string;
  distributors?:  string[];
  targetMarkets?: string[];
  budget?:        string;
  tone?:          string;
  language?:      string;
  context?:       string;
  provider?:      AIProviderName;
  model?:         AIModelId;
}

export interface GenerateLaunchStrategyResult {
  launchStrategy: string;
  socialContent:  string;
  pressRelease:   string;
  provider:       AIProviderName;
  model:          AIModelId;
  generatedAt:    string;
}

// ─── UseCase ─────────────────────────────────────────────────────────────────

export class GenerateLaunchStrategyUseCase {
  private readonly queue  = getAIJobQueue();
  private readonly memory = getTenantMemory();
  private readonly engine = getSkillEngine();

  /**
   * executeSync — executa directamente via SkillEngine (bloqueante).
   * Uso: formulários de lançamento que aguardam resultado imediato.
   */
  async executeSync(input: GenerateLaunchStrategyInput): Promise<GenerateLaunchStrategyResult> {
    this.validate(input);

    const ctx      = this.memory.getContext(input.tenantId);
    const tone     = input.tone     ?? ctx.preferredTone;
    const language = input.language ?? ctx.preferredLanguage;

    // Mapear releaseType → LaunchType
    const releaseTypeMap: Record<"single" | "EP" | "álbum", "single" | "ep" | "album"> = {
      single: "single",
      EP:     "ep",
      álbum:  "album",
    };

    const launchInput: LaunchStrategyInput = {
      artistName:   input.artistName,
      genre:        input.genre,
      projectName:  input.releaseTitle,
      launchType:   releaseTypeMap[input.releaseType] ?? "single",
      timeline:     input.releaseDate,
      budget:       input.budget,
      language,
      context:      input.context,
    };

    const socialInput: SocialContentInput = {
      artistName: input.artistName,
      genre:      input.genre,
      platform:   "instagram",
      format:     "post",
      tone,
      language,
      context:    `Lançamento de ${input.releaseType} "${input.releaseTitle}" em ${input.releaseDate ?? "breve"}.`,
    };

    const copyInput: CopywritingInput = {
      artistName:      input.artistName,
      pageType:        "press-release",
      targetAudience:  `Imprensa musical e fãs de ${input.genre ?? "música"}`,
      productOrOffer:  `${input.releaseType} "${input.releaseTitle}"`,
      tone,
      language,
      context:         [
        `Tipo: ${input.releaseType}`,
        input.releaseDate ? `Data: ${input.releaseDate}` : "Data a anunciar",
        ...(input.distributors?.length ? [`Distribuidoras: ${input.distributors.join(", ")}`] : []),
      ].join(". "),
    };

    // Execução sequencial (um por um — regra absoluta do utilizador)
    const launchResult = await this.engine.generateLaunchStrategy(launchInput, input.tenantId);

    const socialResult = await this.engine.generateSocialContent(socialInput, input.tenantId);

    const copyResult = await this.engine.generateCopy(copyInput, input.tenantId);

    // Actualizar memória
    this.memory.addArtist(input.tenantId, input.artistName);
    this.memory.trackSkillUsage(input.tenantId, "launch-strategy");
    this.memory.trackSkillUsage(input.tenantId, "social-content");
    this.memory.trackSkillUsage(input.tenantId, "copywriting");

    return {
      launchStrategy: launchResult.parsed.summary,
      socialContent:  socialResult.parsed.mainContent,
      pressRelease:   copyResult.parsed.bodyCopy,
      provider:       launchResult.provider,
      model:          launchResult.model,
      generatedAt:    new Date().toISOString(),
    };
  }

  /**
   * enqueueAll — coloca os três jobs na fila para processamento assíncrono.
   * Acompanhar individualmente com useAIJob(jobId).
   */
  enqueueAll(input: GenerateLaunchStrategyInput): AIJob[] {
    this.validate(input);

    const ctx      = this.memory.getContext(input.tenantId);
    const tone     = input.tone     ?? ctx.preferredTone;
    const language = input.language ?? ctx.preferredLanguage;

    const baseContext = {
      tenantId:   input.tenantId,
      userId:     input.userId,
      artistName: input.artistName,
      genre:      input.genre,
      tone,
      language,
      extraContext: `${input.releaseType} "${input.releaseTitle}" — lançamento em ${input.releaseDate ?? "data a definir"}.`,
    };

    const launchJob = this.queue.enqueue({
      skill:  "launch-strategy",
      prompt: `Crie estratégia completa de lançamento para ${input.releaseType} "${input.releaseTitle}" de "${input.artistName}".`,
      context: baseContext,
      provider:    input.provider,
      model:       input.model,
    });

    const socialJob = this.queue.enqueue({
      skill:  "social-content",
      prompt: `Crie série de posts para o lançamento de ${input.releaseType} "${input.releaseTitle}" de "${input.artistName}".`,
      context: { ...baseContext, platform: "instagram" },
    });

    const pressJob = this.queue.enqueue({
      skill:  "copywriting",
      prompt: `Escreva press-release para o lançamento de ${input.releaseType} "${input.releaseTitle}" de "${input.artistName}".`,
      context: baseContext,
    });

    // Garantir worker activo
    getAIWorker();

    this.memory.addArtist(input.tenantId, input.artistName);

    return [launchJob, socialJob, pressJob];
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private validate(input: GenerateLaunchStrategyInput): void {
    if (!input.tenantId?.trim())     throw new Error("GenerateLaunchStrategy: tenantId é obrigatório.");
    if (!input.artistName?.trim())   throw new Error("GenerateLaunchStrategy: artistName é obrigatório.");
    if (!input.releaseTitle?.trim()) throw new Error("GenerateLaunchStrategy: releaseTitle é obrigatório.");
    if (!input.releaseType)          throw new Error("GenerateLaunchStrategy: releaseType é obrigatório.");
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: GenerateLaunchStrategyUseCase | null = null;

export function getGenerateLaunchStrategyUseCase(): GenerateLaunchStrategyUseCase {
  if (!_instance) _instance = new GenerateLaunchStrategyUseCase();
  return _instance;
}

