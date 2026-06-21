/**
 * skills/contract-analysis/templates/contract-analysis.template.ts
 *
 * Templates de referência por tipo de contrato musical: focos de análise e
 * cláusulas tipicamente esperadas. Guia para enriquecer a análise — não
 * substitui a saída do modelo.
 */

import type { ContractType } from "../contracts/contract-analysis.contracts";

export interface ContractAnalysisTemplate {
  contractType: ContractType;
  label: string;
  focusAreas: string[];
  expectedClauses: string[];
}

export const CONTRACT_ANALYSIS_TEMPLATES: ContractAnalysisTemplate[] = [
  {
    contractType: "artist",
    label: "Contrato de Artista",
    focusAreas: ["Exclusividade", "Vigência e renovação", "Repasses/royalties", "Adiantamentos", "Reversão de direitos"],
    expectedClauses: ["Objeto", "Exclusividade", "Vigência", "Remuneração", "Rescisão", "Auditoria", "Foro"],
  },
  {
    contractType: "label",
    label: "Contrato de Gravadora (Selo)",
    focusAreas: ["Titularidade do fonograma", "Território", "Compromisso de gravações", "Splits de master", "Recoupment"],
    expectedClauses: ["Cessão de fonograma", "Território", "Royalties", "Recoupment", "Vigência", "Rescisão", "Auditoria"],
  },
  {
    contractType: "publishing",
    label: "Contrato de Editora (Publishing)",
    focusAreas: ["Cessão/administração da obra", "Splits de composição", "Sincronização", "Coletivas (ECAD)", "Reversão"],
    expectedClauses: ["Objeto da obra", "Administração", "Percentuais", "Sync", "Vigência", "Reversão de direitos", "Prestação de contas"],
  },
  {
    contractType: "licensing",
    label: "Contrato de Licenciamento",
    focusAreas: ["Escopo da licença", "Exclusividade", "Território", "Prazo", "Uso permitido", "Remuneração"],
    expectedClauses: ["Objeto licenciado", "Escopo de uso", "Território", "Prazo", "Remuneração", "Clearance de direitos"],
  },
  {
    contractType: "distribution",
    label: "Contrato de Distribuição",
    focusAreas: ["Canais/DSPs", "Comissão/percentual", "Território", "Exclusividade", "Repasses e prazos"],
    expectedClauses: ["Objeto", "Comissão", "Território", "Prestação de contas", "Vigência", "Rescisão"],
  },
  {
    contractType: "producer",
    label: "Contrato de Produtor Musical",
    focusAreas: ["Pontos de produção (producer points)", "Titularidade de master", "Créditos", "Pagamento", "Entregáveis"],
    expectedClauses: ["Objeto", "Producer points", "Créditos", "Entrega de stems/masters", "Remuneração", "Cessão"],
  },
  {
    contractType: "service",
    label: "Contrato de Prestação de Serviço",
    focusAreas: ["Escopo do serviço", "Prazos e entregáveis", "Remuneração", "Multas", "Propriedade do resultado"],
    expectedClauses: ["Objeto", "Escopo", "Prazos", "Remuneração", "Multa", "Confidencialidade", "Rescisão"],
  },
  {
    contractType: "partnership",
    label: "Contrato de Parceria / Sociedade",
    focusAreas: ["Divisão de receitas", "Aportes e responsabilidades", "Tomada de decisão", "Saída/dissolução"],
    expectedClauses: ["Objeto da parceria", "Divisão de resultados", "Responsabilidades", "Governança", "Saída", "Resolução de conflitos"],
  },
  {
    contractType: "other",
    label: "Outro",
    focusAreas: ["Partes", "Objeto", "Vigência", "Remuneração", "Direitos", "Rescisão", "Riscos"],
    expectedClauses: ["Objeto", "Partes", "Vigência", "Remuneração", "Rescisão", "Foro"],
  },
];

export function getContractAnalysisTemplate(contractType: ContractType): ContractAnalysisTemplate | undefined {
  return CONTRACT_ANALYSIS_TEMPLATES.find((t) => t.contractType === contractType);
}
