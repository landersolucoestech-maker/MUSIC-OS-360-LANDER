/**
 * modules/ai/skills/project-planning/index.ts
 *
 * Consolidação: a lógica canônica de project-planning (contracts, prompt, parser,
 * validators) vem do pacote compartilhado @music-os-360/ai-skills.
 * Apenas o template permanece local (ainda não migrado ao pacote).
 *
 * Re-export seletivo (sem expor ValidationResult) — preserva o contrato público
 * consumido por SkillEngine e pelo barrel skills/index.ts, evitando TS2308.
 */

export {
  PROJECT_PLANNING_SYSTEM_PROMPT,
  buildProjectPlanningPrompt,
  parseProjectPlanningResponse,
  validateProjectPlanningInput,
  validateProjectPlanningOutput,
} from "@music-os-360/ai-skills";

export type {
  ProjectPlanningInput,
  ProjectPlanningOutput,
  ProjectPlanningLanguage,
  ProjectPhase,
  ProjectTask,
  ProjectRisk,
  ProjectOwner,
  ProjectMilestone,
  TaskPriority,
  RiskSeverity,
} from "@music-os-360/ai-skills";

// Template permanece local (não faz parte do pacote ainda).
export * from "./templates/project-planning.template";
