/**
 * skills/licensing-opportunity-analysis/contracts/licensing-opportunity-analysis.contracts.ts
 *
 * Contratos da skill licensing-opportunity-analysis (version 1.0.0).
 * Análise operacional de oportunidade de licenciamento musical.
 * Usa os tipos compartilhados de domain/ai.types (SkillLanguage/SkillSeverity).
 */

import type { SkillLanguage, SkillSeverity } from "../../../domain/ai.types";

export type LicensingUsageType =
  | "sync"
  | "advertising"
  | "film"
  | "series"
  | "game"
  | "social-media"
  | "corporate"
  | "public-performance"
  | "sample"
  | "cover"
  | "other";

export type LicensingViability = "low" | "medium" | "high";

export type RightsCheckStatus = "required" | "recommended" | "optional";

export type LicensingDecision =
  | "approve"
  | "approve-with-conditions"
  | "reject"
  | "needs-review";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface LicensingOpportunityAnalysisInput {
  workTitle: string;
  artistName: string;
  usageType: LicensingUsageType;
  territory?: string;
  duration?: string;
  budget?: number;
  context?: string;
  language?: SkillLanguage;
}

// ─── Blocos de saída ──────────────────────────────────────────────────────────

export interface SuggestedPriceRange {
  min?: number;
  max?: number;
  currency?: string;
  rationale: string;
}

export interface RightsCheck {
  check: string;
  status: RightsCheckStatus;
  reason: string;
}

export interface LicensingRisk {
  risk: string;
  severity: SkillSeverity;
  recommendation: string;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface LicensingOpportunityAnalysisOutput {
  viability: LicensingViability;
  suggestedPriceRange: SuggestedPriceRange;
  requiredDocuments: string[];
  rightsChecks: RightsCheck[];
  risks: LicensingRisk[];
  negotiationNotes: string[];
  recommendedDecision: LicensingDecision;
  confidence: number;
  disclaimer: string;
}
