/**
 * skills/social-content/parsers/social-content.parser.ts
 *
 * Converte a resposta crua do provider em SocialContentOutput estruturado.
 */

import type { SocialContentInput, SocialContentOutput } from "../contracts/social-content.contracts";

function extractSection(text: string, header: string): string {
  const idx = text.indexOf(header);
  if (idx === -1) return "";
  const start = idx + header.length;
  const nextHeaders = [
    "CONTEÚDO PRINCIPAL:",
    "HASHTAGS:",
    "VERSÃO ALTERNATIVA:",
    "ENGAJAMENTO ESTIMADO:",
  ].filter((h) => h !== header);
  let end = text.length;
  for (const h of nextHeaders) {
    const pos = text.indexOf(h, start);
    if (pos !== -1 && pos < end) end = pos;
  }
  return text.slice(start, end).trim();
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u017E]+/g);
  return matches ?? [];
}

function estimateEngagement(
  text: string,
): "baixo" | "médio" | "alto" | "muito alto" {
  const lower = text.toLowerCase();
  if (lower.includes("muito alto") || lower.includes("very high")) return "muito alto";
  if (lower.includes("alto") || lower.includes("high")) return "alto";
  if (lower.includes("baixo") || lower.includes("low")) return "baixo";
  return "médio";
}

export function parseSocialContentResponse(
  raw: string,
  input: SocialContentInput,
): SocialContentOutput {
  const hasStructure =
    raw.includes("CONTEÚDO PRINCIPAL:") || raw.includes("HASHTAGS:");

  if (hasStructure) {
    const mainContent        = extractSection(raw, "CONTEÚDO PRINCIPAL:") || raw;
    const hashtagsSection    = extractSection(raw, "HASHTAGS:");
    const alternativeSection = extractSection(raw, "VERSÃO ALTERNATIVA:");
    const engagementSection  = extractSection(raw, "ENGAJAMENTO ESTIMADO:");

    return {
      mainContent,
      hashtags:            extractHashtags(hashtagsSection || mainContent),
      alternativeVersions: alternativeSection ? [alternativeSection] : undefined,
      estimatedEngagement: estimateEngagement(engagementSection),
      platform:            input.platform,
      format:              input.format,
      characterCount:      mainContent.length,
    };
  }

  // Fallback: tratar todo o texto como conteúdo principal
  return {
    mainContent:    raw.trim(),
    hashtags:       extractHashtags(raw),
    platform:       input.platform,
    format:         input.format,
    characterCount: raw.trim().length,
  };
}
