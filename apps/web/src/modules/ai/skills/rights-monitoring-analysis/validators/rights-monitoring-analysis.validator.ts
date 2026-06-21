/**
 * skills/rights-monitoring-analysis/validators/rights-monitoring-analysis.validator.ts
 *
 * Validação de entrada/saída. Usa o tipo compartilhado SkillValidationResult.
 */

import type {
  RightsMonitoringAnalysisInput,
  RightsMonitoringAnalysisOutput,
} from "../contracts/rights-monitoring-analysis.contracts";
import type { SkillValidationResult } from "../../../domain/ai.types";

export function validateRightsMonitoringAnalysisInput(
  input: RightsMonitoringAnalysisInput,
): SkillValidationResult {
  const errors: string[] = [];

  if (!input.detectedUse?.trim()) errors.push("detectedUse é obrigatório");
  if (!input.workTitle?.trim())   errors.push("workTitle é obrigatório");
  if (!input.artistName?.trim())  errors.push("artistName é obrigatório");
  if (!input.platform?.trim())    errors.push("platform é obrigatório");

  if (input.evidence !== undefined) {
    if (!Array.isArray(input.evidence) || !input.evidence.every((e) => typeof e === "string")) {
      errors.push("evidence deve ser um array de strings");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateRightsMonitoringAnalysisOutput(
  output: RightsMonitoringAnalysisOutput,
): SkillValidationResult {
  const errors: string[] = [];

  if (!output.infringementRisk)  errors.push("infringementRisk não pode estar vazio");
  if (!output.recommendedAction) errors.push("recommendedAction não pode estar vazio");
  if (!output.disclaimer?.trim()) errors.push("disclaimer é obrigatório no output");

  if (typeof output.matchConfidence !== "number") {
    errors.push("matchConfidence deve ser numérico");
  } else if (output.matchConfidence < 0 || output.matchConfidence > 1) {
    errors.push("matchConfidence deve estar entre 0 e 1");
  }

  return { valid: errors.length === 0, errors };
}
