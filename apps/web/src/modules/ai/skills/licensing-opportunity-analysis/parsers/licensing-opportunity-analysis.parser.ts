/**
 * skills/licensing-opportunity-analysis/parsers/licensing-opportunity-analysis.parser.ts
 *
 * Converte a resposta crua do provider em LicensingOpportunityAnalysisOutput estruturado.
 * Estratégia:
 *  1. tentar extrair e parsear JSON da resposta (com/sem cercas markdown, com texto à volta);
 *  2. coagir cada campo para o shape esperado, descartando valores inválidos;
 *  3. normalizar confidence para 0–1 e garantir SEMPRE o disclaimer;
 *  4. se nada for aproveitável, devolver fallback estruturado seguro, sinalizado
 *     como análise heurística local, com confidence baixa (≤ 0.45) e
 *     recommendedDecision = "needs-review".
 * NUNCA lança — qualquer resposta malformada resulta num output válido.
 */

import type {
  LicensingOpportunityAnalysisInput,
  LicensingOpportunityAnalysisOutput,
  LicensingViability,
  LicensingDecision,
  RightsCheckStatus,
  SuggestedPriceRange,
  RightsCheck,
  LicensingRisk,
} from "../contracts/licensing-opportunity-analysis.contracts";
import type { SkillSeverity } from "../../../domain/ai.types";
import { LICENSING_ANALYSIS_DISCLAIMER } from "../prompts/licensing-opportunity-analysis.prompt";

const SEVERITIES: SkillSeverity[] = ["low", "medium", "high", "critical"];
const VIABILITIES: LicensingViability[] = ["low", "medium", "high"];
const DECISIONS: LicensingDecision[] = ["approve", "approve-with-conditions", "reject", "needs-review"];
const CHECK_STATUSES: RightsCheckStatus[] = ["required", "recommended", "optional"];

const FALLBACK_MAX_CONFIDENCE = 0.45;

const HEURISTIC_NOTE = "Análise heurística local: a avaliação detalhada do modelo não foi executada. Revise com áreas jurídica, editorial e comercial antes de decidir.";

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

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asSeverity(value: unknown): SkillSeverity {
  const v = asString(value).toLowerCase();
  return (SEVERITIES as string[]).includes(v) ? (v as SkillSeverity) : "medium";
}

function asViability(value: unknown, fallback: LicensingViability): LicensingViability {
  const v = asString(value).toLowerCase();
  return (VIABILITIES as string[]).includes(v) ? (v as LicensingViability) : fallback;
}

function asDecision(value: unknown, fallback: LicensingDecision): LicensingDecision {
  const v = asString(value).toLowerCase();
  return (DECISIONS as string[]).includes(v) ? (v as LicensingDecision) : fallback;
}

function asCheckStatus(value: unknown): RightsCheckStatus {
  const v = asString(value).toLowerCase();
  return (CHECK_STATUSES as string[]).includes(v) ? (v as RightsCheckStatus) : "recommended";
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

function normalizeConfidence(value: unknown, fallback: number): number {
  let n = typeof value === "number" ? value : Number(asString(value));
  if (!Number.isFinite(n)) return fallback;
  if (n > 1 && n <= 100) n = n / 100; // aceita percentual
  return Math.max(0, Math.min(1, n));
}

// ─── Mapeadores de blocos ─────────────────────────────────────────────────────

function mapPriceRange(value: unknown, fallback: SuggestedPriceRange): SuggestedPriceRange {
  const m = asRecord(value);
  if (!m) return fallback;

  const range: SuggestedPriceRange = { rationale: asString(m.rationale) || fallback.rationale };
  const min = asOptionalNumber(m.min);
  if (min !== undefined) range.min = min;
  const max = asOptionalNumber(m.max);
  if (max !== undefined) range.max = max;
  const currency = asString(m.currency);
  if (currency) range.currency = currency;
  return range;
}

function mapRightsChecks(value: unknown): RightsCheck[] {
  return asRecordArray(value).map((c) => ({
    check:  asString(c.check),
    status: asCheckStatus(c.status),
    reason: asString(c.reason),
  }));
}

function mapRisks(value: unknown): LicensingRisk[] {
  return asRecordArray(value).map((r) => ({
    risk:           asString(r.risk),
    severity:       asSeverity(r.severity),
    recommendation: asString(r.recommendation),
  }));
}

// ─── Fallback estruturado seguro ──────────────────────────────────────────────

function buildFallback(input: LicensingOpportunityAnalysisInput): LicensingOpportunityAnalysisOutput {
  const needsSampleClearance = input.usageType === "sample" || input.usageType === "cover";

  const rightsChecks: RightsCheck[] = [
    { check: "Confirmar titulares e splits da obra (composição)", status: "required", reason: "Necessário para autorizar o licenciamento da obra." },
    { check: "Confirmar titularidade do fonograma (master)", status: "required", reason: "Sync e usos audiovisuais exigem autorização do master." },
    { check: "Verificar autorização de sincronização", status: "recommended", reason: "Uso audiovisual normalmente requer sync de obra e fonograma." },
    { check: "Verificar uso de imagem/nome do artista", status: "recommended", reason: "Pode ser exigido conforme o tipo de uso." },
  ];

  if (needsSampleClearance) {
    rightsChecks.push({
      check: "Clearance da obra/fonograma original (sample/cover)",
      status: "required",
      reason: "Sample/cover exige autorização da fonte original.",
    });
  }

  return {
    viability: "medium",
    suggestedPriceRange: {
      currency: "BRL",
      rationale: `Faixa de referência não estimada automaticamente. ${HEURISTIC_NOTE}`,
    },
    requiredDocuments: [
      "Contrato de licença",
      "Comprovação de titularidade (obra e fonograma)",
      "Autorizações dos titulares/splits",
    ],
    rightsChecks,
    risks: [
      {
        risk: "Avaliação automática indisponível; dados podem estar incompletos.",
        severity: "medium",
        recommendation: "Conduzir due diligence de direitos antes de aprovar.",
      },
    ],
    negotiationNotes: [
      "Definir território, prazo e exclusividade.",
      "Confirmar escopo de uso e renovações.",
    ],
    recommendedDecision: "needs-review",
    confidence: 0.3,
    disclaimer: LICENSING_ANALYSIS_DISCLAIMER,
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

export function parseLicensingOpportunityAnalysisResponse(
  raw: string,
  input: LicensingOpportunityAnalysisInput,
): LicensingOpportunityAnalysisOutput {
  const json = extractJson(raw);

  const fallback = buildFallback(input);

  if (!json) {
    // Fallback: garante confidence baixa (≤ 0.45) e decisão "needs-review".
    return { ...fallback, confidence: Math.min(fallback.confidence, FALLBACK_MAX_CONFIDENCE) };
  }

  return {
    viability:           asViability(json.viability, fallback.viability),
    suggestedPriceRange: mapPriceRange(json.suggestedPriceRange, fallback.suggestedPriceRange),
    requiredDocuments:   json.requiredDocuments !== undefined ? asStringArray(json.requiredDocuments) : fallback.requiredDocuments,
    rightsChecks:        json.rightsChecks !== undefined ? mapRightsChecks(json.rightsChecks) : fallback.rightsChecks,
    risks:               mapRisks(json.risks),
    negotiationNotes:    asStringArray(json.negotiationNotes),
    recommendedDecision: asDecision(json.recommendedDecision, fallback.recommendedDecision),
    confidence:          normalizeConfidence(json.confidence, fallback.confidence),
    disclaimer:          asString(json.disclaimer) || LICENSING_ANALYSIS_DISCLAIMER,
  };
}
