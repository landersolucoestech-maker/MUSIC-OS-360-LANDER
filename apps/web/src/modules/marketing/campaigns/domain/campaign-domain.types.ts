/**
 * Campaigns domain — core types.
 *
 * Campaign is the strategic container. It is NOT an ad, a platform or a
 * creative. Each selected paid-media platform produces its own
 * CampaignPlatformPlan; every cost is tracked through CampaignAllocation so it
 * can feed the P&L. Content channels and paid-media platforms are kept strictly
 * separate — they are never mapped onto each other.
 */

import type { CurrencyCode, Money } from "./money";
import type { CampaignMetrics } from "./metrics";

// ---------------------------------------------------------------------------
// Enums (single, standardized set — no divergent labels in the domain)
// ---------------------------------------------------------------------------

export type CampaignStatus =
  | "DRAFT"
  | "PLANNING"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type CampaignTargetType =
  | "ARTIST"
  | "PROJECT"
  | "RELEASE"
  | "TRACK"
  | "COMPANY"
  | "EVENT"
  | "PRODUCT"
  | "SERVICE"
  | "CONTENT"
  | "CUSTOM";

/** Paid-media platforms. The first five are implemented; the rest are reserved
 *  so new platforms can be added without touching the core. */
export type PaidMediaPlatform =
  | "META_ADS"
  | "GOOGLE_ADS"
  | "YOUTUBE_ADS"
  | "TIKTOK_ADS"
  | "SPOTIFY_ADS"
  | "LINKEDIN_ADS"
  | "X_ADS"
  | "KWAI_ADS"
  | "DEEZER_ADS"
  | "APPLE_MUSIC_ADS";

export type PlatformPlanStatus =
  | "DRAFT"
  | "READY"
  | "INVALID"
  | "PENDING_PUBLICATION"
  | "PUBLISHED"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED";

// ---------------------------------------------------------------------------
// Validation + assets (shared with strategies)
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
}

export interface AssetRequirement {
  id: string;
  label: string;
  /** Free-form spec hint, e.g. "1080x1080", "9:16", "15s". */
  spec?: string;
  required: boolean;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface CampaignPlatformPlan {
  id: string;
  campaignId: string;
  platform: PaidMediaPlatform;
  platformObjective: string;
  status: PlatformPlanStatus;
  budget: Money;
  /** Actual money spent on this platform (traceable). */
  spend: Money;
  /** Revenue attributed to this platform. */
  revenue: Money;
  /** Monetary value of the results produced (e.g. streams/conversions value). */
  resultValue: Money;
  currency: CurrencyCode;
  placements: string[];
  requiredAssets: AssetRequirement[];
  recommendedAssets: AssetRequirement[];
  validationIssues: ValidationIssue[];
  externalCampaignId: string | null;
  externalAccountId: string | null;
  externalPayload: Record<string, unknown> | null;
  metricsSnapshot: CampaignMetrics | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAllocation {
  id: string;
  campaignId: string;
  targetType: CampaignTargetType;
  targetId: string;
  targetNameSnapshot: string;
  /** 0..100, all allocations of a campaign sum to exactly 100. */
  allocationPercentage: number;
  allocatedBudget: Money;
  allocatedSpend: Money;
  allocatedRevenue: Money;
  allocatedResultValue: Money;
  currency: CurrencyCode;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAsset {
  id: string;
  campaignId: string;
  platform: PaidMediaPlatform | null;
  requirementId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  description: string;
  objective: string;
  targetType: CampaignTargetType;
  targetId: string;
  status: CampaignStatus;
  budgetTotal: Money;
  currency: CurrencyCode;
  startsAt: string;
  endsAt: string;
  notes: string;
  platformPlans: CampaignPlatformPlan[];
  allocations: CampaignAllocation[];
  assets: CampaignAsset[];
  metrics: CampaignMetrics | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Inputs (the simple modal contract — no platform-specific rules here)
// ---------------------------------------------------------------------------

export interface CreateCampaignInput {
  tenantId: string;
  companyId: string;
  name: string;
  description?: string;
  objective: string;
  targetType: CampaignTargetType;
  targetId: string;
  targetName?: string;
  /** Total budget in MAJOR units (e.g. reais), converted to decimal-safe Money. */
  budgetTotal: number;
  currency?: CurrencyCode;
  startsAt: string;
  endsAt: string;
  platforms: PaidMediaPlatform[];
  notes?: string;
  /** Optional per-platform objective override (defaults applied otherwise). */
  platformObjectives?: Partial<Record<PaidMediaPlatform, string>>;
}

