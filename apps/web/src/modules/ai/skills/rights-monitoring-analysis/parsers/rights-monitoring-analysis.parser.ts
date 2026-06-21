/**
 * skills/rights-monitoring-analysis/parsers/rights-monitoring-analysis.parser.ts
 *
 * Converte a resposta crua do provider em RightsMonitoringAnalysisOutput estruturado.
 * Estratégia:
 *  1. tentar extrair e parsear JSON da resposta (com/sem cercas markdown, com texto à volta);
 *  2. coagir cada campo para o shape esperado, descartando valores inválidos;
 *  3. normalizar matchConfidence para 0–1 e garantir SEMPRE o disclaimer;
 *  4. se nada for aproveitável, devolver fallback estruturado seguro, sinalizado
 *     como análise heurística local, com matchConfidence baixa (≤ 0.45),
 *     recommendedAction = "manual-review" e takedownPriority = "medium".
 * NUNCA lança — qualquer resposta malformada resulta num output válido.
 */

import type {
  RightsMonitoringAnalysisInput,
  RightsMonitoringAnalysisOutput,
  InfringementRisk,
  RightsMonitoringAction,
  RightsMonitoringRisk,
} from "../contracts/rights-monitoring-analysis.contracts";
import type { SkillSeverity, SkillPriority } from "../../../domain/ai.types";
import { RIGHTS_MONITORING_DISCLAIMER } from "../prompts/rights-monitoring-analysis.prompt";

const SEVERITIES: SkillSeverity[] = ["low", "medium", "high", "critical"];
const PRIORITIES: SkillPriority[] = ["low", "medium", "high", "critical"];
const RISKS: InfringementRisk[] = ["low", "medium", "high", "critical"];
const ACTIONS: RightsMonitoringAction[] = ["ignore", "monitor", "request-info", "manual-review", "prepare-claim", "takedown"];

const FALLBACK_MAX_CONFIDENCE = 0.45;

const HEURISTIC_NOTE = "Análise heurística local: a avaliação detalhada do modelo não foi executada. Encaminhar para revisão manual antes de qualquer ação.";

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

function asSeverity(value: unknown): SkillSeverity {
  const v = asString(value).toLowerCase();
  return (SEVERITIES as string[]).includes(v) ? (v as SkillSeverity) : "medium";
}

function asPriority(value: unknown, fallback: SkillPriority): SkillPriority {
  const v = asString(value).toLowerCase();
  return (PRIORITIES as string[]).includes(v) ? (v as SkillPriority) : fallback;
}

function asInfringementRisk(value: unknown, fallback: InfringementRisk): InfringementRisk {
  const v = asString(value).toLowerCase();
  return (RISKS as string[]).includes(v) ? (v as InfringementRisk) : fallback;
}

function asAction(value: unknown, fallback: RightsMonitoringAction): RightsMonitoringAction {
  const v = asString(value).toLowerCase();
  return (ACTIONS as string[]).includes(v) ? (v as RightsMonitoringAction) : fallback;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null);
}

function normalizeConfidence(value: unknown, fallback: number): number {
  let n = typeof value === "number" ? value : Number(asString(value));
  if (!Number.isFinite(n)) return fallback;
  if (n > 1 && n <= 100) n = n / 100; // aceita percentual
  return Math.max(0, Math.min(1, n));
}

// ─── Mapeadores de blocos ─────────────────────────────────────────────────────

function mapRisks(value: unknown): RightsMonitoringRisk[] {
  return asRecordArray(value).map((r) => ({
    risk:           asString(r.risk),
    severity:       asSeverity(r.severity),
    recommendation: asString(r.recommendation),
  }));
}

// ─── Fallback estruturado seguro ──────────────────────────────────────────────

function buildFallback(input: RightsMonitoringAnalysisInput): RightsMonitoringAnalysisOutput {
  const evidenceCount = input.evidence?.length ?? 0;
  const evidenceSummary =
    evidenceCount > 0
      ? `${evidenceCount} evidência(s) informada(s) para o uso detectado em ${input.platform}. ${HEURISTIC_NOTE}`
      : `Nenhuma evidência estruturada informada para o uso detectado em ${input.platform}. ${HEURISTIC_NOTE}`;

  return {
    matchConfidence: 0.3,
    infringementRisk: "medium",
    evidenceSummary,
    recommendedAction: "manual-review",
    takedownPriority: "medium",
    requiredDocuments: [
      "Comprovação de titularidade (obra e/ou fonograma)",
      "Identificadores (ISRC/ISWC)",
      "Evidência datada do uso detectado",
    ],
    notes: [
      "Confirmar se o uso é autorizado (distribuição/parceria) antes de qualquer ação.",
      "Reunir evidências adicionais para sustentar uma eventual reivindicação.",
    ],
    risks: [
      {
        risk: "Ação baseada em correspondência não confirmada (ex.: takedown indevido).",
        severity: "medium",
        recommendation: "Validar manualmente a correspondência e a titularidade antes de agir.",
      },
    ],
    disclaimer: RIGHTS_MONITORING_DISCLAIMER,
  };
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

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseRightsMonitoringAnalysisResponse(
  raw: string,
  input: RightsMonitoringAnalysisInput,
): RightsMonitoringAnalysisOutput {
  const json = extractJson(raw);

  const fallback = buildFallback(input);

  if (!json) {
    // Fallback: garante matchConfidence baixa (≤ 0.45), ação conservadora e prioridade média.
    return { ...fallback, matchConfidence: Math.min(fallback.matchConfidence, FALLBACK_MAX_CONFIDENCE) };
  }

  return {
    matchConfidence:   normalizeConfidence(json.matchConfidence, fallback.matchConfidence),
    infringementRisk:  asInfringementRisk(json.infringementRisk, fallback.infringementRisk),
    evidenceSummary:   asString(json.evidenceSummary) || fallback.evidenceSummary,
    recommendedAction: asAction(json.recommendedAction, fallback.recommendedAction),
    takedownPriority:  asPriority(json.takedownPriority, fallback.takedownPriority),
    requiredDocuments: json.requiredDocuments !== undefined ? asStringArray(json.requiredDocuments) : fallback.requiredDocuments,
    notes:             asStringArray(json.notes),
    risks:             mapRisks(json.risks),
    disclaimer:        asString(json.disclaimer) || RIGHTS_MONITORING_DISCLAIMER,
  };
}
