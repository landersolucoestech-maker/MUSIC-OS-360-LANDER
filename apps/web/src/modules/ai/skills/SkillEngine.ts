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
import { AIError } from "../domain/ai.types";
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

import {
  PROJECT_PLANNING_SYSTEM_PROMPT,
  buildProjectPlanningPrompt,
  parseProjectPlanningResponse,
  validateProjectPlanningInput,
} from "./project-planning";
import type { ProjectPlanningInput } from "./project-planning";

import {
  RELEASE_CHECKLIST_SYSTEM_PROMPT,
  buildReleaseChecklistPrompt,
  parseReleaseChecklistResponse,
  validateReleaseChecklistInput,
} from "./release-checklist";
import type { ReleaseChecklistInput } from "./release-checklist";

import {
  CONTRACT_ANALYSIS_SYSTEM_PROMPT,
  buildContractAnalysisPrompt,
  parseContractAnalysisResponse,
  validateContractAnalysisInput,
} from "./contract-analysis";
import type { ContractAnalysisInput } from "./contract-analysis";

import {
  CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT,
  buildCatalogMetadataValidatorPrompt,
  parseCatalogMetadataValidatorResponse,
  validateCatalogMetadataValidatorInput,
} from "./catalog-metadata-validator";
import type { CatalogMetadataValidatorInput } from "./catalog-metadata-validator";

import {
  FINANCIAL_CLASSIFICATION_SYSTEM_PROMPT,
  buildFinancialClassificationPrompt,
  parseFinancialClassificationResponse,
  validateFinancialClassificationInput,
} from "./financial-classification";
import type { FinancialClassificationInput } from "./financial-classification";

import {
  CRM_FOLLOWUP_SYSTEM_PROMPT,
  buildCrmFollowupPrompt,
  parseCrmFollowupResponse,
  validateCrmFollowupInput,
} from "./crm-followup";
import type { CrmFollowupInput } from "./crm-followup";

import {
  AUDIOVISUAL_BRIEFING_SYSTEM_PROMPT,
  buildAudiovisualBriefingPrompt,
  parseAudiovisualBriefingResponse,
  validateAudiovisualBriefingInput,
} from "./audiovisual-briefing";
import type { AudiovisualBriefingInput } from "./audiovisual-briefing";

import {
  MARKETING_CALENDAR_BUILDER_SYSTEM_PROMPT,
  buildMarketingCalendarBuilderPrompt,
  parseMarketingCalendarBuilderResponse,
  validateMarketingCalendarBuilderInput,
} from "./marketing-calendar-builder";
import type { MarketingCalendarBuilderInput } from "./marketing-calendar-builder";

import {
  ARTIST_PROFILE_ANALYSIS_SYSTEM_PROMPT,
  buildArtistProfileAnalysisPrompt,
  parseArtistProfileAnalysisResponse,
  validateArtistProfileAnalysisInput,
} from "./artist-profile-analysis";
import type { ArtistProfileAnalysisInput } from "./artist-profile-analysis";

import {
  LICENSING_OPPORTUNITY_ANALYSIS_SYSTEM_PROMPT,
  buildLicensingOpportunityAnalysisPrompt,
  parseLicensingOpportunityAnalysisResponse,
  validateLicensingOpportunityAnalysisInput,
} from "./licensing-opportunity-analysis";
import type { LicensingOpportunityAnalysisInput } from "./licensing-opportunity-analysis";

import {
  RIGHTS_MONITORING_ANALYSIS_SYSTEM_PROMPT,
  buildRightsMonitoringAnalysisPrompt,
  parseRightsMonitoringAnalysisResponse,
  validateRightsMonitoringAnalysisInput,
} from "./rights-monitoring-analysis";
import type { RightsMonitoringAnalysisInput } from "./rights-monitoring-analysis";

import {
  SUPPORT_TRIAGE_SYSTEM_PROMPT,
  buildSupportTriagePrompt,
  parseSupportTriageResponse,
  validateSupportTriageInput,
} from "./support-triage";
import type { SupportTriageInput } from "./support-triage";

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
  "project-planning": {
    name:              "project-planning",
    version:           "1.0.0",
    description:       "Planejamento operacional de projetos musicais — gravadora, editora e produtora",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.5,
  },
  "release-checklist": {
    name:              "release-checklist",
    version:           "1.0.0",
    description:       "Auditoria de prontidão de lançamento musical — gravadora, editora e produtora",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.4,
  },
  "contract-analysis": {
    name:              "contract-analysis",
    version:           "1.0.0",
    description:       "Análise operacional de contratos do mercado musical — partes, vigência, direitos, receitas e riscos",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.3,
  },
  "catalog-metadata-validator": {
    name:              "catalog-metadata-validator",
    version:           "1.0.0",
    description:       "Validação de metadata de catálogo musical — obra e fonograma, shares, ISRC/UPC e riscos de direitos",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.2,
  },
  "financial-classification": {
    name:              "financial-classification",
    version:           "1.0.0",
    description:       "Classificação financeira de transações — categoria, centro de custo, vínculo e riscos fiscais",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         2048,
    temperature:       0.2,
  },
  "crm-followup": {
    name:              "crm-followup",
    version:           "1.0.0",
    description:       "Follow-up comercial de CRM — próximo passo, mensagem, objeções, conversão e estágio do funil",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         2048,
    temperature:       0.6,
  },
  "audiovisual-briefing": {
    name:              "audiovisual-briefing",
    version:           "1.0.0",
    description:       "Briefing de produção audiovisual — conceito, roteiro, cenas, assets, equipe e entregáveis",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.7,
  },
  "marketing-calendar-builder": {
    name:              "marketing-calendar-builder",
    version:           "1.0.0",
    description:       "Calendário de marketing musical — agenda datada, pilares, estratégia por canal e fases de campanha",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.5,
  },
  "artist-profile-analysis": {
    name:              "artist-profile-analysis",
    version:           "1.0.0",
    description:       "Análise de perfil artístico — posicionamento, público, forças/fraquezas, oportunidades e narrativa de marca",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.5,
  },
  "licensing-opportunity-analysis": {
    name:              "licensing-opportunity-analysis",
    version:           "1.0.0",
    description:       "Análise de oportunidade de licenciamento — viabilidade, faixa de preço, direitos, riscos e decisão",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.3,
  },
  "rights-monitoring-analysis": {
    name:              "rights-monitoring-analysis",
    version:           "1.0.0",
    description:       "Análise de monitoramento de direitos — correspondência, risco de infração, ação e documentação",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         4096,
    temperature:       0.2,
  },
  "support-triage": {
    name:              "support-triage",
    version:           "1.0.0",
    description:       "Triagem de tickets de suporte — categoria, prioridade, severidade, módulo, SLA e resposta sugerida",
    preferredProvider: "claude",
    preferredModel:    "claude-3-5-sonnet",
    fallbackModel:     "gpt-4o",
    maxTokens:         2048,
    temperature:       0.3,
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

  // ── Project Planning ─────────────────────────────────────────────────────

  async generateProjectPlan(input: ProjectPlanningInput, tenantId = "default") {
    const validation = validateProjectPlanningInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `project-planning: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["project-planning"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${PROJECT_PLANNING_SYSTEM_PROMPT}\n\n---\n\n${buildProjectPlanningPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "project-planning",
      prompt,
      tenantId,
      context: { artistName: input.artistName, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseProjectPlanningResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Release Checklist ────────────────────────────────────────────────────

  async generateReleaseChecklist(input: ReleaseChecklistInput, tenantId = "default") {
    const validation = validateReleaseChecklistInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `release-checklist: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["release-checklist"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${RELEASE_CHECKLIST_SYSTEM_PROMPT}\n\n---\n\n${buildReleaseChecklistPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "release-checklist",
      prompt,
      tenantId,
      context: { artistName: input.artistName, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseReleaseChecklistResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Contract Analysis ────────────────────────────────────────────────────

  async analyzeContract(input: ContractAnalysisInput, tenantId = "default") {
    const validation = validateContractAnalysisInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `contract-analysis: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["contract-analysis"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${CONTRACT_ANALYSIS_SYSTEM_PROMPT}\n\n---\n\n${buildContractAnalysisPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "contract-analysis",
      prompt,
      tenantId,
      context: { language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseContractAnalysisResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Catalog Metadata Validator ───────────────────────────────────────────

  async validateCatalogMetadata(input: CatalogMetadataValidatorInput, tenantId = "default") {
    const validation = validateCatalogMetadataValidatorInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `catalog-metadata-validator: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["catalog-metadata-validator"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT}\n\n---\n\n${buildCatalogMetadataValidatorPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "catalog-metadata-validator",
      prompt,
      tenantId,
      context: { language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseCatalogMetadataValidatorResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Financial Classification ─────────────────────────────────────────────

  async classifyFinancialTransaction(input: FinancialClassificationInput, tenantId = "default") {
    const validation = validateFinancialClassificationInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `financial-classification: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["financial-classification"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${FINANCIAL_CLASSIFICATION_SYSTEM_PROMPT}\n\n---\n\n${buildFinancialClassificationPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "financial-classification",
      prompt,
      tenantId,
      context: { artistName: input.relatedArtist, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseFinancialClassificationResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── CRM Follow-up ────────────────────────────────────────────────────────

  async generateCrmFollowup(input: CrmFollowupInput, tenantId = "default") {
    const validation = validateCrmFollowupInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `crm-followup: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["crm-followup"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${CRM_FOLLOWUP_SYSTEM_PROMPT}\n\n---\n\n${buildCrmFollowupPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "crm-followup",
      prompt,
      tenantId,
      context: { language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseCrmFollowupResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Audiovisual Briefing ─────────────────────────────────────────────────

  async generateAudiovisualBriefing(input: AudiovisualBriefingInput, tenantId = "default") {
    const validation = validateAudiovisualBriefingInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `audiovisual-briefing: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["audiovisual-briefing"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${AUDIOVISUAL_BRIEFING_SYSTEM_PROMPT}\n\n---\n\n${buildAudiovisualBriefingPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "audiovisual-briefing",
      prompt,
      tenantId,
      context: { artistName: input.artistName, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseAudiovisualBriefingResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Marketing Calendar Builder ───────────────────────────────────────────

  async buildMarketingCalendar(input: MarketingCalendarBuilderInput, tenantId = "default") {
    const validation = validateMarketingCalendarBuilderInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `marketing-calendar-builder: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["marketing-calendar-builder"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${MARKETING_CALENDAR_BUILDER_SYSTEM_PROMPT}\n\n---\n\n${buildMarketingCalendarBuilderPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "marketing-calendar-builder",
      prompt,
      tenantId,
      context: { artistName: input.artistName, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseMarketingCalendarBuilderResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Artist Profile Analysis ──────────────────────────────────────────────

  async analyzeArtistProfile(input: ArtistProfileAnalysisInput, tenantId = "default") {
    const validation = validateArtistProfileAnalysisInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `artist-profile-analysis: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["artist-profile-analysis"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${ARTIST_PROFILE_ANALYSIS_SYSTEM_PROMPT}\n\n---\n\n${buildArtistProfileAnalysisPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "artist-profile-analysis",
      prompt,
      tenantId,
      context: { artistName: input.artistName, genre: input.genre, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseArtistProfileAnalysisResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Licensing Opportunity Analysis ───────────────────────────────────────

  async analyzeLicensingOpportunity(input: LicensingOpportunityAnalysisInput, tenantId = "default") {
    const validation = validateLicensingOpportunityAnalysisInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `licensing-opportunity-analysis: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["licensing-opportunity-analysis"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${LICENSING_OPPORTUNITY_ANALYSIS_SYSTEM_PROMPT}\n\n---\n\n${buildLicensingOpportunityAnalysisPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "licensing-opportunity-analysis",
      prompt,
      tenantId,
      context: { artistName: input.artistName, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseLicensingOpportunityAnalysisResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Rights Monitoring Analysis ───────────────────────────────────────────

  async analyzeRightsMonitoring(input: RightsMonitoringAnalysisInput, tenantId = "default") {
    const validation = validateRightsMonitoringAnalysisInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `rights-monitoring-analysis: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["rights-monitoring-analysis"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${RIGHTS_MONITORING_ANALYSIS_SYSTEM_PROMPT}\n\n---\n\n${buildRightsMonitoringAnalysisPrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "rights-monitoring-analysis",
      prompt,
      tenantId,
      context: { artistName: input.artistName, platform: input.platform, language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseRightsMonitoringAnalysisResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
  }

  // ── Support Triage ───────────────────────────────────────────────────────

  async triageSupportTicket(input: SupportTriageInput, tenantId = "default") {
    const validation = validateSupportTriageInput(input);
    if (!validation.valid) {
      throw new AIError(
        "INVALID_REQUEST",
        `support-triage: input inválido — ${validation.errors.join("; ")}`,
      );
    }

    const meta     = SKILL_REGISTRY["support-triage"];
    const language = input.language ?? "pt-BR";
    const enriched = { ...input, language };
    const prompt   = `${SUPPORT_TRIAGE_SYSTEM_PROMPT}\n\n---\n\n${buildSupportTriagePrompt(enriched)}`;

    const response = await this.orchestrator.execute({
      skill:       "support-triage",
      prompt,
      tenantId,
      context: { language },
      maxTokens:   meta.maxTokens,
      temperature: meta.temperature,
    });

    return {
      parsed:   parseSupportTriageResponse(response.content, enriched),
      provider: response.provider,
      model:    response.model,
    };
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
      "project-planning":   PROJECT_PLANNING_SYSTEM_PROMPT,
      "release-checklist":  RELEASE_CHECKLIST_SYSTEM_PROMPT,
      "contract-analysis":  CONTRACT_ANALYSIS_SYSTEM_PROMPT,
      "catalog-metadata-validator": CATALOG_METADATA_VALIDATOR_SYSTEM_PROMPT,
      "financial-classification":   FINANCIAL_CLASSIFICATION_SYSTEM_PROMPT,
      "crm-followup":               CRM_FOLLOWUP_SYSTEM_PROMPT,
      "audiovisual-briefing":       AUDIOVISUAL_BRIEFING_SYSTEM_PROMPT,
      "marketing-calendar-builder": MARKETING_CALENDAR_BUILDER_SYSTEM_PROMPT,
      "artist-profile-analysis":    ARTIST_PROFILE_ANALYSIS_SYSTEM_PROMPT,
      "licensing-opportunity-analysis": LICENSING_OPPORTUNITY_ANALYSIS_SYSTEM_PROMPT,
      "rights-monitoring-analysis": RIGHTS_MONITORING_ANALYSIS_SYSTEM_PROMPT,
      "support-triage":             SUPPORT_TRIAGE_SYSTEM_PROMPT,
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

