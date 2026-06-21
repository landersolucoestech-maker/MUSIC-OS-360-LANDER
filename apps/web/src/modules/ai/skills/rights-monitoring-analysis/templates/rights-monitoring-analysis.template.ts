/**
 * skills/rights-monitoring-analysis/templates/rights-monitoring-analysis.template.ts
 *
 * Referências de decisão por faixa de confiança e natureza do uso.
 * Guia para enriquecer a análise — não substitui a saída do modelo nem revisão jurídica.
 */

import type { RightsMonitoringAction } from "../contracts/rights-monitoring-analysis.contracts";

export interface RightsMonitoringActionTemplate {
  action: RightsMonitoringAction;
  label: string;
  whenToUse: string;
}

export const RIGHTS_MONITORING_ACTION_TEMPLATES: RightsMonitoringActionTemplate[] = [
  { action: "ignore",        label: "Ignorar",            whenToUse: "Falso positivo claro ou uso irrelevante." },
  { action: "monitor",       label: "Monitorar",          whenToUse: "Possível, mas baixo risco; acompanhar evolução." },
  { action: "request-info",  label: "Solicitar informação", whenToUse: "Evidências insuficientes; pedir dados adicionais." },
  { action: "manual-review", label: "Revisão manual",     whenToUse: "Caso ambíguo que exige avaliação humana." },
  { action: "prepare-claim", label: "Preparar reivindicação", whenToUse: "Correspondência provável com evidências sólidas." },
  { action: "takedown",      label: "Takedown",           whenToUse: "Violação bem fundamentada e titularidade comprovada." },
];

export function getRightsMonitoringActionTemplate(
  action: RightsMonitoringAction,
): RightsMonitoringActionTemplate | undefined {
  return RIGHTS_MONITORING_ACTION_TEMPLATES.find((t) => t.action === action);
}

/**
 * Faixas de referência (heurística) entre confiança de correspondência e ação.
 * NÃO é regra automática — apenas guia; a decisão final exige revisão.
 */
export const MATCH_CONFIDENCE_GUIDANCE: Array<{ maxConfidence: number; suggestedAction: RightsMonitoringAction }> = [
  { maxConfidence: 0.3,  suggestedAction: "monitor" },
  { maxConfidence: 0.6,  suggestedAction: "manual-review" },
  { maxConfidence: 0.8,  suggestedAction: "prepare-claim" },
  { maxConfidence: 1.01, suggestedAction: "takedown" },
];

export function suggestActionByConfidence(matchConfidence: number): RightsMonitoringAction {
  const band = MATCH_CONFIDENCE_GUIDANCE.find((b) => matchConfidence < b.maxConfidence);
  return band ? band.suggestedAction : "manual-review";
}
