/**
 * skills/rights-monitoring-analysis/contracts/rights-monitoring-analysis.contracts.ts
 *
 * Contratos da skill rights-monitoring-analysis (version 1.0.0).
 * Análise operacional de monitoramento de direitos (uso indevido / copyright / takedown).
 * Usa os tipos compartilhados de domain/ai.types (SkillLanguage/SkillSeverity/SkillPriority).
 */

import type { SkillLanguage, SkillSeverity, SkillPriority } from "../../../domain/ai.types";

export type InfringementRisk = "low" | "medium" | "high" | "critical";

export type RightsMonitoringAction =
  | "ignore"
  | "monitor"
  | "request-info"
  | "manual-review"
  | "prepare-claim"
  | "takedown";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface RightsMonitoringAnalysisInput {
  detectedUse: string;
  workTitle: string;
  artistName: string;
  platform: string;
  evidence?: string[];
  context?: string;
  language?: SkillLanguage;
}

// ─── Blocos de saída ──────────────────────────────────────────────────────────

export interface RightsMonitoringRisk {
  risk: string;
  severity: SkillSeverity;
  recommendation: string;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface RightsMonitoringAnalysisOutput {
  matchConfidence: number;
  infringementRisk: InfringementRisk;
  evidenceSummary: string;
  recommendedAction: RightsMonitoringAction;
  takedownPriority: SkillPriority;
  requiredDocuments: string[];
  notes: string[];
  risks: RightsMonitoringRisk[];
  disclaimer: string;
}
