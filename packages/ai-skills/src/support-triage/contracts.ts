/**
 * packages/ai-skills/src/support-triage/contracts.ts
 *
 * Contratos da skill support-triage (version 1.0.0).
 * Triagem de tickets de suporte para SaaS de gravadora, editora e produtora.
 * Fonte canônica compartilhada (web + api).
 */

import type { SkillLanguage, SkillSeverity, SkillPriority } from "../shared/primitives";

export type SupportTriageLanguage = SkillLanguage;

export type SupportModule =
  | "artists"
  | "releases"
  | "contracts"
  | "financial"
  | "catalog"
  | "marketing"
  | "audiovisual"
  | "agenda"
  | "integrations"
  | "ai"
  | "settings"
  | "support"
  | "other";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface SupportTriageInput {
  subject: string;
  message: string;
  userRole?: string;
  affectedModule?: SupportModule;
  context?: string;
  language?: SupportTriageLanguage;
}

// ─── Blocos de saída ──────────────────────────────────────────────────────────

export interface SLARecommendation {
  responseTime: string;
  resolutionTime?: string;
  reason: string;
}

export interface SupportRecommendedAction {
  action: string;
  priority: SkillPriority;
  ownerArea?: string;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface SupportTriageOutput {
  category: string;
  priority: SkillPriority;
  severity: SkillSeverity;
  affectedModule: string;
  likelyCause: string;
  suggestedResponse: string;
  escalationNeeded: boolean;
  SLARecommendation: SLARecommendation;
  internalNotes: string[];
  recommendedActions: SupportRecommendedAction[];
}
