/**
 * skills/copywriting/parsers/copywriting.parser.ts
 * Converte resposta crua do provider em CopywritingOutput estruturado.
 */

import type { CopywritingInput, CopywritingOutput } from "../contracts/copywriting.contracts";

function extractSection(text: string, header: string): string {
  const idx = text.indexOf(header);
  if (idx === -1) return "";
  const start = idx + header.length;
  const allHeaders = [
    "HEADLINE PRINCIPAL:", "SUBHEADLINE:", "COPY PRINCIPAL:", "CTA:",
    "HEADLINES ALTERNATIVOS", "CTAs ALTERNATIVOS", "META TITLE", "META DESCRIPTION",
  ].filter((h) => !header.startsWith(h));
  let end = text.length;
  for (const h of allHeaders) {
    const pos = text.indexOf(h, start);
    if (pos !== -1 && pos < end) end = pos;
  }
  return text.slice(start, end).trim();
}

function extractAlternatives(section: string): string[] {
  const lines = section.split("\n").filter((l) => /^[A-Z]\)/.test(l.trim()));
  return lines.map((l) => l.replace(/^[A-Z]\)\s*/, "").trim()).filter(Boolean);
}

export function parseCopywritingResponse(
  raw: string,
  input: CopywritingInput,
): CopywritingOutput {
  const hasStructure = raw.includes("HEADLINE PRINCIPAL:") || raw.includes("SUBHEADLINE:");

  if (hasStructure) {
    const headline      = extractSection(raw, "HEADLINE PRINCIPAL:");
    const subheadline   = extractSection(raw, "SUBHEADLINE:");
    const bodyCopy      = extractSection(raw, "COPY PRINCIPAL:");
    const cta           = extractSection(raw, "CTA:");
    const altHeadlines  = extractSection(raw, "HEADLINES ALTERNATIVOS (2 opções):");
    const altCTAs       = extractSection(raw, "CTAs ALTERNATIVOS:");
    const metaTitle     = extractSection(raw, "META TITLE (para SEO):");
    const metaDesc      = extractSection(raw, "META DESCRIPTION:");

    return {
      headline:              headline || raw.split("\n")[0] || "",
      subheadline:           subheadline,
      bodyCopy:              bodyCopy || raw,
      cta:                   cta || "Saiba Mais",
      alternativeHeadlines:  extractAlternatives(altHeadlines),
      alternativeCTAs:       extractAlternatives(altCTAs),
      metaTitle:             metaTitle || undefined,
      metaDescription:       metaDesc  || undefined,
      pageType:              input.pageType,
    };
  }

  // Fallback: texto completo como bodyCopy
  const firstLine = raw.split("\n")[0] ?? "";
  return {
    headline:    firstLine,
    subheadline: "",
    bodyCopy:    raw,
    cta:         input.primaryCTA ?? "Saiba Mais",
    pageType:    input.pageType,
  };
}
