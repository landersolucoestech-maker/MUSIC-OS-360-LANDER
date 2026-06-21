/**
 * modules/ai/application/GenerateCampaign.usecase.ts
 *
 * UseCase: geração de campanha de marketing completa.
 *
 * Produz:
 *  — brief de campanha
 *  — copy de anúncios (paid-ads)
 *  — plano de analytics (analytics-tracking)
 *  — estratégia de onboarding para novos fãs (onboarding-cro)
 *
 * Execução: cada componente vai para fila separada → AIWorker processa em sequência.
 * Para resultado imediato (formulário): executar via SkillEngine directamente.
 */

import type { AIJob, AIProviderName, AIModelId } from "../domain/ai.types";
import { getAIJobQueue } from "../queues/AIJobQueue";
import { getAIWorker }   from "../workers/AIWorker";
import { getTenantMemory } from "../memory/TenantMemory";
import { getSkillEngine } from "../skills/SkillEngine";
import type { PaidAdsInput } from "../skills/paid-ads";
import type { AnalyticsTrackingInput } from "../skills/analytics-tracking";

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface GenerateCampaignInput {
  tenantId:      string;
  userId?:       string;
  artistName:    string;
  genre?:        string;
  campaignGoal:  string;
  budget?:       string;
  targetPlatforms: string[];
  tone?:         string;
  language?:     string;
  launchDate?:   string;
  provider?:     AIProviderName;
  model?:        AIModelId;
}

export interface GenerateCampaignResult {
  paidAds:           string;
  analyticsPlan:     string;
  onboardingStrategy: string;
  provider:          AIProviderName;
  model:             AIModelId;
  generatedAt:       string;
}

// ─── UseCase ─────────────────────────────────────────────────────────────────

export class GenerateCampaignUseCase {
  private readonly queue  = getAIJobQueue();
  private readonly memory = getTenantMemory();
  private readonly engine = getSkillEngine();

  /**
   * executeSync — executa todos os componentes directamente via SkillEngine.
   * Uso: geração inline em formulários de campanha.
   */
  async executeSync(input: GenerateCampaignInput): Promise<GenerateCampaignResult> {
    this.validate(input);

    const ctx = this.memory.getContext(input.tenantId);
    void ctx; // ctx used for future language/preference lookup

    // PaidAdsInput: platform é singular — usar a primeira plataforma da lista
    const platformMap: Record<string, PaidAdsInput["platform"]> = {
      google:   "google",
      meta:     "meta",
      facebook: "meta",
      instagram:"meta",
      tiktok:   "tiktok",
      linkedin: "linkedin",
      twitter:  "twitter",
    };
    const firstPlatform = input.targetPlatforms[0]?.toLowerCase() ?? "meta";
    const mappedPlatform = platformMap[firstPlatform] ?? "meta";

    const paidAdsInput: PaidAdsInput = {
      artistName:     input.artistName,
      platform:       mappedPlatform,
      objective:      "awareness",
      offer:          input.campaignGoal,
      budget:         input.budget,
      targetAudience: input.genre ? `Fãs de ${input.genre}` : "Público geral musical",
      context:        `Plataformas alvo: ${input.targetPlatforms.join(", ")}. Lançamento: ${input.launchDate ?? "a definir"}.`,
    };

    const analyticsInput: AnalyticsTrackingInput = {
      artistName: input.artistName,
      decisions:  [input.campaignGoal],
      tools:      ["GA4", "Meta Pixel"],
      context:    `Campanha: ${input.campaignGoal}. Plataformas: ${input.targetPlatforms.join(", ")}.`,
    };

    // Execução sequencial (uma por uma, regra do utilizador)
    const paidAdsResult = await this.engine.generatePaidAds(paidAdsInput, input.tenantId);

    const analyticsResult = await this.engine.generateAnalyticsPlan(analyticsInput, input.tenantId);

    const onboardingResult = await this.engine.generateOnboardingStrategy(
      {
        productName: input.artistName,
        productType: "content-platform",
        context:     `Fãs de ${input.genre ?? "música"}. Objectivo: ${input.campaignGoal}.`,
      },
      input.tenantId,
    );

    // Actualizar memória
    this.memory.addArtist(input.tenantId, input.artistName);
    this.memory.trackSkillUsage(input.tenantId, "paid-ads");
    this.memory.trackSkillUsage(input.tenantId, "analytics-tracking");
    this.memory.trackSkillUsage(input.tenantId, "onboarding-cro");

    return {
      paidAds:            paidAdsResult.content,
      analyticsPlan:      analyticsResult.content,
      onboardingStrategy: onboardingResult.content,
      provider:           paidAdsResult.provider,
      model:              paidAdsResult.model,
      generatedAt:        new Date().toISOString(),
    };
  }

  /**
   * enqueue — coloca os três jobs na fila separadamente.
   * Retorna array de jobs para acompanhar com useAIJob.
   */
  enqueueAll(input: GenerateCampaignInput): AIJob[] {
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
    };

    const adsJob = this.queue.enqueue({
      skill:  "paid-ads",
      prompt: `Crie copy de anúncios pagos para campanha de "${input.artistName}". Objetivo: ${input.campaignGoal}. Plataformas: ${input.targetPlatforms.join(", ")}.`,
      context: { ...baseContext, extraContext: `Budget: ${input.budget ?? "não definido"}. Launch: ${input.launchDate ?? "não definido"}.` },
    });

    const analyticsJob = this.queue.enqueue({
      skill:  "analytics-tracking",
      prompt: `Crie plano de analytics para campanha de "${input.artistName}". Objetivo: ${input.campaignGoal}.`,
      context: { ...baseContext },
    });

    const onboardingJob = this.queue.enqueue({
      skill:  "onboarding-cro",
      prompt: `Crie estratégia de onboarding/activação de novos fãs para "${input.artistName}".`,
      context: { ...baseContext },
    });

    // Garantir worker activo
    getAIWorker();

    this.memory.addArtist(input.tenantId, input.artistName);

    return [adsJob, analyticsJob, onboardingJob];
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private validate(input: GenerateCampaignInput): void {
    if (!input.tenantId?.trim())     throw new Error("GenerateCampaign: tenantId é obrigatório.");
    if (!input.artistName?.trim())   throw new Error("GenerateCampaign: artistName é obrigatório.");
    if (!input.campaignGoal?.trim()) throw new Error("GenerateCampaign: campaignGoal é obrigatório.");
    if (!input.targetPlatforms?.length) throw new Error("GenerateCampaign: seleccionar pelo menos 1 plataforma.");
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: GenerateCampaignUseCase | null = null;

export function getGenerateCampaignUseCase(): GenerateCampaignUseCase {
  if (!_instance) _instance = new GenerateCampaignUseCase();
  return _instance;
}

