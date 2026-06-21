/**
 * skills/financial-classification/templates/financial-classification.template.ts
 *
 * Tabela de referência de centros de custo e categorias típicas do setor musical.
 * Guia para enriquecer a classificação — não substitui a saída do modelo.
 */

export interface FinancialCostCenterTemplate {
  costCenter: string;
  label: string;
  typicalCategories: string[];
  exampleKeywords: string[];
}

export const FINANCIAL_CLASSIFICATION_TEMPLATES: FinancialCostCenterTemplate[] = [
  {
    costCenter: "marketing",
    label: "Marketing",
    typicalCategories: ["Tráfego pago", "Influenciadores", "Assessoria de imprensa", "Conteúdo"],
    exampleKeywords: ["ads", "tráfego", "campanha", "Meta", "Google", "TikTok"],
  },
  {
    costCenter: "audiovisual",
    label: "Audiovisual / Produção",
    typicalCategories: ["Clipe", "Captação", "Pós-produção", "Estúdio", "Mixagem", "Masterização"],
    exampleKeywords: ["clipe", "vídeo", "estúdio", "mixagem", "masterização", "filmagem"],
  },
  {
    costCenter: "legal",
    label: "Jurídico",
    typicalCategories: ["Contratos", "Registros", "Honorários advocatícios"],
    exampleKeywords: ["jurídico", "advogado", "contrato", "registro", "cartório"],
  },
  {
    costCenter: "distribution",
    label: "Distribuição",
    typicalCategories: ["Agregadora", "DSPs", "Distribuição física"],
    exampleKeywords: ["distribuição", "DSP", "ONErpm", "DistroKid", "Spotify"],
  },
  {
    costCenter: "royalties",
    label: "Royalties / Direitos",
    typicalCategories: ["Royalties de gravação", "Royalties de publishing", "Adiantamentos", "ECAD"],
    exampleKeywords: ["royalty", "direito autoral", "ECAD", "adiantamento", "recoupment"],
  },
  {
    costCenter: "administrative",
    label: "Administrativo",
    typicalCategories: ["Impostos", "Salários", "Aluguel", "Contabilidade", "Despesas fixas"],
    exampleKeywords: ["imposto", "salário", "aluguel", "contábil", "escritório"],
  },
  {
    costCenter: "commercial",
    label: "Comercial",
    typicalCategories: ["Shows/Eventos", "Licenciamento/Sync", "Fornecedores", "Clientes"],
    exampleKeywords: ["show", "evento", "cachê", "licenciamento", "fornecedor", "cliente"],
  },
  {
    costCenter: "other",
    label: "Outro",
    typicalCategories: ["Não classificado"],
    exampleKeywords: [],
  },
];

export function getFinancialClassificationTemplate(costCenter: string): FinancialCostCenterTemplate | undefined {
  return FINANCIAL_CLASSIFICATION_TEMPLATES.find((t) => t.costCenter === costCenter);
}
