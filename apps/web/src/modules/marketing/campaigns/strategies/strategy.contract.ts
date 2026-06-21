/**
 * Campaigns domain — platform strategy contract.
 *
 * Each paid-media platform encapsulates its own objectives, placements, assets,
 * validation and external payload behind this interface. The CampaignService /
 * factory never knows platform specifics — it only talks to the registry, so
 * new platforms are added without changing the core (open/closed).
 */

import { genId, zeroMoney, type CurrencyCode, type Money } from "../domain/money";
import type {
  AssetRequirement,
  CampaignPlatformPlan,
  PaidMediaPlatform,
  ValidationIssue,
} from "../domain/campaign-domain.types";

export interface BuildPlanInput {
  campaignId: string;
  budget: Money;
  /** Desired objective; the strategy falls back to its default if invalid. */
  objective?: string;
  /** Desired placements; the strategy keeps only the ones it allows. */
  placements?: string[];
}

export interface CampaignPlatformStrategy {
  readonly platform: PaidMediaPlatform;
  getAllowedObjectives(): readonly string[];
  getAllowedPlacements(): readonly string[];
  getRequiredAssets(): readonly AssetRequirement[];
  getRecommendedAssets(): readonly AssetRequirement[];
  buildPlan(input: BuildPlanInput): CampaignPlatformPlan;
  validatePlan(plan: CampaignPlatformPlan): ValidationIssue[];
  /** Build a neutral, serialisable payload — no external API call here. */
  buildExternalPayload(plan: CampaignPlatformPlan): Record<string, unknown>;
}

export interface PlatformStrategyConfig {
  platform: PaidMediaPlatform;
  objectives: readonly string[];
  placements: readonly string[];
  requiredAssets: readonly AssetRequirement[];
  recommendedAssets: readonly AssetRequirement[];
  defaultObjective: string;
}

/**
 * Shared strategy behaviour. Concrete platforms only provide a config — build,
 * validate and payload logic are uniform, eliminating duplication.
 */
export abstract class BasePlatformStrategy implements CampaignPlatformStrategy {
  protected constructor(private readonly config: PlatformStrategyConfig) {}

  get platform(): PaidMediaPlatform {
    return this.config.platform;
  }

  getAllowedObjectives(): readonly string[] {
    return this.config.objectives;
  }

  getAllowedPlacements(): readonly string[] {
    return this.config.placements;
  }

  getRequiredAssets(): readonly AssetRequirement[] {
    return this.config.requiredAssets;
  }

  getRecommendedAssets(): readonly AssetRequirement[] {
    return this.config.recommendedAssets;
  }

  buildPlan(input: BuildPlanInput): CampaignPlatformPlan {
    const now = new Date().toISOString();
    const objective =
      input.objective && this.config.objectives.includes(input.objective)
        ? input.objective
        : this.config.defaultObjective;

    const requested = input.placements?.filter((p) => this.config.placements.includes(p)) ?? [];
    const placements = requested.length > 0 ? requested : [...this.config.placements];
    const currency: CurrencyCode = input.budget.currency;

    const plan: CampaignPlatformPlan = {
      id: genId("plan"),
      campaignId: input.campaignId,
      platform: this.config.platform,
      platformObjective: objective,
      status: "DRAFT",
      budget: input.budget ?? zeroMoney(currency),
      spend: zeroMoney(currency),
      revenue: zeroMoney(currency),
      resultValue: zeroMoney(currency),
      currency,
      placements,
      requiredAssets: [...this.config.requiredAssets],
      recommendedAssets: [...this.config.recommendedAssets],
      validationIssues: [],
      externalCampaignId: null,
      externalAccountId: null,
      externalPayload: null,
      metricsSnapshot: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    const issues = this.validatePlan(plan);
    plan.validationIssues = issues;
    plan.status = issues.some((i) => i.severity === "error") ? "INVALID" : "READY";
    plan.externalPayload = this.buildExternalPayload(plan);
    return plan;
  }

  validatePlan(plan: CampaignPlatformPlan): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (plan.budget.amountMinor <= 0) {
      issues.push({ code: "budget_required", severity: "error", message: "Orçamento da plataforma deve ser maior que zero." });
    }
    if (!this.config.objectives.includes(plan.platformObjective)) {
      issues.push({ code: "objective_invalid", severity: "error", message: `Objetivo "${plan.platformObjective}" não é suportado por ${this.config.platform}.` });
    }
    const invalidPlacements = plan.placements.filter((p) => !this.config.placements.includes(p));
    if (invalidPlacements.length > 0) {
      issues.push({ code: "placements_invalid", severity: "error", message: `Placements inválidos: ${invalidPlacements.join(", ")}.` });
    }
    if (plan.placements.length === 0) {
      issues.push({ code: "placements_empty", severity: "warning", message: "Nenhum placement selecionado." });
    }
    return issues;
  }

  buildExternalPayload(plan: CampaignPlatformPlan): Record<string, unknown> {
    return {
      platform: plan.platform,
      objective: plan.platformObjective,
      placements: plan.placements,
      budgetMinor: plan.budget.amountMinor,
      currency: plan.budget.currency,
      requiredAssets: plan.requiredAssets.map((a) => a.id),
    };
  }
}

/** Small helper so each strategy declares assets compactly. */
export function asset(id: string, label: string, required: boolean, spec?: string): AssetRequirement {
  return { id, label, required, spec };
}

