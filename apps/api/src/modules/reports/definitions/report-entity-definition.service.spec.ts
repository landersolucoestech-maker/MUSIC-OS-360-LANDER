import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from './report-entity-definition.service';
import { tryGetFieldLabelPtBr } from '../i18n/field-labels.pt-br';

/** FASE 2.1 — contratos por entidade reportável, ancorados na metadata real. */
describe('ReportEntityDefinitionService — contratos', () => {
  const metadata = new EntityMetadataService();
  const inv = metadata.scan();
  const reportable = inv.entities.filter((e) => e.reportable);
  const defs = new ReportEntityDefinitionService(metadata).getDefinitions();
  const colsByTable = new Map(inv.entities.map((e) => [e.tableName, new Set(e.columns.map((c) => c.name))]));

  it('toda entidade reportável efetiva possui ReportEntityDefinition', () => {
    expect(defs.length).toBe(reportable.length);
    for (const e of reportable) {
      expect(defs.find((d) => d.tableName === e.tableName)).toBeDefined();
    }
  });

  it('toda coluna declarada no contrato existe na metadata TypeORM', () => {
    const offenders: string[] = [];
    for (const d of defs) {
      const real = colsByTable.get(d.tableName)!;
      const all = [
        d.identityColumn, d.displayColumn, d.dateColumn,
        ...d.exportableColumns, ...d.importableColumns, ...d.filterableColumns,
        ...d.sortableColumns, ...d.searchableColumns, ...d.sensitiveColumns,
        ...d.requiredImportColumns,
      ];
      for (const col of all) if (!real.has(col)) offenders.push(`${d.tableName}.${col}`);
    }
    expect(offenders).toEqual([]);
  });

  it('toda coluna visível do contrato possui label pt-BR', () => {
    const offenders: string[] = [];
    for (const d of defs) {
      const visible = new Set([
        d.identityColumn, d.displayColumn, d.dateColumn,
        ...d.exportableColumns, ...d.importableColumns, ...d.filterableColumns,
        ...d.sortableColumns, ...d.searchableColumns,
      ]);
      for (const col of visible) if (tryGetFieldLabelPtBr(col) === null) offenders.push(`${d.tableName}.${col}`);
    }
    expect(offenders).toEqual([]);
  });

  it('colunas sensíveis NUNCA aparecem como exportáveis/importáveis', () => {
    const offenders: string[] = [];
    for (const d of defs) {
      for (const s of d.sensitiveColumns) {
        if (d.exportableColumns.includes(s) || d.importableColumns.includes(s)) {
          offenders.push(`${d.tableName}.${s}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('identityColumn, displayColumn e dateColumn existem e têm label', () => {
    for (const d of defs) {
      const real = colsByTable.get(d.tableName)!;
      for (const col of [d.identityColumn, d.displayColumn, d.dateColumn]) {
        expect(real.has(col)).toBe(true);
        expect(tryGetFieldLabelPtBr(col)).not.toBeNull();
      }
    }
  });

  it('contratos núcleo têm forma coerente', () => {
    const artists = defs.find((d) => d.tableName === 'artists')!;
    expect(artists.supportsExport).toBe(true);
    expect(artists.exportableColumns.length).toBeGreaterThan(0);
    expect(artists.exportableColumns).not.toContain('id');
    expect(artists.exportableColumns).not.toContain('tenant_id');
    expect(artists.requiredImportColumns.length).toBeGreaterThan(0);
  });
});
