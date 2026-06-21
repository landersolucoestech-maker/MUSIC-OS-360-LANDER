/**
 * packages/ai-skills/src/shared/primitives.ts
 *
 * Primitivos compartilhados das AI Skills — fonte única para web e api.
 * Estruturalmente idênticos aos definidos em apps/web (domain/ai.types.ts),
 * permitindo reúso sem acoplar a um app específico.
 */

export type SkillLanguage = "pt-BR" | "en-US";

export type SkillSeverity = "low" | "medium" | "high" | "critical";

export type SkillPriority = "low" | "medium" | "high" | "critical";

export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
}
