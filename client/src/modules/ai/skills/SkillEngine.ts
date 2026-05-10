/**
 * modules/ai/skills/SkillEngine.ts
 *
 * Motor de execução de skills de IA.
 * Responsável por:
 *  — registro de skills disponíveis
 *  — construção de prompts via builders canónicos
 *  — roteamento de requests para AIOrchestrator
 *  — parsing de respostas em tipos estruturados
 *  — validação de inputs antes de enviar
 *
 * FLUXO: Frontend → SkillEngine.execute() → AIOrchestrator.execute() → Provider
 */

import type {
  AISkillName,
  AISkillMetadata,
  AIProviderName,
  AIModelId,
  ContentType,
  GenerateContentInput,
  GenerateContentOutput,
} from "../domain/ai.types";
import { getAIOrchestrator } from "../orchestrators/AIOrchestrator";

import {
  SOCIAL_CONTENT_SYSTEM_PROMPT,
  buildSocialContentPrompt,
  parseSocialContentResponse,
} from "./social-content";
import type { SocialContentInput } from "./social-content";

import {
  COPYWRITING_SYSTEM_PROMPT,
  buildCopywritingPrompt,
  parseCopywritingResponse,
} from "./copywriting";
import type { CopywritingInput } from "./copywriting";

import {
  LAUNCH_STRATEGY_SYSTEM_PROMPT,
  buildLaunchStrategyPrompt,
  parseLaunchStrategyResponse,
} from "./launch-strategy";
import type { LaunchStrategyInput } from "./launch-strategy";

import { PAID_ADS_SYSTEM_PROMPT, buildPaidAdsPrompt } from "./paid-ads";
import type { PaidAdsInput } from "./paid-ads";

import { ANALYTICS_TRACKING_SYSTEM_PROMPT, buildAnalyticsTrackingPrompt } from "./analytics-tracking";
import type { AnalyticsTrackingInput } from "./analytics-tracking";

import { ONBOARDING_CRO_SYSTEM_PROMPT, buildOnboardingCROPrompt } from "./onboarding-cro";
import type { OnboardingCROInput } from "./onboarding-cro";

// ─── Skill metadata registry ──────────────────────────────────────────────────

const SKILL_REGISTRY: Record<AISkillName, AISkillMetadata> = {
  "social-content": {
    name:              "social-content",
    version:           "1.3.0",
    description:       "Conteúdo para redes sociais — posts, captions, threads, vídeos curtos",
    preferredProvider: "openai",
    preferredModel:    "gpt-4o-mini",
    fallbackModel:     "claude-3-5-haiku",
    maxTokens:         1024,
    temperature:       0.8,
  },
  "copywriting": {
    name:              "copywriting",
    version:           "1.1.0",
    description:       "Copy de conversão — headline, body, CTA para páginas e anúncios",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         2048,
    temperature:       0.7,
  },
  "launch-strategy": {
    name:              "launch-strategy",
    version:           "1.1.0",
    description:       "Estratégia de lançamento de produtos musicais e features",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         3000,
    temperature:       0.6,
  },
  "paid-ads": {
    name:              "paid-ads",
    version:           "1.2.0",
    description:       "Campanhas de anúncios pagos — Google, Meta, TikTok, LinkedIn",
    preferredProvider: "openai",
    preferredModel:    "gpt-4o",
    fallbackModel:     "claude-3-5-sonnet",
    maxTokens:         2048,
    temperature:       0.7,
  },
  "analytics-tracking": {
    name:              "analytics-tracking",
    version:           "1.1.0",
    description:       "Plano de tracking de analytics e medição",
    preferredProvider: "openai",
    preferredModel:    "gpt-4o-mini",
    fallbackModel:     "claude-3-5-haiku",
    maxTokens:         2048,
    temperature:       0.5,
  },
  "onboarding-cro": {
    name:              "onboarding-cro",
    version:           "1.1.0",
    description:       "Optimização de onboarding, activação e time-to-value",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-haiku",
    fallbackModel:     "gpt-4o-mini",
    maxTokens:         2048,
    temperature:       0.6,
  },
};

// ─── Mapeamento ContentType → skill ───────────────────────────────────────────

const CONTENT_TYPE_TO_SKILL: Record<ContentType, AISkillName> = {
  post:            "social-content",
  caption:         "social-content",
  bio:             "copywriting",
  "press-release": "copywriting",
  email:           "copywriting",
  ad:              "paid-ads",
  lancamento:      "launch-strategy",
  engajamento:     "social-content",
  branding:        "copywriting",
  "launch-plan":   "launch-strategy",
  "campaign-brief": "paid-ads",
  copywriting:     "copywriting",
};

// ─── SkillEngine ──────────────────────────────────────────────────────────────

export class SkillEngine {
  private readonly orchestrator = getAIOrchestrator();

  // ── Lista skills disponíveis ─────────────────────────────────────────────

  getAvailableSkills(): AISkillMetadata[] {
    return Object.values(SKILL_REGISTRY);
  }

  getSkillMetadata(name: AISkillName): AISkillMetadata | undefined {
    return SKILL_REGISTRY[name];
  }

  // ── Geração de conteúdo genérico (ContentType → skill automático) ────────

  async generateContent(input: GenerateContentInput): Promise<GenerateContentOutput> {
    const skill = CONTENT_TYPE_TO_SKILL[input.type] ?? "social-content";
    const meta  = SKILL_REGISTRY[skill];

    const prompt = this.buildPromptForContentType(input);

    const response = await this.orchestrator.execute({
      skill,
      prompt,
      tenantId: input.tenantId ?? "default",
      context: {
        artistName:   input.artistName,
        genre:        input.genre,
        platform:     input.platform,
        tone:         input.tone,
        language:     input.language ?? "pt-BR",
        extraContext: input.context,
      },
      provider:    input.provider ?? meta.preferredProvider,
      model:       input.model    ?? meta.preferredModel,
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      content:     response.content,
      type:        input.type,
      artistName:  input.artistName,
      skill,
      provider:    response.provider,
      model:       response.model,
      tokens:      response.totalTokens,
      costUsd:     response.costUsd,
      generatedAt: response.createdAt,
    };
  }

  // ── Social Content ───────────────────────────────────────────────────────

  async generateSocialContent(input: SocialContentInput, tenantId = "default") {
    const meta   = SKILL_REGISTRY["social-content"];
    const prompt = `${SOCIAL_CONTENT_SYSTEM_PROMPT}\n\n---\n\n${buildSocialContentPrompt(input)}`;

    const response = await this.orchestrator.execute({
      skill:       "social-content",
      prompt,
      tenantId,
      context: { artistName: input.artistName, genre: input.genre, platform: input.platform, tone: input.tone },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseSocialContentResponse(response.content, input),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Copywriting ──────────────────────────────────────────────────────────

  async generateCopy(input: CopywritingInput, tenantId = "default") {
    const meta   = SKILL_REGISTRY["copywriting"];
    const prompt = `${COPYWRITING_SYSTEM_PROMPT}\n\n---\n\n${buildCopywritingPrompt(input)}`;

    const response = await this.orchestrator.execute({
      skill:       "copywriting",
      prompt,
      tenantId,
      context: { artistName: input.artistName, tone: input.tone },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseCopywritingResponse(response.content, input),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Launch Strategy ──────────────────────────────────────────────────────

  async generateLaunchStrategy(input: LaunchStrategyInput, tenantId = "default") {
    const meta   = SKILL_REGISTRY["launch-strategy"];
    const prompt = `${LAUNCH_STRATEGY_SYSTEM_PROMPT}\n\n---\n\n${buildLaunchStrategyPrompt(input)}`;

    const response = await this.orchestrator.execute({
      skill:       "launch-strategy",
      prompt,
      tenantId,
      context: { artistName: input.artistName, genre: input.genre },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseLaunchStrategyResponse(response.content, input),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Paid Ads ─────────────────────────────────────────────────────────────

  async generatePaidAds(input: PaidAdsInput, tenantId = "default") {
    const meta   = SKILL_REGISTRY["paid-ads"];
    const prompt = `${PAID_ADS_SYSTEM_PROMPT}\n\n---\n\n${buildPaidAdsPrompt(input)}`;

    const response = await this.orchestrator.execute({
      skill:       "paid-ads",
      prompt,
      tenantId,
      context: { artistName: input.artistName },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return { content: response.content, provider: response.provider, model: response.model };
  }

  // ── Analytics Tracking ───────────────────────────────────────────────────

  async generateAnalyticsPlan(input: AnalyticsTrackingInput, tenantId = "default") {
    const meta   = SKILL_REGISTRY["analytics-tracking"];
    const prompt = `${ANALYTICS_TRACKING_SYSTEM_PROMPT}\n\n---\n\n${buildAnalyticsTrackingPrompt(input)}`;

    const response = await this.orchestrator.execute({
      skill:       "analytics-tracking",
      prompt,
      tenantId,
      context: { artistName: input.artistName },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return { content: response.content, provider: response.provider, model: response.model };
  }

  // ── Onboarding CRO ───────────────────────────────────────────────────────

  async generateOnboardingStrategy(input: OnboardingCROInput, tenantId = "default") {
    const meta   = SKILL_REGISTRY["onboarding-cro"];
    const prompt = `${ONBOARDING_CRO_SYSTEM_PROMPT}\n\n---\n\n${buildOnboardingCROPrompt(input)}`;

    const response = await this.orchestrator.execute({
      skill:       "onboarding-cro",
      prompt,
      tenantId,
      context: {},
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return { content: response.content, provider: response.provider, model: response.model };
  }

  // ── Prompt builder para ContentType genérico ─────────────────────────────

  private buildPromptForContentType(input: GenerateContentInput): string {
    const { type, artistName, genre, platform, tone, context, language } = input;

    const TYPE_LABELS: Record<ContentType, string> = {
      post:            "post para redes sociais",
      caption:         "legenda/caption",
      bio:             "bio artística",
      "press-release": "press-release",
      email:           "e-mail de divulgação",
      ad:              "copy de anúncio",
      lancamento:      "estratégia de lançamento",
      engajamento:     "conteúdo de engajamento",
      branding:        "narrativa de marca",
      "launch-plan":   "plano de lançamento completo",
      "campaign-brief": "briefing de campanha",
      copywriting:     "copy de conversão",
    };

    const skillName = CONTENT_TYPE_TO_SKILL[type];
    const systemPrompts: Record<AISkillName, string> = {
      "social-content":     SOCIAL_CONTENT_SYSTEM_PROMPT,
      "copywriting":        COPYWRITING_SYSTEM_PROMPT,
      "launch-strategy":    LAUNCH_STRATEGY_SYSTEM_PROMPT,
      "paid-ads":           PAID_ADS_SYSTEM_PROMPT,
      "analytics-tracking": ANALYTICS_TRACKING_SYSTEM_PROMPT,
      "onboarding-cro":     ONBOARDING_CRO_SYSTEM_PROMPT,
    };

    const systemPrompt = systemPrompts[skillName] ?? SOCIAL_CONTENT_SYSTEM_PROMPT;
    const typeLabel    = TYPE_LABELS[type] ?? type;

    const lines = [
      systemPrompt,
      "\n---\n",
      `Crie um ${typeLabel} para o artista "${artistName}".`,
    ];

    if (genre)    lines.push(`Gênero musical: ${genre}.`);
    if (platform) lines.push(`Plataforma: ${platform}.`);
    if (tone)     lines.push(`Tom: ${tone}.`);
    if (context)  lines.push(`Contexto adicional: ${context}.`);
    if (language) lines.push(`Idioma: ${language}.`);
    lines.push("Seja criativo, autêntico e adequado ao mercado musical brasileiro.");

    return lines.join("\n");
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _skillEngineInstance: SkillEngine | null = null;

export function getSkillEngine(): SkillEngine {
  if (!_skillEngineInstance) {
    _skillEngineInstance = new SkillEngine();
  }
  return _skillEngineInstance;
}

// ─── Exports de tipos para conveniência ──────────────────────────────────────

export type { AISkillName, AISkillMetadata, AIProviderName, AIModelId };
