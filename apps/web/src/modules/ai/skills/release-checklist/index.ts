/**
 * modules/ai/skills/release-checklist/index.ts
 *
 * Consolidação: a lógica canônica de release-checklist (contracts, prompt, parser,
 * validators) vem do pacote compartilhado @music-os-360/ai-skills.
 * Apenas o template permanece local (ainda não migrado ao pacote).
 *
 * Re-export seletivo (sem expor ValidationResult) — preserva o contrato público
 * consumido por SkillEngine e pelo barrel skills/index.ts, evitando TS2308.
 */

export {
  RELEASE_CHECKLIST_SYSTEM_PROMPT,
  buildReleaseChecklistPrompt,
  parseReleaseChecklistResponse,
  validateReleaseChecklistInput,
  validateReleaseChecklistOutput,
} from "@music-os-360/ai-skills";

export type {
  ReleaseChecklistInput,
  ReleaseChecklistOutput,
  ReleaseChecklistLanguage,
  ReleaseType,
  ReleaseStatus,
  ItemSeverity,
  ActionPriority,
  MissingItem,
  CriticalIssue,
  ChecklistItem,
  RecommendedAction,
  MetadataReview,
} from "@music-os-360/ai-skills";

// Template permanece local (não faz parte do pacote ainda).
export * from "./templates/release-checklist.template";
