/**
 * skills/licensing-opportunity-analysis/validators/licensing-opportunity-analysis.validator.ts
 *
 * Validação de entrada/saída. Usa o tipo compartilhado SkillValidationResult.
 */

import type {
  LicensingOpportunityAnalysisInput,
  LicensingOpportunityAnalysisOutput,
  LicensingUsageType,
} from "../contracts/licensing-opportunity-analysis.contracts";
import type { SkillValidationResult } from "../../../domain/ai.types";

const USAGE_TYPES: LicensingUsageType[] = [
  "sync", "advertising", "film", "series", "game", "social-media",
  "corporate", "public-performance", "sample", "cover", "other",
];

export function validateLicensingOpportunityAnalysisInput(
  input: LicensingOpportunityAnalysisInput,
): SkillValidationResult {
  const errors: string[] = [];

  if (!input.workTitle?.trim())  errors.push("workTitle é obrigatório");
  if (!input.artistName?.trim()) errors.push("artistName é obrigatório");

  if (!input.usageType || !(USAGE_TYPES as string[]).includes(input.usageType)) {
    errors.push("usageType é obrigatório e deve ser um dos valores definidos");
  }

  if (input.budget !== undefined) {
    if (typeof input.budget !== "number" || Number.isNaN(input.budget) || !Number.isFinite(input.budget) || input.budget < 0) {
      errors.push("budget, se informado, deve ser um número válido >= 0");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateLicensingOpportunityAnalysisOutput(
  output: LicensingOpportunityAnalysisOutput,
): SkillValidationResult {
  const errors: string[] = [];

  if (!output.viability)           errors.push("viability não pode estar vazio");
  if (!output.recommendedDecision) errors.push("recommendedDecision não pode estar vazio");
  if (!output.disclaimer?.trim())  errors.push("disclaimer é obrigatório no output");

  if (typeof output.confidence !== "number") {
    errors.push("confidence deve ser numérico");
  } else if (output.confidence < 0 || output.confidence > 1) {
    errors.push("confidence deve estar entre 0 e 1");
  }

  return { valid: errors.length === 0, errors };
}
