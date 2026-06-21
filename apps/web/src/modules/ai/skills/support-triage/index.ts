/**
 * modules/ai/skills/support-triage/index.ts
 *
 * Consolidação: a lógica canônica de support-triage (contracts, prompt, parser,
 * validators) vem do pacote compartilhado @music-os-360/ai-skills.
 * Apenas o template permanece local (ainda não migrado ao pacote).
 *
 * Re-export seletivo (sem expor ValidationResult) — preserva o contrato público
 * consumido por SkillEngine e pelo barrel skills/index.ts, evitando TS2308.
 */

export {
  SUPPORT_TRIAGE_SYSTEM_PROMPT,
  buildSupportTriagePrompt,
  parseSupportTriageResponse,
  validateSupportTriageInput,
  validateSupportTriageOutput,
} from "@music-os-360/ai-skills";

export type {
  SupportTriageInput,
  SupportTriageOutput,
  SupportTriageLanguage,
  SupportModule,
  SLARecommendation,
  SupportRecommendedAction,
} from "@music-os-360/ai-skills";

// Template permanece local (não faz parte do pacote ainda).
export * from "./templates/support-triage.template";
