/**
 * packages/ai-skills/src/release-checklist/validator.ts
 */

import type {
  ReleaseChecklistInput,
  ReleaseChecklistOutput,
} from "./contracts";
import type { SkillValidationResult } from "../shared/primitives";

export type ValidationResult = SkillValidationResult;

export function validateReleaseChecklistInput(input: ReleaseChecklistInput): SkillValidationResult {
  const errors: string[] = [];

  if (!input.releaseTitle?.trim()) errors.push("releaseTitle é obrigatório");
  if (!input.artistName?.trim())   errors.push("artistName é obrigatório");
  if (!input.releaseType)          errors.push("releaseType é obrigatório");

  const booleanFields: Array<keyof ReleaseChecklistInput> = [
    "hasCover",
    "hasISRC",
    "hasUPC",
    "hasContracts",
    "hasSplits",
    "hasMarketingPlan",
  ];

  for (const field of booleanFields) {
    if (typeof input[field] !== "boolean") {
      errors.push(`${field} deve ser booleano`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateReleaseChecklistOutput(output: ReleaseChecklistOutput): SkillValidationResult {
  const errors: string[] = [];

  if (typeof output.readinessScore !== "number") {
    errors.push("readinessScore deve ser numérico");
  } else if (output.readinessScore < 0 || output.readinessScore > 100) {
    errors.push("readinessScore deve estar entre 0 e 100");
  }

  if (!output.status) errors.push("status não pode estar vazio");
  if (!Array.isArray(output.checklist)) errors.push("checklist deve ser uma lista");

  return { valid: errors.length === 0, errors };
}
