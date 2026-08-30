/**
 * report-module-registry.spec.ts  ·  Parte 89, Bloco 31
 *
 * Guarda permanente: a Central de Relatórios deve listar EXATAMENTE os 22
 * módulos autorizados, nesta ordem — nem um a mais, nem um a menos, nunca
 * fora de ordem.
 */
import { EntityMetadataService } from './entity-metadata.service';
import { REPORT_MODULE_ORDERED_LABELS, REPORT_MODULE_REGISTRY } from './report-module-registry';

const EXPECTED_ORDERED_LABELS = [
  'Artistas',
  'Projetos',
  'Obras',
  'Fonogramas',
  'Monitoramento',
  'Licenciamento',
  'Takedowns',
  'Distribuição',
  'Shares',
  'Contratos',
  'Projetos Audiovisuais',
  'Transações Financeiras',
  'Contabilidade',
  'Nota Fiscal',
  'Agenda',
  'Inventário',
  'Contatos',
  'Leads',
  'RH',
  'Tarefas',
  'Calendário de Conteúdo',
  'Briefing',
];

describe('REPORT_MODULE_REGISTRY — lista fechada e ordem exata (Bloco 31)', () => {
  it('possui exatamente 22 itens', () => {
    expect(REPORT_MODULE_REGISTRY.length).toBe(22);
  });

  it('a ordem exata das labels é a lista autorizada pelo usuário, sem faltar nem sobrar item', () => {
    expect(REPORT_MODULE_ORDERED_LABELS).toEqual(EXPECTED_ORDERED_LABELS);
  });

  it('nenhuma chave duplicada no registry', () => {
    const keys = REPORT_MODULE_REGISTRY.map((e) => e.tableName);
    expect(new Set(keys).size).toBe(keys.length);
  });

  describe('inventário real (EntityMetadataService) reflete o registry', () => {
    const inv = new EntityMetadataService().scan();
    const reportable = inv.entities.filter((e) => e.reportable);

    it('exatamente os 22 tableNames do registry são reportable=true — nada a mais, nada a menos', () => {
      const reportableTables = reportable.map((e) => e.tableName).sort();
      const registryTables = REPORT_MODULE_REGISTRY.map((e) => e.tableName).sort();
      expect(reportableTables).toEqual(registryTables);
    });

    it('a ordem das entidades reportáveis no inventário segue exatamente a ordem do registry', () => {
      const orderedLabels = reportable.map((e) => e.label);
      expect(orderedLabels).toEqual(EXPECTED_ORDERED_LABELS);
    });

    it('"pipelines" nunca é reportável', () => {
      for (const table of ['pipelines']) {
        const e = inv.entities.find((x) => x.tableName === table);
        expect(e?.reportable).toBe(false);
      }
    });

    it('entidades explicitamente removidas da lista autorizada não são reportáveis', () => {
      const explicitlyRemoved = [
        'artist_goals', 'assets', 'audiovisual_assets', 'audiovisual_deliverables',
        'audiovisual_tasks', 'lead_interactions', 'marketing_assets',
        'marketing_projects', 'marketing_strategies', 'pipeline_opportunities',
        'support_tickets', 'contract_templates', 'ecad_reports', 'contract_service_types',
        'operational_tasks',
      ];
      for (const table of explicitlyRemoved) {
        const e = inv.entities.find((x) => x.tableName === table);
        if (!e) continue;
        expect(e.reportable).toBe(false);
      }
    });
  });
});
