/**
 * packages/ai-skills/src/catalog-metadata-validator/parser.ts
 *
 * Converte a resposta crua do provider em CatalogMetadataValidatorOutput estruturado.
 * Estratégia:
 *  1. tentar extrair e parsear JSON da resposta (com/sem cercas markdown, com texto à volta);
 *  2. coagir cada campo para o shape esperado, descartando valores inválidos;
 *  3. normalizar score para 0–100;
 *  4. se nada for aproveitável, devolver fallback estruturado seguro montado a
 *     partir do input (normalizedMetadata reconstruída + score básico calculado).
 * NUNCA lança — qualquer resposta malformada resulta num output válido.
 */

import type {
  CatalogMetadataValidatorInput,
  CatalogMetadataValidatorOutput,
  CatalogComposer,
  CatalogShare,
  CatalogFieldIssue,
  DuplicateRisk,
  RightsRisk,
  NormalizedMetadata,
  RecommendedFix,
} from "./contracts";
import type { SkillSeverity, SkillPriority } from "../shared/primitives";

const SEVERITIES: SkillSeverity[] = ["low", "medium", "high", "critical"];
const PRIORITIES: SkillPriority[] = ["low", "medium", "high", "critical"];

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

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/%/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
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

function asSeverity(value: unknown): SkillSeverity {
  const v = asString(value).toLowerCase();
  return (SEVERITIES as string[]).includes(v) ? (v as SkillSeverity) : "medium";
}

function asPriority(value: unknown): SkillPriority {
  const v = asString(value).toLowerCase();
  return (PRIORITIES as string[]).includes(v) ? (v as SkillPriority) : "medium";
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

function normalizeScore(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(asString(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ─── Mapeadores de blocos ─────────────────────────────────────────────────────

function mapComposers(value: unknown): CatalogComposer[] {
  return asRecordArray(value).map((c) => {
    const composer: CatalogComposer = { name: asString(c.name) };
    const share = asOptionalNumber(c.share);
    if (share !== undefined) composer.share = share;
    const publisher = asString(c.publisher);
    if (publisher) composer.publisher = publisher;
    return composer;
  });
}

function mapShares(value: unknown): CatalogShare[] {
  return asRecordArray(value).map((s) => ({
    name:       asString(s.name),
    role:       asString(s.role),
    percentage: asNumber(s.percentage),
  }));
}

function mapFieldIssues(value: unknown): CatalogFieldIssue[] {
  return asRecordArray(value).map((i) => ({
    field:    asString(i.field),
    message:  asString(i.message),
    severity: asSeverity(i.severity),
  }));
}

function mapDuplicateRisks(value: unknown): DuplicateRisk[] {
  return asRecordArray(value).map((d) => ({
    reason:        asString(d.reason),
    confidence:    Math.max(0, Math.min(1, asNumber(d.confidence))),
    matchedFields: asStringArray(d.matchedFields),
  }));
}

function mapRightsRisks(value: unknown): RightsRisk[] {
  return asRecordArray(value).map((r) => ({
    risk:           asString(r.risk),
    severity:       asSeverity(r.severity),
    recommendation: asString(r.recommendation),
  }));
}

function mapRecommendedFixes(value: unknown): RecommendedFix[] {
  return asRecordArray(value).map((f) => {
    const fix: RecommendedFix = {
      action:   asString(f.action),
      priority: asPriority(f.priority),
    };
    const field = asString(f.field);
    if (field) fix.field = field;
    return fix;
  });
}

function mapNormalizedMetadata(
  value: unknown,
  fallback: NormalizedMetadata,
): NormalizedMetadata {
  const m = asRecord(value);
  if (!m) return fallback;

  const type = asString(m.type) === "work" ? "work" : asString(m.type) === "recording" ? "recording" : fallback.type;

  const normalized: NormalizedMetadata = {
    title:      asString(m.title) || fallback.title,
    type,
    composers:  m.composers !== undefined ? mapComposers(m.composers) : fallback.composers,
    performers: m.performers !== undefined ? asStringArray(m.performers) : fallback.performers,
    producers:  m.producers !== undefined ? asStringArray(m.producers) : fallback.producers,
    shares:     m.shares !== undefined ? mapShares(m.shares) : fallback.shares,
  };

  const isrc = asString(m.isrc);
  if (isrc) normalized.isrc = isrc;
  const upc = asString(m.upc);
  if (upc) normalized.upc = upc;
  const publisher = asString(m.publisher);
  if (publisher) normalized.publisher = publisher;
  const label = asString(m.label);
  if (label) normalized.label = label;

  return normalized;
}

// ─── normalizedMetadata + score básico a partir do input ──────────────────────

function buildNormalizedFromInput(input: CatalogMetadataValidatorInput): NormalizedMetadata {
  const normalized: NormalizedMetadata = {
    title:      input.title,
    type:       input.type,
    composers:  input.composers ?? [],
    performers: input.performers ?? [],
    producers:  input.producers ?? [],
    shares:     input.shares ?? [],
  };
  if (input.isrc)      normalized.isrc = input.isrc;
  if (input.upc)       normalized.upc = input.upc;
  if (input.publisher) normalized.publisher = input.publisher;
  if (input.label)     normalized.label = input.label;
  return normalized;
}

function sharesSum(shares: CatalogShare[]): number {
  return shares.reduce((acc, s) => acc + (typeof s.percentage === "number" ? s.percentage : 0), 0);
}

// ─── Fallback estruturado seguro ──────────────────────────────────────────────

function buildFallback(
  input: CatalogMetadataValidatorInput,
): CatalogMetadataValidatorOutput {
  const normalizedMetadata = buildNormalizedFromInput(input);

  const errors: CatalogFieldIssue[] = [];
  const warnings: CatalogFieldIssue[] = [];
  const missingFields: string[] = [];
  let score = 100;

  // Campos obrigatórios ausentes
  if (!input.title?.trim()) {
    errors.push({ field: "title", message: "Título é obrigatório.", severity: "critical" });
    missingFields.push("title");
    score -= 40;
  }

  if (input.type === "work" && (!input.composers || input.composers.length === 0)) {
    errors.push({ field: "composers", message: "Obra precisa de pelo menos um compositor.", severity: "high" });
    missingFields.push("composers");
    score -= 30;
  }

  if (input.type === "recording") {
    if (!input.performers || input.performers.length === 0) {
      errors.push({ field: "performers", message: "Fonograma precisa de pelo menos um intérprete.", severity: "high" });
      missingFields.push("performers");
      score -= 30;
    }
    if (!input.isrc?.trim()) {
      warnings.push({ field: "isrc", message: "ISRC ausente no fonograma; necessário para distribuição.", severity: "medium" });
      missingFields.push("isrc");
      score -= 15;
    }
  }

  // Soma de shares ≠ 100
  if (input.shares && input.shares.length > 0) {
    const sum = sharesSum(input.shares);
    if (Math.abs(sum - 100) > 0.01) {
      warnings.push({
        field: "shares",
        message: `Soma dos shares é ${sum}%, deveria ser 100%.`,
        severity: "high",
      });
      score -= 15;
    }
  }

  // O fallback valida apenas presença básica — não validade jurídica/técnica
  // completa. Por isso o score é limitado a no máximo 85 (nunca 100).
  score = Math.max(0, Math.min(85, score));

  const recommendedFixes: RecommendedFix[] = [
    ...errors.map((e) => ({ action: `Corrigir: ${e.message}`, priority: "high" as SkillPriority, field: e.field })),
    ...warnings.map((w) => ({ action: `Revisar: ${w.message}`, priority: "medium" as SkillPriority, field: w.field })),
  ];

  // Marcador explícito de proveniência heurística — sempre presente no fallback.
  warnings.push({
    field: "fallback",
    severity: "medium",
    message:
      "Validação heurística local: a análise detalhada do modelo não foi executada. Revise manualmente antes de aprovar o catálogo.",
  });

  return {
    // isValid só é true sem erros E com score mínimo; o warning de fallback
    // permanece para impedir leitura como aprovação real do catálogo.
    isValid: errors.length === 0 && score >= 70,
    score,
    errors,
    warnings,
    missingFields,
    duplicateRisks: [],
    rightsRisks: [],
    normalizedMetadata,
    recommendedFixes,
  };
}

// ─── Extração de JSON da resposta ─────────────────────────────────────────────

function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?([\s\S]*?)```/i);
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

export function parseCatalogMetadataValidatorResponse(
  raw: string,
  input: CatalogMetadataValidatorInput,
): CatalogMetadataValidatorOutput {
  const json = extractJson(raw);

  const fallback = buildFallback(input);

  if (!json) {
    return fallback;
  }

  const score = normalizeScore(json.score, fallback.score);

  return {
    isValid:            json.isValid !== undefined ? asBoolean(json.isValid) : fallback.isValid,
    score,
    errors:             mapFieldIssues(json.errors),
    warnings:           mapFieldIssues(json.warnings),
    missingFields:      asStringArray(json.missingFields),
    duplicateRisks:     mapDuplicateRisks(json.duplicateRisks),
    rightsRisks:        mapRightsRisks(json.rightsRisks),
    normalizedMetadata: mapNormalizedMetadata(json.normalizedMetadata, fallback.normalizedMetadata),
    recommendedFixes:   mapRecommendedFixes(json.recommendedFixes),
  };
}
