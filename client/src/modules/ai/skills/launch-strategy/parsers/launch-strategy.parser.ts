/**
 * skills/launch-strategy/parsers/launch-strategy.parser.ts
 * Converte resposta crua do provider em LaunchStrategyOutput estruturado.
 */

import type {
  LaunchStrategyInput,
  LaunchStrategyOutput,
  LaunchPhaseDetail,
  LaunchPhase,
} from "../contracts/launch-strategy.contracts";

function extractSection(text: string, header: string): string {
  const idx = text.indexOf(header);
  if (idx === -1) return "";
  const start = idx + header.length;
  const nextHeaders = [
    "RESUMO ESTRATÉGICO:", "ESTRATÉGIA ORB:", "OWNED:", "RENTED:", "BORROWED:",
    "FASES DE LANÇAMENTO:", "CHECKLIST PRÉ-LANÇAMENTO:", "CHECKLIST DIA DE LANÇAMENTO:",
    "CHECKLIST PÓS-LANÇAMENTO:", "KPIs:",
  ].filter((h) => h !== header);
  let end = text.length;
  for (const h of nextHeaders) {
    const pos = text.indexOf(h, start);
    if (pos !== -1 && pos < end) end = pos;
  }
  return text.slice(start, end).trim();
}

function extractBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

function parsePhases(text: string): LaunchPhaseDetail[] {
  const lines = text.split("\n").filter((l) => l.includes("FASE"));
  return lines.map((line, idx) => {
    const phaseNames: LaunchPhase[] = ["internal", "alpha", "beta", "early-access", "full"];
    return {
      phase:    phaseNames[idx] ?? "beta",
      duration: "1-2 semanas",
      actions:  [line.replace(/FASE \d+ — [^:]+:/, "").trim()].filter(Boolean),
      goal:     line,
    };
  });
}

export function parseLaunchStrategyResponse(
  raw: string,
  input: LaunchStrategyInput,
): LaunchStrategyOutput {
  const hasStructure = raw.includes("RESUMO ESTRATÉGICO:") || raw.includes("ESTRATÉGIA ORB:");

  if (hasStructure) {
    const summary        = extractSection(raw, "RESUMO ESTRATÉGICO:");
    const ownedSection   = extractSection(raw, "OWNED:");
    const rentedSection  = extractSection(raw, "RENTED:");
    const borrowedSection = extractSection(raw, "BORROWED:");
    const phasesSection  = extractSection(raw, "FASES DE LANÇAMENTO:");
    const preSection     = extractSection(raw, "CHECKLIST PRÉ-LANÇAMENTO:");
    const daySection     = extractSection(raw, "CHECKLIST DIA DE LANÇAMENTO:");
    const postSection    = extractSection(raw, "CHECKLIST PÓS-LANÇAMENTO:");
    const kpisSection    = extractSection(raw, "KPIs:");

    return {
      summary:             summary || raw,
      orbStrategy: {
        owned:    extractBullets(ownedSection),
        rented:   extractBullets(rentedSection),
        borrowed: extractBullets(borrowedSection),
      },
      phases:              parsePhases(phasesSection),
      preLaunchChecklist:  extractBullets(preSection),
      launchDayChecklist:  extractBullets(daySection),
      postLaunchChecklist: extractBullets(postSection),
      kpis:                extractBullets(kpisSection),
      projectName:         input.projectName,
      artistName:          input.artistName,
    };
  }

  // Fallback: texto completo como summary
  return {
    summary: raw,
    orbStrategy: { owned: [], rented: [], borrowed: [] },
    phases: [],
    preLaunchChecklist:  [],
    launchDayChecklist:  [],
    postLaunchChecklist: [],
    kpis:                [],
    projectName:         input.projectName,
    artistName:          input.artistName,
  };
}
