/**
 * Campaigns domain — metrics.
 *
 * Raw counters are stored as-is; derived ratios (cpc/cpm/cpa/cpl/roas/roi/
 * costPerStream) are computed with explicit division-by-zero guards and return
 * `null` (never NaN/Infinity) when the denominator is zero.
 */

import { toMajor, type Money } from "./money";

export interface CampaignMetricsBase {
  impressions: number;
  reach: number;
  clicks: number;
  engagements: number;
  videoViews: number;
  streams: number;
  listeners: number;
  followers: number;
  leads: number;
  sales: number;
  conversions: number;
}

export interface CampaignDerivedMetrics {
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  cpl: number | null;
  roas: number | null;
  roi: number | null;
  costPerStream: number | null;
}

export interface CampaignMetrics extends CampaignMetricsBase, CampaignDerivedMetrics {}

export function emptyMetricsBase(): CampaignMetricsBase {
  return {
    impressions: 0,
    reach: 0,
    clicks: 0,
    engagements: 0,
    videoViews: 0,
    streams: 0,
    listeners: 0,
    followers: 0,
    leads: 0,
    sales: 0,
    conversions: 0,
  };
}

/** Safe division — returns null when the denominator is zero or invalid. */
function safeDiv(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

export function computeDerivedMetrics(
  base: CampaignMetricsBase,
  spend: Money,
  revenue: Money,
): CampaignDerivedMetrics {
  const spendMajor = toMajor(spend);
  const revenueMajor = toMajor(revenue);
  return {
    cpc: safeDiv(spendMajor, base.clicks),
    cpm: base.impressions > 0 ? (spendMajor / base.impressions) * 1000 : null,
    cpa: safeDiv(spendMajor, base.conversions),
    cpl: safeDiv(spendMajor, base.leads),
    roas: safeDiv(revenueMajor, spendMajor),
    roi: spendMajor > 0 ? (revenueMajor - spendMajor) / spendMajor : null,
    costPerStream: safeDiv(spendMajor, base.streams),
  };
}

export function buildMetrics(
  base: CampaignMetricsBase,
  spend: Money,
  revenue: Money,
): CampaignMetrics {
  return { ...base, ...computeDerivedMetrics(base, spend, revenue) };
}

