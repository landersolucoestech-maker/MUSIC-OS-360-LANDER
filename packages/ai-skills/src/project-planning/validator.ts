/**
 * packages/ai-skills/src/project-planning/validator.ts
 */

import type {
  ProjectPlanningInput,
  ProjectPlanningOutput,
} from "./contracts";
import type { SkillValidationResult } from "../shared/primitives";

export type ValidationResult = SkillValidationResult;

export function validateProjectPlanningInput(input: ProjectPlanningInput): SkillValidationResult {
  const errors: string[] = [];

  if (!input.projectName?.trim()) errors.push("projectName é obrigatório");
  if (!input.projectType?.trim()) errors.push("projectType é obrigatório");

  if (!Array.isArray(input.departments) || input.departments.length === 0) {
    errors.push("departments deve ter pelo menos 1 item");
  }

  if (!Array.isArray(input.goals) || input.goals.length === 0) {
    errors.push("goals deve ter pelo menos 1 item");
  }

  return { valid: errors.length === 0, errors };
}

export function validateProjectPlanningOutput(output: ProjectPlanningOutput): SkillValidationResult {
  const errors: string[] = [];

  if (!output.summary?.trim())        errors.push("summary não pode estar vazio");
  if (!Array.isArray(output.phases))  errors.push("phases deve ser uma lista");
  if (!Array.isArray(output.tasks))   errors.push("tasks deve ser uma lista");

  return { valid: errors.length === 0, errors };
}
