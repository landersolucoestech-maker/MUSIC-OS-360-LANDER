/**
 * skills/contract-analysis/validators/contract-analysis.validator.ts
 */

import type {
  ContractAnalysisInput,
  ContractAnalysisOutput,
} from "../contracts/contract-analysis.contracts";
import type { SkillValidationResult } from "../../../domain/ai.types";

// Alias do tipo compartilhado — mantém o nome local já exportado.
export type ValidationResult = SkillValidationResult;

const MIN_CONTRACT_LENGTH = 100;

export function validateContractAnalysisInput(input: ContractAnalysisInput): ValidationResult {
  const errors: string[] = [];

  if (!input.contractText?.trim()) {
    errors.push("contractText é obrigatório");
  } else if (input.contractText.trim().length < MIN_CONTRACT_LENGTH) {
    errors.push(`contractText deve ter no mínimo ${MIN_CONTRACT_LENGTH} caracteres`);
  }

  if (!input.contractType) errors.push("contractType é obrigatório");

  if (input.parties !== undefined) {
    if (!Array.isArray(input.parties) || !input.parties.every((p) => typeof p === "string")) {
      errors.push("parties deve ser um array de strings");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateContractAnalysisOutput(output: ContractAnalysisOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.summary?.trim())     errors.push("summary não pode estar vazio");
  if (!output.disclaimer?.trim())  errors.push("disclaimer é obrigatório no output");
  if (!Array.isArray(output.risks)) errors.push("risks deve ser uma lista");

  return { valid: errors.length === 0, errors };
}
