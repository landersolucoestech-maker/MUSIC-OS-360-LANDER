/**
 * skills/copywriting/validators/copywriting.validator.ts
 */

import type { CopywritingInput, CopywritingOutput } from "../contracts/copywriting.contracts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCopywritingInput(input: CopywritingInput): ValidationResult {
  const errors: string[] = [];

  if (!input.artistName?.trim()) errors.push("artistName é obrigatório");
  if (!input.pageType)           errors.push("pageType é obrigatório");

  return { valid: errors.length === 0, errors };
}

export function validateCopywritingOutput(output: CopywritingOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.headline?.trim())   errors.push("headline não pode estar vazia");
  if (!output.bodyCopy?.trim())   errors.push("bodyCopy não pode estar vazio");
  if (!output.cta?.trim())        errors.push("cta não pode estar vazio");

  if (output.metaDescription && output.metaDescription.length > 160) {
    errors.push("metaDescription excede 160 caracteres");
  }

  return { valid: errors.length === 0, errors };
}
