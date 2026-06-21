/**
 * skills/contract-analysis/contracts/contract-analysis.contracts.ts
 *
 * Contratos da skill contract-analysis (version 1.0.0).
 * Análise operacional de contratos do mercado musical — gravadora, editora,
 * produtora, artista, distribuição, licenciamento, produção e prestação de serviço.
 */

import type { SkillLanguage, SkillSeverity } from "../../../domain/ai.types";

// Aliases dos tipos compartilhados — mantêm os nomes locais já exportados.
export type ContractAnalysisLanguage = SkillLanguage;

export type ContractType =
  | "artist"
  | "label"
  | "publishing"
  | "licensing"
  | "distribution"
  | "producer"
  | "service"
  | "partnership"
  | "other";

export type RiskSeverity = SkillSeverity;

export type ClauseImportance = SkillSeverity;

// ─── Input ────────────────────────────────────────────────────────────────────

export interface ContractAnalysisInput {
  contractText: string;
  contractType: ContractType;
  parties?: string[];
  context?: string;
  language?: ContractAnalysisLanguage;
}

// ─── Output blocks ────────────────────────────────────────────────────────────

export interface ContractParty {
  name: string;
  role: string;
  obligations?: string[];
}

export interface ContractTerm {
  duration?: string;
  startDate?: string;
  endDate?: string;
  renewal?: string;
  termination?: string;
}

export interface ContractRight {
  right: string;
  holder?: string;
  scope?: string;
  territory?: string;
  exclusivity?: boolean;
}

export interface ContractObligation {
  party: string;
  obligation: string;
  deadline?: string;
  consequence?: string;
}

export interface RevenueTerm {
  type: string;
  percentage?: number;
  amount?: string;
  recipient?: string;
  notes?: string;
}

export interface ExclusivityTerm {
  hasExclusivity: boolean;
  scope?: string;
  duration?: string;
  territory?: string;
  notes?: string;
}

export interface ContractRisk {
  risk: string;
  severity: RiskSeverity;
  clause?: string;
  recommendation: string;
}

export interface MissingClause {
  clause: string;
  importance: ClauseImportance;
  reason: string;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface ContractAnalysisOutput {
  summary: string;
  parties: ContractParty[];
  term: ContractTerm;
  rights: ContractRight[];
  obligations: ContractObligation[];
  revenueTerms: RevenueTerm[];
  exclusivity: ExclusivityTerm;
  risks: ContractRisk[];
  missingClauses: MissingClause[];
  recommendations: string[];
  executiveSummary: string;
  disclaimer: string;
}
