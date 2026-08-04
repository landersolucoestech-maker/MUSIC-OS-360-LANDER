/**
 * modules/reports/report-module-registry.ts  ·  Parte 89
 *
 * Registro FECHADO e EXPLÍCITO dos módulos autorizados na Central de
 * Relatórios. Esta lista — chave física (tableName), label exibida e ordem —
 * é a ÚNICA fonte da verdade sobre o que pode aparecer em Relatórios.
 *
 * Nenhuma entidade fora desta lista pode se tornar reportável, mesmo que
 * exista fisicamente no banco e mesmo que já tenha sido reportável em uma
 * Parte anterior. Crescer esta lista é uma decisão explícita do usuário, não
 * uma dedução automática a partir de metadata TypeORM.
 *
 * `accounting_summary` (Contabilidade) não corresponde a uma tabela física —
 * é um relatório computado (agregação sobre `transactions`), ver
 * `computed-reports/accounting-summary.report.ts`.
 */

export interface ReportModuleRegistryEntry {
  /** Chave física (tableName) ou chave sintética de relatório computado. */
  readonly tableName: string;
  /** Label exibida em Relatórios — fonte única, não deriva de i18n genérico. */
  readonly label: string;
  /** Ordem de exibição na Central de Relatórios (Bloco 2/31). */
  readonly order: number;
  /** true quando não corresponde a uma tabela física (relatório computado). */
  readonly computed?: boolean;
}

export const ACCOUNTING_SUMMARY_TABLE_NAME = 'accounting_summary';

export const REPORT_MODULE_REGISTRY: readonly ReportModuleRegistryEntry[] = [
  { tableName: 'artists', label: 'Artistas', order: 1 },
  { tableName: 'projects', label: 'Projetos', order: 2 },
  { tableName: 'works', label: 'Obras', order: 3 },
  { tableName: 'phonograms', label: 'Fonogramas', order: 4 },
  { tableName: 'content_detections', label: 'Monitoramento', order: 5 },
  { tableName: 'licenses', label: 'Licenciamento', order: 6 },
  { tableName: 'takedowns', label: 'Takedowns', order: 7 },
  { tableName: 'releases', label: 'Distribuição', order: 8 },
  { tableName: 'shares', label: 'Shares', order: 9 },
  { tableName: 'contracts', label: 'Contratos', order: 10 },
  { tableName: 'audiovisual_projects', label: 'Projetos Audiovisuais', order: 11 },
  { tableName: 'transactions', label: 'Transações Financeiras', order: 12 },
  { tableName: ACCOUNTING_SUMMARY_TABLE_NAME, label: 'Contabilidade', order: 13, computed: true },
  { tableName: 'invoices', label: 'Nota Fiscal', order: 14 },
  { tableName: 'events', label: 'Agenda', order: 15 },
  { tableName: 'inventory_items', label: 'Inventário', order: 16 },
  { tableName: 'clients', label: 'CRM — Contatos', order: 17 },
  { tableName: 'leads', label: 'CRM — Leads', order: 18 },
  { tableName: 'employees', label: 'RH', order: 19 },
  // "Tarefas" (Bloco 26): a única tela real de Criar/Editar/Visualizar de
  // tarefas no produto é Marketing > Tarefas (marketing_tasks). A tabela
  // operational_tasks não tem controller, DTO nem tela alguma — é escrita
  // apenas por workflows automáticos internos, sem formulário para auditar
  // (Bloco 4 exige campos de um formulário real; não há um aqui).
  { tableName: 'marketing_tasks', label: 'Tarefas', order: 20 },
  { tableName: 'marketing_content_posts', label: 'Calendário de Conteúdo', order: 21 },
  { tableName: 'briefings', label: 'Briefing', order: 22 },
] as const;

export const REPORT_MODULE_REGISTRY_BY_TABLE: ReadonlyMap<string, ReportModuleRegistryEntry> =
  new Map(REPORT_MODULE_REGISTRY.map((e) => [e.tableName, e]));

export const REPORT_MODULE_TABLE_NAMES: ReadonlySet<string> =
  new Set(REPORT_MODULE_REGISTRY.map((e) => e.tableName));

/** Labels na ordem exata exigida (Bloco 31) — usado pelo teste de registry. */
export const REPORT_MODULE_ORDERED_LABELS: readonly string[] =
  REPORT_MODULE_REGISTRY.slice().sort((a, b) => a.order - b.order).map((e) => e.label);
