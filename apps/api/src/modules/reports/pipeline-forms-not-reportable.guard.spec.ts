/**
 * pipeline-forms-not-reportable.guard.spec.ts  ·  Parte 87 (atualizado Parte 88)
 *
 * Guarda permanente: "forms" (Formulários), "pipelines" (Pipelines) e
 * "pipeline_opportunities" (Oportunidades de Pipeline) nunca podem aparecer
 * na Central de Relatórios — nem no inventário de entidades, nem em
 * /definitions, nem via export/import/template diretos. Continuam existindo
 * normalmente em seus próprios módulos, apenas fora do escopo de Relatórios.
 * Parte 88: pipeline_opportunities removida explicitamente do registry
 * (ainda sem contrato explícito auditado) — deixou de ser exceção.
 */
import { EntityMetadataService } from './entity-metadata.service';
import { ReportEntityDefinitionService } from './definitions/report-entity-definition.service';
import { ExportEngineService } from './export/export-engine.service';
import { ImportEngineService } from './import/import-engine.service';
import { ExportQueryBuilderService } from './export/export-query-builder.service';
import { ExportFormatService } from './export/export-format.service';
import { ImportParserService } from './import/import-parser.service';
import { ImportMapperService } from './import/import-mapper.service';
import { ImportValidationService } from './import/import-validation.service';
import { ReportTableGuardService } from './report-table-guard.service';

const BLOCKED_TABLES = ['forms', 'pipelines', 'pipeline_opportunities'];

describe('Guarda permanente: forms/pipelines nunca reportáveis (Parte 87)', () => {
  const metadata = new EntityMetadataService();
  const inv = metadata.scan();

  it.each(BLOCKED_TABLES)('%s: category NOT_REPORTABLE e reportable=false no inventário', (table) => {
    const entity = inv.entities.find((e) => e.tableName === table);
    expect(entity).toBeDefined();
    expect(entity!.reportable).toBe(false);
    expect(entity!.category).toBe('NOT_REPORTABLE');
  });

  it.each(BLOCKED_TABLES)('%s: ausente de ReportEntityDefinitionService.getDefinitions()', (table) => {
    const defs = new ReportEntityDefinitionService(metadata).getDefinitions();
    expect(defs.find((d) => d.tableName === table)).toBeUndefined();
  });

  describe.each(BLOCKED_TABLES)('%s: export/import diretos retornam REPORT_ENTITY_NOT_AVAILABLE', (table) => {
    const tableGuard = { assertTableUsable: jest.fn().mockResolvedValue(undefined) } as unknown as ReportTableGuardService;
    const definitions = new ReportEntityDefinitionService(metadata);

    it('export() rejeita com REPORT_ENTITY_NOT_AVAILABLE', async () => {
      const engine = new ExportEngineService(
        { query: jest.fn() } as never,
        metadata,
        definitions,
        new ExportQueryBuilderService(),
        new ExportFormatService(),
        { record: jest.fn() } as never,
        tableGuard,
        { decryptNullable: jest.fn() } as never,
      );
      await expect(
        engine.export(table, { format: 'xlsx', page: 1, pageSize: 10 }, 'tenant-1', 'user-1'),
      ).rejects.toMatchObject({ response: { error: 'REPORT_ENTITY_NOT_AVAILABLE' } });
    });

    it('buildTemplate() rejeita com REPORT_ENTITY_NOT_AVAILABLE', async () => {
      const engine = new ImportEngineService(
        metadata,
        definitions,
        new ImportParserService(),
        new ImportMapperService(),
        new ImportValidationService(),
        tableGuard,
        new ExportFormatService(),
      );
      await expect(engine.buildTemplate(table, 'tenant-1')).rejects.toMatchObject({
        response: { error: 'REPORT_ENTITY_NOT_AVAILABLE' },
      });
    });
  });
});
