/**
 * modules/ai/application/skill-provenance.ts
 *
 * Helper PURO de proveniência para a fiação read-only das Skills.
 * Determina, ao redor do output (sem alterá-lo), se o resultado veio do modelo
 * ou de um fallback heurístico local, e expõe disclaimer/confidence quando existem.
 *
 * NÃO altera `parsed`. NÃO tem efeitos colaterais.
 */

import type { AISkillName, AIProviderName } from "../domain/ai.types";

// ─── Tipo de saída ────────────────────────────────────────────────────────────

export type SkillProvenanceSource = "model" | "heuristic-fallback";

export interface SkillProvenance {
  source: SkillProvenanceSource;
  label: string;
  warning?: string;
  disclaimer?: string;
  confidence?: number;
}

export interface BuildSkillProvenanceParams {
  skill: AISkillName;
  parsed: unknown;
  provider: AIProviderName;
  mockMode: boolean;
}

// ─── Marcadores textuais de fallback heurístico ───────────────────────────────

const HEURISTIC_MARKERS = ["heurística local", "heurístico local", "não foi executada"];

// ─── Helpers internos (leitura segura, sem mutar) ─────────────────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readDisclaimer(parsed: Record<string, unknown>): string | undefined {
  return typeof parsed.disclaimer === "string" && parsed.disclaimer.trim()
    ? parsed.disclaimer
    : undefined;
}

function readConfidence(parsed: Record<string, unknown>): number | undefined {
  if (typeof parsed.confidence === "number") return parsed.confidence;
  if (typeof parsed.matchConfidence === "number") return parsed.matchConfidence;
  return undefined;
}

function hasHeuristicMarker(parsed: unknown): boolean {
  let haystack = "";
  try {
    haystack = JSON.stringify(parsed ?? "").toLowerCase();
  } catch {
    return false;
  }
  return HEURISTIC_MARKERS.some((marker) => haystack.includes(marker));
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildSkillProvenance(params: BuildSkillProvenanceParams): SkillProvenance {
  const parsedRecord = asRecord(params.parsed);

  const disclaimer = readDisclaimer(parsedRecord);
  const confidence = readConfidence(parsedRecord);

  // Em MOCK_MODE o provider devolve conteúdo simulado (não-JSON) → fallback heurístico.
  // Fora do mock, detectamos marcadores textuais deixados pelos parsers no fallback.
  const source: SkillProvenanceSource =
    params.mockMode || hasHeuristicMarker(params.parsed) ? "heuristic-fallback" : "model";

  const label =
    source === "heuristic-fallback"
      ? "Heurística local"
      : `Modelo (${params.provider})`;

  const provenance: SkillProvenance = { source, label };

  if (source === "heuristic-fallback") {
    provenance.warning =
      "Resultado heurístico local — a análise detalhada do modelo não foi executada. Revise antes de usar.";
  }
  if (disclaimer) provenance.disclaimer = disclaimer;
  if (confidence !== undefined) provenance.confidence = confidence;

  return provenance;
}
