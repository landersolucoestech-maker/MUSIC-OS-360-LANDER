/**
 * skills/support-triage/templates/support-triage.template.ts
 *
 * Referências de categoria de ticket e SLA sugerido por nível.
 * Guia para enriquecer a triagem — não substitui a saída do modelo.
 */

import type { SupportModule } from "@music-os-360/ai-skills";
import type { SkillPriority } from "../../../domain/ai.types";

export interface SupportCategoryTemplate {
  category: string;
  typicalModules: SupportModule[];
  defaultPriority: SkillPriority;
  signals: string[];
}

export const SUPPORT_CATEGORY_TEMPLATES: SupportCategoryTemplate[] = [
  {
    category: "Dúvida operacional",
    typicalModules: ["support", "settings", "other"],
    defaultPriority: "low",
    signals: ["dúvida", "como faço", "tutorial", "ajuda"],
  },
  {
    category: "Bug / Erro do sistema",
    typicalModules: ["artists", "releases", "catalog", "marketing", "audiovisual", "ai"],
    defaultPriority: "high",
    signals: ["erro", "bug", "falha", "travou", "crash", "não consigo"],
  },
  {
    category: "Falha de integração",
    typicalModules: ["integrations", "releases", "financial"],
    defaultPriority: "high",
    signals: ["integração", "DSP", "distribuidora", "OAuth", "webhook", "sincronização"],
  },
  {
    category: "Erro financeiro",
    typicalModules: ["financial"],
    defaultPriority: "high",
    signals: ["pagamento", "cobrança", "repasse", "fatura", "nota fiscal"],
  },
  {
    category: "Problema de acesso/login",
    typicalModules: ["settings", "support"],
    defaultPriority: "high",
    signals: ["login", "acesso", "senha", "autenticação", "bloqueado"],
  },
  {
    category: "Contrato / Catálogo / Lançamento",
    typicalModules: ["contracts", "catalog", "releases"],
    defaultPriority: "medium",
    signals: ["contrato", "obra", "fonograma", "ISRC", "UPC", "lançamento"],
  },
  {
    category: "IA / Configuração",
    typicalModules: ["ai", "settings"],
    defaultPriority: "medium",
    signals: ["skill", "geração", "configuração", "automação"],
  },
];

export function getSupportCategoryTemplate(category: string): SupportCategoryTemplate | undefined {
  return SUPPORT_CATEGORY_TEMPLATES.find((t) => t.category === category);
}

/** SLA de referência por nível de prioridade. */
export const SUPPORT_SLA_REFERENCE: Record<SkillPriority, { responseTime: string; resolutionTime: string }> = {
  critical: { responseTime: "1h",  resolutionTime: "8h" },
  high:     { responseTime: "2h",  resolutionTime: "1 dia útil" },
  medium:   { responseTime: "8h",  resolutionTime: "3 dias úteis" },
  low:      { responseTime: "24h", resolutionTime: "5 dias úteis" },
};
