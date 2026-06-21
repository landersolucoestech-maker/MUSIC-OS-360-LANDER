/**
 * Campaigns domain — financial & P&L types.
 *
 * Money is kept decimal-safe internally (minor units), but the report/P&L
 * surface exposes MAJOR-unit numbers + a currency, which is what the P&L / DRE /
 * BI layers consume. Ratio fields are `number | null` (never NaN).
 */

import type { CurrencyCode } from "./money";
import type { CampaignMetricsBase } from "./metrics";
import type {
  CampaignStatus,
  CampaignTargetType,
  PaidMediaPlatform,
} from "./campaign-domain.types";

/** Actuals injected per platform from external data or manual entry. */
export interface PlatformActuals {
  /** Spend in MAJOR units. */
  spend: number;
  /** Revenue attributed in MAJOR units. */
  revenue: number;
  /** Monetary value of results in MAJOR units (optional). */
  resultValue?: number;
  /** Raw counters produced on the platform. */
  metrics?: Partial<CampaignMetricsBase>;
}

export type CampaignActuals = Partial<Record<PaidMediaPlatform, PlatformActuals>>;

export interface PlatformFinancialLine {
  platform: PaidMediaPlatform;
  budget: number;
  spend: number;
  revenue: number;
  resultValue: number;
  roi: number | null;
  roas: number | null;
  cpa: number | null;
  cpl: number | null;
  costPerStream: number | null;
  costPerConversion: number | null;
}

export interface CampaignFinancialSummary {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  currency: CurrencyCode;
  budget: number;
  spend: number;
  revenue: number;
  /** result = revenue - spend. */
  result: number;
  roi: number | null;
  roas: number | null;
  cpa: number | null;
  cpl: number | null;
  costPerStream: number | null;
  costPerConversion: number | null;
  platforms: PlatformFinancialLine[];
}

/** One row feeding P&L / DRE / BI — fully attributed (platform × target). */
export interface CampaignPnLRow {
  campaignId: string;
  campaignName: string;
  platform: PaidMediaPlatform;
  targetType: CampaignTargetType;
  targetId: string;
  budget: number;
  spend: number;
  allocatedSpend: number;
  revenueAttributed: number;
  resultValue: number;
  roi: number | null;
  roas: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  costPerStream: number | null;
  period: { startsAt: string; endsAt: string };
  currency: CurrencyCode;
}

export interface MarketingReportCampaignLine {
  id: string;
  name: string;
  status: CampaignStatus;
  spend: number;
  revenue: number;
  roi: number | null;
}

export interface MarketingReportPlatformLine {
  platform: PaidMediaPlatform;
  spend: number;
  revenue: number;
}

/** Answers: how much invested/spent, what return, which campaigns & platforms. */
export interface MarketingReport {
  scope: { type: CampaignTargetType | "COMPANY"; id: string; name: string };
  currency: CurrencyCode;
  budget: number;
  spend: number;
  revenue: number;
  result: number;
  roi: number | null;
  roas: number | null;
  campaigns: MarketingReportCampaignLine[];
  platforms: MarketingReportPlatformLine[];
}

