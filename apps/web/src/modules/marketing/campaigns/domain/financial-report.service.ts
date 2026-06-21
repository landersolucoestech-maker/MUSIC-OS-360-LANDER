/**
 * Campaigns domain — financial report & P&L service.
 *
 * Consolidates budget / spend / revenue / result / ROI / ROAS / CPA / CPL /
 * cost-per-stream / cost-per-conversion, attributes every cost to its target via
 * the campaign allocations (rateio), and emits P&L rows. Pure functions, no
 * external calls. All money stays decimal-safe; ratios are null-guarded.
 */

import {
  fromMinor,
  largestRemainderSplit,
  money,
  scaleMoney,
  sumMoney,
  toMajor,
  zeroMoney,
  type CurrencyCode,
  type Money,
} from "./money";
import {
  buildMetrics,
  emptyMetricsBase,
  type CampaignMetricsBase,
} from "./metrics";
import type {
  Campaign,
  CampaignTargetType,
} from "./campaign-domain.types";
import type {
  CampaignActuals,
  CampaignFinancialSummary,
  CampaignPnLRow,
  MarketingReport,
  MarketingReportPlatformLine,
  PlatformFinancialLine,
} from "./financial.types";

function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

function addBase(a: CampaignMetricsBase, b: CampaignMetricsBase): CampaignMetricsBase {
  return {
    impressions: a.impressions + b.impressions,
    reach: a.reach + b.reach,
    clicks: a.clicks + b.clicks,
    engagements: a.engagements + b.engagements,
    videoViews: a.videoViews + b.videoViews,
    streams: a.streams + b.streams,
    listeners: a.listeners + b.listeners,
    followers: a.followers + b.followers,
    leads: a.leads + b.leads,
    sales: a.sales + b.sales,
    conversions: a.conversions + b.conversions,
  };
}

function pickBase(snapshot: CampaignMetricsBase | null): CampaignMetricsBase {
  return snapshot ?? emptyMetricsBase();
}

function campaignBase(campaign: Campaign): CampaignMetricsBase {
  return campaign.platformPlans.reduce(
    (acc, plan) => addBase(acc, pickBase(plan.metricsSnapshot)),
    emptyMetricsBase(),
  );
}

// ---------------------------------------------------------------------------
// Apply actuals — distribute spend/revenue/result to platforms and targets
// ---------------------------------------------------------------------------

export function applyCampaignActuals(campaign: Campaign, actuals: CampaignActuals): Campaign {
  const currency = campaign.currency;
  const now = new Date().toISOString();

  const platformPlans = campaign.platformPlans.map((plan) => {
    const a = actuals[plan.platform];
    if (!a) return plan;
    const spend = money(a.spend, currency);
    const revenue = money(a.revenue, currency);
    const resultValue = money(a.resultValue ?? 0, currency);
    const base: CampaignMetricsBase = { ...emptyMetricsBase(), ...a.metrics };
    return {
      ...plan,
      spend,
      revenue,
      resultValue,
      metricsSnapshot: buildMetrics(base, spend, revenue),
      updatedAt: now,
    };
  });

  const totalSpend = sumMoney(platformPlans.map((p) => p.spend), currency);
  const totalRevenue = sumMoney(platformPlans.map((p) => p.revenue), currency);
  const totalResult = sumMoney(platformPlans.map((p) => p.resultValue), currency);

  const base = platformPlans.reduce(
    (acc, plan) => addBase(acc, pickBase(plan.metricsSnapshot)),
    emptyMetricsBase(),
  );
  const metrics = buildMetrics(base, totalSpend, totalRevenue);

  // Distribute each total to the allocations by their percentage (drift-free).
  const weights = campaign.allocations.map((al) => al.allocationPercentage);
  const spendSplit = largestRemainderSplit(totalSpend.amountMinor, weights);
  const revenueSplit = largestRemainderSplit(totalRevenue.amountMinor, weights);
  const resultSplit = largestRemainderSplit(totalResult.amountMinor, weights);

  const allocations = campaign.allocations.map((al, index) => ({
    ...al,
    allocatedSpend: fromMinor(spendSplit[index], currency),
    allocatedRevenue: fromMinor(revenueSplit[index], currency),
    allocatedResultValue: fromMinor(resultSplit[index], currency),
    updatedAt: now,
  }));

  return { ...campaign, platformPlans, allocations, metrics, updatedAt: now };
}

// ---------------------------------------------------------------------------
// Campaign financial summary
// ---------------------------------------------------------------------------

export function buildCampaignFinancialSummary(campaign: Campaign): CampaignFinancialSummary {
  const currency = campaign.currency;
  const spendMoney = sumMoney(campaign.platformPlans.map((p) => p.spend), currency);
  const revenueMoney = sumMoney(campaign.platformPlans.map((p) => p.revenue), currency);
  const budget = toMajor(campaign.budgetTotal);
  const spend = toMajor(spendMoney);
  const revenue = toMajor(revenueMoney);
  const base = campaignBase(campaign);

  const platforms: PlatformFinancialLine[] = campaign.platformPlans.map((plan) => {
    const planSpend = toMajor(plan.spend);
    const planRevenue = toMajor(plan.revenue);
    const snap = plan.metricsSnapshot;
    return {
      platform: plan.platform,
      budget: toMajor(plan.budget),
      spend: planSpend,
      revenue: planRevenue,
      resultValue: toMajor(plan.resultValue),
      roi: snap ? snap.roi : ratio(planRevenue - planSpend, planSpend),
      roas: snap ? snap.roas : ratio(planRevenue, planSpend),
      cpa: snap ? snap.cpa : null,
      cpl: snap ? snap.cpl : null,
      costPerStream: snap ? snap.costPerStream : null,
      costPerConversion: snap ? snap.cpa : null,
    };
  });

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    status: campaign.status,
    currency,
    budget,
    spend,
    revenue,
    result: revenue - spend,
    roi: ratio(revenue - spend, spend),
    roas: ratio(revenue, spend),
    cpa: ratio(spend, base.conversions),
    cpl: ratio(spend, base.leads),
    costPerStream: ratio(spend, base.streams),
    costPerConversion: ratio(spend, base.conversions),
    platforms,
  };
}

// ---------------------------------------------------------------------------
// P&L rows (platform × allocation), fully attributed
// ---------------------------------------------------------------------------

export function buildCampaignPnLRows(campaign: Campaign): CampaignPnLRow[] {
  const currency = campaign.currency;
  const rows: CampaignPnLRow[] = [];

  for (const plan of campaign.platformPlans) {
    const snap = plan.metricsSnapshot;
    for (const alloc of campaign.allocations) {
      const fraction = alloc.allocationPercentage / 100;
      rows.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        platform: plan.platform,
        targetType: alloc.targetType,
        targetId: alloc.targetId,
        budget: toMajor(scaleMoney(plan.budget, fraction)),
        spend: toMajor(plan.spend),
        allocatedSpend: toMajor(scaleMoney(plan.spend, fraction)),
        revenueAttributed: toMajor(scaleMoney(plan.revenue, fraction)),
        resultValue: toMajor(scaleMoney(plan.resultValue, fraction)),
        roi: snap ? snap.roi : null,
        roas: snap ? snap.roas : null,
        cpc: snap ? snap.cpc : null,
        cpm: snap ? snap.cpm : null,
        cpa: snap ? snap.cpa : null,
        costPerStream: snap ? snap.costPerStream : null,
        period: { startsAt: campaign.startsAt, endsAt: campaign.endsAt },
        currency,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Target / company marketing reports
// ---------------------------------------------------------------------------

function aggregatePlatforms(
  lines: { platform: MarketingReportPlatformLine["platform"]; spend: Money; revenue: Money }[],
  currency: CurrencyCode,
): MarketingReportPlatformLine[] {
  const byPlatform = new Map<string, { spend: Money; revenue: Money }>();
  for (const line of lines) {
    const current = byPlatform.get(line.platform) ?? { spend: zeroMoney(currency), revenue: zeroMoney(currency) };
    byPlatform.set(line.platform, {
      spend: { amountMinor: current.spend.amountMinor + line.spend.amountMinor, currency },
      revenue: { amountMinor: current.revenue.amountMinor + line.revenue.amountMinor, currency },
    });
  }
  return [...byPlatform.entries()].map(([platform, v]) => ({
    platform: platform as MarketingReportPlatformLine["platform"],
    spend: toMajor(v.spend),
    revenue: toMajor(v.revenue),
  }));
}

/**
 * Report for a single target (artist/project/track/release/...). Uses each
 * campaign's allocation for that target to attribute budget/spend/revenue, and
 * scales platform spend/revenue by the allocation fraction.
 */
export function buildTargetMarketingReport(
  campaigns: Campaign[],
  targetType: CampaignTargetType,
  targetId: string,
  scopeName?: string,
): MarketingReport {
  const currency: CurrencyCode = campaigns[0]?.currency ?? "BRL";
  let budget = zeroMoney(currency);
  let spend = zeroMoney(currency);
  let revenue = zeroMoney(currency);
  const campaignLines: MarketingReport["campaigns"] = [];
  const platformLines: { platform: MarketingReportPlatformLine["platform"]; spend: Money; revenue: Money }[] = [];
  let resolvedName = scopeName ?? targetId;

  for (const campaign of campaigns) {
    const alloc = campaign.allocations.find((a) => a.targetType === targetType && a.targetId === targetId);
    if (!alloc) continue;
    if (!scopeName) resolvedName = alloc.targetNameSnapshot || resolvedName;

    const fraction = alloc.allocationPercentage / 100;
    budget = { amountMinor: budget.amountMinor + alloc.allocatedBudget.amountMinor, currency };
    spend = { amountMinor: spend.amountMinor + alloc.allocatedSpend.amountMinor, currency };
    revenue = { amountMinor: revenue.amountMinor + alloc.allocatedRevenue.amountMinor, currency };

    const cSpend = toMajor(alloc.allocatedSpend);
    const cRevenue = toMajor(alloc.allocatedRevenue);
    campaignLines.push({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      spend: cSpend,
      revenue: cRevenue,
      roi: ratio(cRevenue - cSpend, cSpend),
    });

    for (const plan of campaign.platformPlans) {
      platformLines.push({
        platform: plan.platform,
        spend: scaleMoney(plan.spend, fraction),
        revenue: scaleMoney(plan.revenue, fraction),
      });
    }
  }

  const budgetM = toMajor(budget);
  const spendM = toMajor(spend);
  const revenueM = toMajor(revenue);
  return {
    scope: { type: targetType, id: targetId, name: resolvedName },
    currency,
    budget: budgetM,
    spend: spendM,
    revenue: revenueM,
    result: revenueM - spendM,
    roi: ratio(revenueM - spendM, spendM),
    roas: ratio(revenueM, spendM),
    campaigns: campaignLines,
    platforms: aggregatePlatforms(platformLines, currency),
  };
}

/** Company-wide consolidation (every artist/project/release/campaign). */
export function buildCompanyMarketingReport(
  campaigns: Campaign[],
  companyId: string,
  scopeName?: string,
): MarketingReport {
  const scoped = campaigns.filter((c) => c.companyId === companyId);
  const currency: CurrencyCode = scoped[0]?.currency ?? "BRL";
  let budget = zeroMoney(currency);
  let spend = zeroMoney(currency);
  let revenue = zeroMoney(currency);
  const campaignLines: MarketingReport["campaigns"] = [];
  const platformLines: { platform: MarketingReportPlatformLine["platform"]; spend: Money; revenue: Money }[] = [];

  for (const campaign of scoped) {
    const cSpendMoney = sumMoney(campaign.platformPlans.map((p) => p.spend), currency);
    const cRevenueMoney = sumMoney(campaign.platformPlans.map((p) => p.revenue), currency);
    budget = { amountMinor: budget.amountMinor + campaign.budgetTotal.amountMinor, currency };
    spend = { amountMinor: spend.amountMinor + cSpendMoney.amountMinor, currency };
    revenue = { amountMinor: revenue.amountMinor + cRevenueMoney.amountMinor, currency };

    const cSpend = toMajor(cSpendMoney);
    const cRevenue = toMajor(cRevenueMoney);
    campaignLines.push({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      spend: cSpend,
      revenue: cRevenue,
      roi: ratio(cRevenue - cSpend, cSpend),
    });
    for (const plan of campaign.platformPlans) {
      platformLines.push({ platform: plan.platform, spend: plan.spend, revenue: plan.revenue });
    }
  }

  const budgetM = toMajor(budget);
  const spendM = toMajor(spend);
  const revenueM = toMajor(revenue);
  return {
    scope: { type: "COMPANY", id: companyId, name: scopeName ?? companyId },
    currency,
    budget: budgetM,
    spend: spendM,
    revenue: revenueM,
    result: revenueM - spendM,
    roi: ratio(revenueM - spendM, spendM),
    roas: ratio(revenueM, spendM),
    campaigns: campaignLines,
    platforms: aggregatePlatforms(platformLines, currency),
  };
}

