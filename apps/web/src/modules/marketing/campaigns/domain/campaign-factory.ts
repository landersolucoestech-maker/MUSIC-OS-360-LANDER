/**
 * Campaigns domain — factory / orchestration.
 *
 * Turns the simple modal input into a full Campaign: splits the total budget
 * across the selected platforms (drift-free), builds each CampaignPlatformPlan
 * through the registry, and creates the financial allocation. No platform
 * specifics live here — only the registry knows them.
 */

import { genId, money, splitMoney, type CurrencyCode, type Money } from "./money";
import { buildAllocations, validateAllocations, type AllocationMode, type AllocationTargetInput } from "./allocation";
import { campaignPlatformRegistry } from "../strategies/registry";
import type {
  Campaign,
  CampaignPlatformPlan,
  CreateCampaignInput,
  PaidMediaPlatform,
  ValidationIssue,
} from "./campaign-domain.types";

/** Build one CampaignPlatformPlan per platform, splitting the budget evenly. */
export function buildPlatformPlans(
  campaignId: string,
  total: Money,
  platforms: PaidMediaPlatform[],
  objectives?: Partial<Record<PaidMediaPlatform, string>>,
): CampaignPlatformPlan[] {
  if (platforms.length === 0) return [];
  const budgets = splitMoney(total, platforms.map(() => 1));
  return platforms.map((platform, index) =>
    campaignPlatformRegistry.resolve(platform).buildPlan({
      campaignId,
      budget: budgets[index],
      objective: objectives?.[platform],
    }),
  );
}

export function buildCampaign(input: CreateCampaignInput): Campaign {
  const currency: CurrencyCode = input.currency ?? "BRL";
  const budgetTotal = money(input.budgetTotal, currency);
  const campaignId = genId("camp");
  const now = new Date().toISOString();

  const platformPlans = buildPlatformPlans(campaignId, budgetTotal, input.platforms, input.platformObjectives);

  const primaryTarget: AllocationTargetInput = {
    targetType: input.targetType,
    targetId: input.targetId,
    targetName: input.targetName ?? input.targetId,
  };
  const allocations = buildAllocations(campaignId, budgetTotal, [primaryTarget], "single");

  return {
    id: campaignId,
    tenantId: input.tenantId,
    companyId: input.companyId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    objective: input.objective,
    targetType: input.targetType,
    targetId: input.targetId,
    status: "DRAFT",
    budgetTotal,
    currency,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    notes: input.notes?.trim() ?? "",
    platformPlans,
    allocations,
    assets: [],
    metrics: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Re-split allocations for a campaign across multiple targets. */
export function reallocateCampaign(
  campaign: Campaign,
  targets: AllocationTargetInput[],
  mode: AllocationMode,
): Campaign {
  const allocations = buildAllocations(campaign.id, campaign.budgetTotal, targets, mode);
  return { ...campaign, allocations, updatedAt: new Date().toISOString() };
}

/** Collect every blocking/warning issue across platform plans and allocations. */
export function collectCampaignIssues(campaign: Campaign): ValidationIssue[] {
  const platformIssues = campaign.platformPlans.flatMap((plan) =>
    campaignPlatformRegistry.resolve(plan.platform).validatePlan(plan),
  );
  return [...platformIssues, ...validateAllocations(campaign.allocations)];
}

