/**
 * skills/project-planning/templates/project-planning.template.ts
 *
 * Templates de referência por natureza de operação musical.
 * Servem de guia (fases recomendadas, departamentos típicos e riscos comuns)
 * para enriquecer o planejamento — não substituem a saída do modelo.
 */

export interface ProjectPlanningTemplate {
  /** Palavra-chave de correspondência sobre projectType (lowercase, parcial). */
  match: string;
  label: string;
  typicalDepartments: string[];
  recommendedPhases: string[];
  commonRisks: string[];
}

export const PROJECT_PLANNING_TEMPLATES: ProjectPlanningTemplate[] = [
  {
    match: "gravacao",
    label: "Gravação / Produção Fonográfica (Gravadora)",
    typicalDepartments: ["A&R", "Produção", "Estúdio", "Marketing", "Distribuição", "Financeiro"],
    recommendedPhases: ["Pré-produção", "Gravação", "Mixagem e Masterização", "Registro e Metadados", "Distribuição"],
    commonRisks: [
      "Atraso na entrega de stems/masters",
      "ISRC/UPC não emitidos a tempo da distribuição",
      "Estouro de orçamento de estúdio",
    ],
  },
  {
    match: "lancamento",
    label: "Lançamento de Single/EP/Álbum (Gravadora)",
    typicalDepartments: ["Marketing", "Distribuição", "A&R", "Audiovisual", "Financeiro"],
    recommendedPhases: ["Setup de catálogo", "Pré-save e teaser", "Lançamento", "Pós-lançamento"],
    commonRisks: [
      "Janela de pitch para playlists perdida",
      "Assets visuais fora do prazo",
      "Metadados inconsistentes entre DSPs",
    ],
  },
  {
    match: "publishing",
    label: "Administração de Obra (Editora)",
    typicalDepartments: ["Jurídico", "Publishing", "Financeiro", "Cadastro"],
    recommendedPhases: ["Coleta de splits", "Registro de obra", "Filiação a coletivas", "Monitoramento de royalties"],
    commonRisks: [
      "Splits de composição não acordados entre coautores",
      "Obra não registrada antes da exploração",
      "Divergência de cadastro no ECAD",
    ],
  },
  {
    match: "sync",
    label: "Sincronização / Licenciamento (Editora)",
    typicalDepartments: ["Publishing", "Jurídico", "Comercial", "Financeiro"],
    recommendedPhases: ["Curadoria de catálogo", "Pitch de sync", "Negociação e licença", "Faturamento"],
    commonRisks: [
      "Cadeia de direitos incompleta (clearance)",
      "Prazo de aprovação do licenciante",
    ],
  },
  {
    match: "audiovisual",
    label: "Produção Audiovisual (Produtora)",
    typicalDepartments: ["Pré-produção", "Captação", "Pós-produção", "Logística", "Financeiro"],
    recommendedPhases: ["Pré-produção", "Captação", "Pós-produção", "Entrega"],
    commonRisks: [
      "Janela climática para externas",
      "Atraso na pós-produção/aprovações",
      "Liberação de imagem e direitos",
    ],
  },
  {
    match: "show",
    label: "Show / Turnê (Produtora)",
    typicalDepartments: ["Produção", "Logística", "Técnica", "Comercial", "Financeiro"],
    recommendedPhases: ["Planejamento", "Contratação e rider", "Logística", "Execução", "Acerto"],
    commonRisks: [
      "Rider técnico não atendido pela casa",
      "Logística de equipe e equipamento",
      "Bilheteria abaixo do break-even",
    ],
  },
];

export function getProjectPlanningTemplate(projectType: string): ProjectPlanningTemplate | undefined {
  const needle = projectType.toLowerCase();
  return PROJECT_PLANNING_TEMPLATES.find((t) => needle.includes(t.match));
}
