/**
 * modules/ai/skills/artist-profile-analysis/index.ts
 *
 * Consolidação: a lógica canônica de artist-profile-analysis (contracts, prompt,
 * parser, validators) vem do pacote compartilhado @music-os-360/ai-skills.
 * Apenas o template permanece local (ainda não migrado ao pacote).
 *
 * Re-export seletivo (sem expor ValidationResult) — preserva o contrato público
 * consumido por SkillEngine e pelo barrel skills/index.ts, evitando TS2308.
 */

export {
  ARTIST_PROFILE_ANALYSIS_SYSTEM_PROMPT,
  buildArtistProfileAnalysisPrompt,
  parseArtistProfileAnalysisResponse,
  validateArtistProfileAnalysisInput,
  validateArtistProfileAnalysisOutput,
} from "@music-os-360/ai-skills";

export type {
  ArtistProfileAnalysisInput,
  ArtistProfileAnalysisOutput,
  ArtistProfileAnalysisLanguage,
  ArtistPlatformProfile,
  ArtistStrength,
  ArtistWeakness,
  ArtistOpportunity,
  ArtistRisk,
  ArtistRecommendedAction,
  ArtistPlatformRecommendation,
} from "@music-os-360/ai-skills";

// Template permanece local (não faz parte do pacote ainda).
export * from "./templates/artist-profile-analysis.template";
