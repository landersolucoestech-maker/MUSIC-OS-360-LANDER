/**
 * skills/launch-strategy/validators/launch-strategy.validator.ts
 */

import type { LaunchStrategyInput, LaunchStrategyOutput } from "../contracts/launch-strategy.contracts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLaunchStrategyInput(input: LaunchStrategyInput): ValidationResult {
  const errors: string[] = [];

  if (!input.artistName?.trim())  errors.push("artistName é obrigatório");
  if (!input.projectName?.trim()) errors.push("projectName é obrigatório");
  if (!input.launchType)          errors.push("launchType é obrigatório");

  return { valid: errors.length === 0, errors };
}

export function validateLaunchStrategyOutput(output: LaunchStrategyOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.summary?.trim())       errors.push("summary não pode estar vazio");
  if (!output.phases?.length)        errors.push("phases não pode estar vazio");
  if (!output.kpis?.length)          errors.push("kpis não pode estar vazio");

  return { valid: errors.length === 0, errors };
}
