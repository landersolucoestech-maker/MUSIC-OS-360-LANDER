/**
 * skills/licensing-opportunity-analysis/templates/licensing-opportunity-analysis.template.ts
 *
 * Referências por tipo de uso: direitos tipicamente exigidos e pontos de atenção.
 * Guia para enriquecer a análise — não substitui a saída do modelo nem revisão jurídica.
 */

import type { LicensingUsageType } from "../contracts/licensing-opportunity-analysis.contracts";

export interface LicensingUsageTemplate {
  usageType: LicensingUsageType;
  label: string;
  /** Exige autorização de obra (publishing). */
  requiresWorkRights: boolean;
  /** Exige autorização de fonograma (master). */
  requiresMasterRights: boolean;
  keyChecks: string[];
}

export const LICENSING_USAGE_TEMPLATES: LicensingUsageTemplate[] = [
  { usageType: "sync",               label: "Sincronização",        requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Sync de obra", "Master use", "Território", "Prazo"] },
  { usageType: "advertising",        label: "Publicidade",          requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Exclusividade de categoria", "Território", "Mídia", "Prazo"] },
  { usageType: "film",               label: "Filme",                requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Sync", "Master use", "Cessão para todas as mídias", "Festival/streaming"] },
  { usageType: "series",             label: "Série",                requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Sync", "Master use", "Temporadas", "Plataforma"] },
  { usageType: "game",               label: "Game",                 requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Sync interativa", "Master use", "Plataformas", "Prazo perpétuo?"] },
  { usageType: "social-media",       label: "Redes sociais",        requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Uso orgânico vs pago", "Território", "Conta/handle"] },
  { usageType: "corporate",          label: "Corporativo",          requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Uso interno/externo", "Território", "Prazo"] },
  { usageType: "public-performance", label: "Execução pública",     requiresWorkRights: true,  requiresMasterRights: false, keyChecks: ["Coletivas/ECAD", "Local", "Bilheteria"] },
  { usageType: "sample",             label: "Sample",               requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Clearance da obra original", "Clearance do fonograma original", "Splits resultantes"] },
  { usageType: "cover",              label: "Cover/Versão",         requiresWorkRights: true,  requiresMasterRights: false, keyChecks: ["Autorização da obra original", "Versão/tradução", "Créditos"] },
  { usageType: "other",              label: "Outro",                requiresWorkRights: true,  requiresMasterRights: true,  keyChecks: ["Mapear escopo de uso", "Direitos aplicáveis", "Território/prazo"] },
];

export function getLicensingUsageTemplate(usageType: LicensingUsageType): LicensingUsageTemplate | undefined {
  return LICENSING_USAGE_TEMPLATES.find((t) => t.usageType === usageType);
}
