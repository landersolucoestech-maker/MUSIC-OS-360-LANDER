/**
 * modules/reports/i18n/entity-labels.pt-br.ts
 *
 * Camada ÚNICA de labels pt-BR por ENTIDADE (tabela) da Central de Relatórios —
 * complemento de field-labels.pt-br.ts (que cobre colunas).
 *
 * Mesma regra absoluta: chave técnica é infraestrutura, label é produto. O
 * frontend NUNCA deriva texto de tableName; ele exibe o `label` retornado pela
 * API. Toda tabela REPORTABLE DEVE ter entrada aqui — a ausência é sinalizada
 * como risco `UNTRANSLATED_ENTITY` no inventário (nunca mascarada).
 */

/** Dicionário canônico (tableName → label pt-BR) das entidades reportáveis. */
export const ENTITY_LABELS_PT_BR: Readonly<Record<string, string>> = {
  artists: 'Artistas',
  works: 'Obras',
  phonograms: 'Fonogramas',
  contracts: 'Contratos',
  contract_templates: 'Modelos de contrato',
  transactions: 'Transações financeiras',
  invoices: 'Faturas',
  clients: 'Clientes',
  leads: 'Leads',
  lead_interactions: 'Interações de leads',
  campaigns: 'Campanhas',
  briefings: 'Briefings',
  events: 'Eventos',
  projects: 'Projetos',
  releases: 'Lançamentos',
  shares: 'Participações',
  takedowns: 'Takedowns',
  support_tickets: 'Chamados de suporte',
  ecad_reports: 'Relatórios ECAD',
  licenses: 'Licenças',
  inventory_items: 'Itens de inventário',
  content_detections: 'Detecções de conteúdo',
  forms: 'Formulários',
  conversations: 'Conversas',
  operational_tasks: 'Tarefas operacionais',
  financial_categories: 'Categorias financeiras',
  financial_rules: 'Regras financeiras',
  employees: 'Colaboradores',
  payroll_entries: 'Folha de pagamento',
  leave_requests: 'Solicitações de ausência',
  artist_goals: 'Metas de artistas',
  assets: 'Ativos digitais',
  rights_holders: 'Titulares de direitos',
  marketing_projects: 'Projetos de marketing',
  marketing_strategies: 'Estratégias de marketing',
  marketing_assets: 'Ativos de marketing',
  marketing_content_posts: 'Publicações de conteúdo',
  marketing_tasks: 'Tarefas de marketing',
  audiovisual_projects: 'Projetos audiovisuais',
  audiovisual_briefings: 'Briefings audiovisuais',
  audiovisual_tasks: 'Tarefas audiovisuais',
  audiovisual_assets: 'Ativos audiovisuais',
  audiovisual_deliverables: 'Entregáveis audiovisuais',
  pipelines: 'Pipelines',
  pipeline_opportunities: 'Oportunidades de pipeline',
  society_submissions: 'Submissões a sociedades',
  society_accounts: 'Contas de sociedades',
};

/**
 * Resolve o label pt-BR de uma entidade. `null` quando não traduzida —
 * o chamador decide sinalizar (risco) ou cair no tableName, nunca inventar.
 */
export function resolveEntityLabel(tableName: string): string | null {
  return ENTITY_LABELS_PT_BR[tableName] ?? null;
}
