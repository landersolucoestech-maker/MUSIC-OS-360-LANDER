/**
 * modules/ai/skills/crm-followup/index.ts
 *
 * Camada de compatibilidade: a lógica canônica vem do pacote @music-os-360/ai-skills.
 * Apenas o template permanece local. Re-export seletivo (sem ValidationResult, evita TS2308).
 */

export {
  CRM_FOLLOWUP_SYSTEM_PROMPT,
  buildCrmFollowupPrompt,
  parseCrmFollowupResponse,
  validateCrmFollowupInput,
  validateCrmFollowupOutput,
} from "@music-os-360/ai-skills";

export type {
  CrmFollowupInput,
  CrmFollowupOutput,
  CrmLeadType,
  CrmStage,
  CrmObjection,
  CrmRisk,
  CrmStageRecommendation,
  CrmTask,
} from "@music-os-360/ai-skills";

export * from "./templates/crm-followup.template";
