/**
 * Campaigns domain — financial allocation (rateio).
 *
 * Every cost must have a contable owner: no value is left without a financial
 * link. One target → 100%. N targets → split by percentage, fixed amount, or
 * proportionally by spend / result / revenue. Allocations always sum to exactly
 * 100% (basis points), and budgets are split with no rounding drift.
 */

import {
  fromMinor,
  genId,
  largestRemainderSplit,
  zeroMoney,
  type CurrencyCode,
  type Money,
} from "./money";
import type {
  CampaignAllocation,
  CampaignTargetType,
  ValidationIssue,
} from "./campaign-domain.types";

export type AllocationMode =
  | "single"
  | "percentage"
  | "fixed"
  | "by_spend"
  | "by_result"
  | "by_revenue";

export interface AllocationTargetInput {
  targetType: CampaignTargetType;
  targetId: string;
  targetName: string;
  /** Used by "percentage" mode (0..100). */
  percentage?: number;
  /** Used by "fixed" mode — amount in MAJOR units. */
  fixedAmount?: number;
  /** Used by proportional modes (spend/result/revenue value). */
  signal?: number;
}

function weightFor(target: AllocationTargetInput, mode: AllocationMode): number {
  switch (mode) {
    case "percentage":
      return Math.max(target.percentage ?? 0, 0);
    case "fixed":
      return Math.max(target.fixedAmount ?? 0, 0);
    case "by_spend":
    case "by_result":
    case "by_revenue":
      return Math.max(target.signal ?? 0, 0);
    case "single":
    default:
      return 1;
  }
}

/**
 * Build allocations that sum to exactly 100% (10000 basis points) and whose
 * budgets sum back to the campaign total. Falls back to an even split when the
 * chosen mode yields no usable weights.
 */
export function buildAllocations(
  campaignId: string,
  total: Money,
  targets: AllocationTargetInput[],
  mode: AllocationMode = "single",
): CampaignAllocation[] {
  if (targets.length === 0) return [];

  const currency: CurrencyCode = total.currency;
  const now = new Date().toISOString();
  const effectiveMode: AllocationMode = targets.length === 1 ? "single" : mode;

  const weights = targets.map((t) => weightFor(t, effectiveMode));
  const budgetMinors = largestRemainderSplit(total.amountMinor, weights);
  const basisPoints = largestRemainderSplit(10_000, weights);

  return targets.map((target, index) => ({
    id: genId("alloc"),
    campaignId,
    targetType: target.targetType,
    targetId: target.targetId,
    targetNameSnapshot: target.targetName,
    allocationPercentage: basisPoints[index] / 100,
    allocatedBudget: fromMinor(budgetMinors[index], currency),
    allocatedSpend: zeroMoney(currency),
    allocatedRevenue: zeroMoney(currency),
    allocatedResultValue: zeroMoney(currency),
    currency,
    metadata: { mode: effectiveMode },
    createdAt: now,
    updatedAt: now,
  }));
}

/** Validate that allocations exist and their percentages sum to ~100%. */
export function validateAllocations(allocations: CampaignAllocation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (allocations.length === 0) {
    issues.push({ code: "allocation_missing", severity: "error", message: "Campanha sem alocação financeira." });
    return issues;
  }
  const sum = allocations.reduce((acc, a) => acc + a.allocationPercentage, 0);
  // Allow a tiny tolerance for display rounding (basis-point split is exact).
  if (Math.abs(sum - 100) > 0.01) {
    issues.push({
      code: "allocation_sum_invalid",
      severity: "error",
      message: `A soma das alocações deve ser 100% (atual: ${sum.toFixed(2)}%).`,
    });
  }
  return issues;
}

