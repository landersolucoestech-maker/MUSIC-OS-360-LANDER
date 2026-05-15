/**
 * skills/social-content/validators/social-content.validator.ts
 *
 * Valida inputs e outputs da skill social-content antes de processar.
 */

import type { SocialContentInput, SocialContentOutput } from "../contracts/social-content.contracts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const PLATFORM_MAX_CHARS: Record<string, number> = {
  twitter:   280,
  instagram: 2200,
  tiktok:    2200,
  facebook:  63206,
  linkedin:  3000,
  youtube:   5000,
  threads:   500,
  spotify:   1500,
};

export function validateSocialContentInput(input: SocialContentInput): ValidationResult {
  const errors: string[] = [];

  if (!input.artistName?.trim()) {
    errors.push("artistName é obrigatório");
  }

  if (!input.platform) {
    errors.push("platform é obrigatória");
  }

  if (!input.format) {
    errors.push("format é obrigatório");
  }

  if (input.keywords && input.keywords.length > 10) {
    errors.push("máximo de 10 keywords permitidas");
  }

  return { valid: errors.length === 0, errors };
}

export function validateSocialContentOutput(output: SocialContentOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.mainContent?.trim()) {
    errors.push("mainContent não pode estar vazio");
  }

  const maxChars = PLATFORM_MAX_CHARS[output.platform];
  if (maxChars && output.mainContent.length > maxChars) {
    errors.push(`Conteúdo excede limite de ${maxChars} caracteres para ${output.platform}`);
  }

  return { valid: errors.length === 0, errors };
}
