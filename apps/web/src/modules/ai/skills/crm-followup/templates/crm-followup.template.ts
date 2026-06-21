/**
 * skills/crm-followup/templates/crm-followup.template.ts
 *
 * Templates de referência de abordagem por estágio do funil de CRM.
 * Guia para enriquecer o follow-up — não substitui a saída do modelo.
 */

import type { CrmStage, CrmLeadType } from "@music-os-360/ai-skills";
import type { SkillPriority } from "../../../domain/ai.types";

export interface CrmStageTemplate {
  stage: CrmStage;
  label: string;
  defaultPriority: SkillPriority;
  recommendedActions: string[];
  typicalObjections: string[];
}

export const CRM_STAGE_TEMPLATES: CrmStageTemplate[] = [
  {
    stage: "new",
    label: "Novo",
    defaultPriority: "low",
    recommendedActions: ["Primeiro contato de apresentação", "Qualificar interesse e fit"],
    typicalObjections: ["Não conheço a empresa", "Sem tempo agora"],
  },
  {
    stage: "contacted",
    label: "Contatado",
    defaultPriority: "medium",
    recommendedActions: ["Agendar conversa de descoberta", "Enviar material de apresentação"],
    typicalObjections: ["Preciso pensar", "Me envie por e-mail"],
  },
  {
    stage: "qualified",
    label: "Qualificado",
    defaultPriority: "medium",
    recommendedActions: ["Mapear necessidade", "Preparar proposta sob medida"],
    typicalObjections: ["Qual o investimento?", "Preciso alinhar internamente"],
  },
  {
    stage: "proposal",
    label: "Proposta",
    defaultPriority: "high",
    recommendedActions: ["Apresentar proposta", "Esclarecer dúvidas e validar escopo"],
    typicalObjections: ["Está acima do orçamento", "Comparando com concorrente"],
  },
  {
    stage: "negotiation",
    label: "Negociação",
    defaultPriority: "high",
    recommendedActions: ["Negociar termos", "Definir prazo de fechamento"],
    typicalObjections: ["Quero desconto", "Preciso de prazo maior"],
  },
  {
    stage: "won",
    label: "Ganho",
    defaultPriority: "low",
    recommendedActions: ["Onboarding/pós-venda", "Solicitar indicação"],
    typicalObjections: [],
  },
  {
    stage: "lost",
    label: "Perdido",
    defaultPriority: "low",
    recommendedActions: ["Registrar motivo da perda", "Nutrir para retomada futura"],
    typicalObjections: [],
  },
  {
    stage: "inactive",
    label: "Inativo",
    defaultPriority: "low",
    recommendedActions: ["Reengajar com novidade relevante", "Reavaliar fit"],
    typicalObjections: ["Não é prioridade agora"],
  },
];

export function getCrmStageTemplate(stage: CrmStage): CrmStageTemplate | undefined {
  return CRM_STAGE_TEMPLATES.find((t) => t.stage === stage);
}

/** Abordagem sugerida por tipo de lead (tom/ângulo). */
export const CRM_LEAD_TYPE_HINTS: Record<CrmLeadType, string> = {
  artist:    "Tom próximo e criativo; foco em carreira e parceria de longo prazo.",
  label:     "Tom profissional B2B; foco em catálogo, distribuição e resultados.",
  publisher: "Foco em direitos, splits e oportunidades de publishing/sync.",
  producer:  "Foco em produção, agenda e entregáveis técnicos.",
  brand:     "Foco em ativação, audiência e retorno de marca.",
  partner:   "Foco em ganho mútuo e governança da parceria.",
  supplier:  "Foco em SLA, prazo e condições comerciais.",
  client:    "Foco em necessidade, valor entregue e recompra.",
  other:     "Abordagem consultiva e neutra; qualificar antes de avançar.",
};
