/**
 * modules/ai/skills/financial-classification/index.ts
 *
 * Consolidação: a lógica canônica de financial-classification (contracts, prompt,
 * parser, validators) vem do pacote compartilhado @music-os-360/ai-skills.
 * Apenas o template permanece local (ainda não migrado ao pacote).
 *
 * Re-export seletivo (sem expor ValidationResult) — preserva o contrato público
 * consumido por SkillEngine e pelo barrel skills/index.ts, evitando TS2308.
 */

export {
  FINANCIAL_CLASSIFICATION_SYSTEM_PROMPT,
  buildFinancialClassificationPrompt,
  parseFinancialClassificationResponse,
  validateFinancialClassificationInput,
  validateFinancialClassificationOutput,
} from "@music-os-360/ai-skills";

export type {
  FinancialClassificationInput,
  FinancialClassificationOutput,
  FinancialClassificationLanguage,
  FinancialDirection,
  FinancialRecurrence,
  LinkedEntityType,
  LinkedEntitySuggestion,
  FinancialRisk,
  FinancialRecommendedAction,
} from "@music-os-360/ai-skills";

// Template permanece local (não faz parte do pacote ainda).
export * from "./templates/financial-classification.template";
