/**
 * skills/contract-analysis/parsers/contract-analysis.parser.ts
 *
 * Converte a resposta crua do provider em ContractAnalysisOutput estruturado.
 * Estratégia:
 *  1. tentar extrair e parsear JSON da resposta (com/sem cercas markdown, com texto à volta);
 *  2. coagir cada campo para o shape esperado, descartando valores inválidos;
 *  3. garantir SEMPRE o disclaimer no output;
 *  4. se nada for aproveitável, devolver fallback estruturado seguro, com o
 *     contractText resumido no summary.
 * NUNCA lança — qualquer resposta malformada resulta num output válido.
 */

import type {
  ContractAnalysisInput,
  ContractAnalysisOutput,
  ContractParty,
  ContractTerm,
  ContractRight,
  ContractObligation,
  RevenueTerm,
  ExclusivityTerm,
  ContractRisk,
  MissingClause,
  RiskSeverity,
  ClauseImportance,
} from "../contracts/contract-analysis.contracts";
import { CONTRACT_ANALYSIS_DISCLAIMER } from "../prompts/contract-analysis.prompt";

const SEVERITIES: RiskSeverity[] = ["low", "medium", "high", "critical"];
const IMPORTANCES: ClauseImportance[] = ["low", "medium", "high", "critical"];

// ─── Helpers de coerção ───────────────────────────────────────────────────────

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter((v) => v.length > 0);
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "sim", "yes", "1"].includes(v)) return true;
    if (["false", "não", "nao", "no", "0"].includes(v)) return false;
  }
  return fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/%/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asSeverity(value: unknown): RiskSeverity {
  const v = asString(value).toLowerCase();
  return (SEVERITIES as string[]).includes(v) ? (v as RiskSeverity) : "medium";
}

function asImportance(value: unknown): ClauseImportance {
  const v = asString(value).toLowerCase();
  return (IMPORTANCES as string[]).includes(v) ? (v as ClauseImportance) : "medium";
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Atribui uma string opcional só quando não vazia (preserva campos `?`). */
function setIfPresent<T extends object>(target: T, key: keyof T, value: string): void {
  if (value) (target as unknown as Record<string, unknown>)[key as string] = value;
}

// ─── Extração de JSON da resposta ─────────────────────────────────────────────

function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;

  const direct = tryParse(candidate);
  if (direct) return direct;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return tryParse(candidate.slice(start, end + 1));
  }

  return null;
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text.trim());
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignora — resposta não era JSON válido
  }
  return null;
}

// ─── Mapeadores de blocos ─────────────────────────────────────────────────────

function mapParties(value: unknown): ContractParty[] {
  return asRecordArray(value).map((p) => {
    const party: ContractParty = {
      name: asString(p.name),
      role: asString(p.role),
    };
    const obligations = asStringArray(p.obligations);
    if (obligations.length > 0) party.obligations = obligations;
    return party;
  });
}

function mapTerm(value: unknown): ContractTerm {
  const t = asRecord(value);
  const term: ContractTerm = {};
  if (!t) return term;
  setIfPresent(term, "duration", asString(t.duration));
  setIfPresent(term, "startDate", asString(t.startDate));
  setIfPresent(term, "endDate", asString(t.endDate));
  setIfPresent(term, "renewal", asString(t.renewal));
  setIfPresent(term, "termination", asString(t.termination));
  return term;
}

function mapRights(value: unknown): ContractRight[] {
  return asRecordArray(value).map((r) => {
    const right: ContractRight = { right: asString(r.right) };
    setIfPresent(right, "holder", asString(r.holder));
    setIfPresent(right, "scope", asString(r.scope));
    setIfPresent(right, "territory", asString(r.territory));
    if (r.exclusivity !== undefined) right.exclusivity = asBoolean(r.exclusivity);
    return right;
  });
}

function mapObligations(value: unknown): ContractObligation[] {
  return asRecordArray(value).map((o) => {
    const obligation: ContractObligation = {
      party: asString(o.party),
      obligation: asString(o.obligation),
    };
    setIfPresent(obligation, "deadline", asString(o.deadline));
    setIfPresent(obligation, "consequence", asString(o.consequence));
    return obligation;
  });
}

function mapRevenueTerms(value: unknown): RevenueTerm[] {
  return asRecordArray(value).map((r) => {
    const term: RevenueTerm = { type: asString(r.type) };
    const percentage = asOptionalNumber(r.percentage);
    if (percentage !== undefined) term.percentage = percentage;
    setIfPresent(term, "amount", asString(r.amount));
    setIfPresent(term, "recipient", asString(r.recipient));
    setIfPresent(term, "notes", asString(r.notes));
    return term;
  });
}

function mapExclusivity(value: unknown): ExclusivityTerm {
  const e = asRecord(value);
  const exclusivity: ExclusivityTerm = { hasExclusivity: false };
  if (!e) return exclusivity;
  exclusivity.hasExclusivity = asBoolean(e.hasExclusivity);
  setIfPresent(exclusivity, "scope", asString(e.scope));
  setIfPresent(exclusivity, "duration", asString(e.duration));
  setIfPresent(exclusivity, "territory", asString(e.territory));
  setIfPresent(exclusivity, "notes", asString(e.notes));
  return exclusivity;
}

function mapRisks(value: unknown): ContractRisk[] {
  return asRecordArray(value).map((r) => {
    const risk: ContractRisk = {
      risk: asString(r.risk),
      severity: asSeverity(r.severity),
      recommendation: asString(r.recommendation),
    };
    setIfPresent(risk, "clause", asString(r.clause));
    return risk;
  });
}

function mapMissingClauses(value: unknown): MissingClause[] {
  return asRecordArray(value).map((m) => ({
    clause: asString(m.clause),
    importance: asImportance(m.importance),
    reason: asString(m.reason),
  }));
}

// ─── Fallback estruturado seguro ──────────────────────────────────────────────

function summarizeContract(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 500) return clean;
  return `${clean.slice(0, 500)}…`;
}

function buildFallback(raw: string, input: ContractAnalysisInput): ContractAnalysisOutput {
  const summary = `Resumo do contrato (${input.contractType}): ${summarizeContract(input.contractText)}`;

  return {
    summary,
    parties: (input.parties ?? []).map((name) => ({ name, role: "Parte" })),
    term: {},
    rights: [],
    obligations: [],
    revenueTerms: [],
    exclusivity: { hasExclusivity: false },
    risks: [],
    missingClauses: [],
    recommendations: raw.trim()
      ? ["Não foi possível interpretar a resposta do modelo como JSON; revise o contrato manualmente."]
      : [],
    executiveSummary: summary,
    disclaimer: CONTRACT_ANALYSIS_DISCLAIMER,
  };
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseContractAnalysisResponse(
  raw: string,
  input: ContractAnalysisInput,
): ContractAnalysisOutput {
  const json = extractJson(raw);

  if (!json) {
    return buildFallback(raw, input);
  }

  const fallback = buildFallback(raw, input);

  return {
    summary:          asString(json.summary) || fallback.summary,
    parties:          json.parties !== undefined ? mapParties(json.parties) : fallback.parties,
    term:             mapTerm(json.term),
    rights:           mapRights(json.rights),
    obligations:      mapObligations(json.obligations),
    revenueTerms:     mapRevenueTerms(json.revenueTerms),
    exclusivity:      mapExclusivity(json.exclusivity),
    risks:            mapRisks(json.risks),
    missingClauses:   mapMissingClauses(json.missingClauses),
    recommendations:  asStringArray(json.recommendations),
    executiveSummary: asString(json.executiveSummary) || fallback.executiveSummary,
    disclaimer:       asString(json.disclaimer) || CONTRACT_ANALYSIS_DISCLAIMER,
  };
}
