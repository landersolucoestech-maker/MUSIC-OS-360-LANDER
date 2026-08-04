import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from './report-entity-definition.service';
import { tryGetFieldLabelPtBr } from '../i18n/field-labels.pt-br';
import { EntityCategory } from '../entity-metadata.types';
import {
  contractEncryptedFields,
  contractMetadataFields,
  contractRefFields,
  getReportFormContract,
} from '../form-contracts/report-form-contracts';

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
      // Coluna do contrato central pode ser: física, cifrada (coluna *_encrypted
      // existente), residente em metadata jsonb (a tabela precisa ter metadata),
      // ou 'ref' (aponta para uma coluna física real, ex.: id — Parte 87).
      const contract = getReportFormContract(d.tableName);
      const encrypted = contract ? contractEncryptedFields(contract) : {};
      const metaFields = contract ? contractMetadataFields(contract) : new Set<string>();
      const refFields = contract ? contractRefFields(contract) : {};
      for (const col of all) {
        const backedByContract =
          (encrypted[col] !== undefined && real.has(encrypted[col])) ||
          (metaFields.has(col) && real.has('metadata')) ||
          (refFields[col] !== undefined && real.has(refFields[col]));
        if (!real.has(col) && !backedByContract) offenders.push(`${d.tableName}.${col}`);
      }
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

  it('importação deriva SEMPRE do mesmo schema da exportação (nenhuma entidade foge da regra)', () => {
    const offenders: string[] = [];
    for (const d of defs) {
      for (const col of d.importableColumns) {
        if (!d.exportableColumns.includes(col)) offenders.push(`${d.tableName}.${col}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('nenhuma entidade reportável expõe relacionamento completo como coluna de export/import', () => {
    const offenders: string[] = [];
    for (const e of reportable) {
      const d = defs.find((x) => x.tableName === e.tableName)!;
      for (const rel of e.relations) {
        if (d.exportableColumns.includes(rel.property) || d.importableColumns.includes(rel.property)) {
          offenders.push(`${e.tableName}.${rel.property}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('contratos núcleo têm forma coerente', () => {
    const artists = defs.find((d) => d.tableName === 'artists')!;
    expect(artists.supportsExport).toBe(true);
    expect(artists.exportableColumns.length).toBeGreaterThan(0);
    expect(artists.exportableColumns).not.toContain('id');
    expect(artists.exportableColumns).not.toContain('tenant_id');
    expect(artists.requiredImportColumns.length).toBeGreaterThan(0);
  });

  describe('exclusão genérica de campos fora do formulário (todas as entidades, sem exceção)', () => {
    function defsFor(columns: Array<Partial<import('../entity-metadata.types').ColumnMeta> & { name: string }>) {
      const fakeMetadata = {
        scan: () => ({
          entities: [{
            entityName: 'FakeEntity', tableName: 'fake_table', category: EntityCategory.REPORTABLE,
            reportable: true, hasTenantId: true, hasSoftDelete: false, hasTimestamps: false, risks: [],
            columns: columns.map((c) => ({
              label: null, type: 'varchar', nullable: true, primary: false, generated: false,
              isEnum: false, isCreatedAt: false, isUpdatedAt: false, isDeletedAt: false, isTenantId: false,
              ...c,
            })),
          }],
        }),
      } as unknown as EntityMetadataService;
      return new ReportEntityDefinitionService(fakeMetadata).getDefinitions();
    }

    it('coluna tipo simple-array (lista serializada por vírgula) nunca é exportável/importável', () => {
      const [def] = defsFor([
        { name: 'nome', type: 'varchar' },
        { name: 'tags', type: 'simple-array' },
      ]);
      expect(def.exportableColumns).not.toContain('tags');
      expect(def.importableColumns).not.toContain('tags');
    });

    it('coluna com nome sugerindo blob técnico (html/raw/payload/snapshot/xml/dump/debug) é excluída', () => {
      const [def] = defsFor([
        { name: 'nome', type: 'varchar' },
        { name: 'conteudo_html', type: 'text' },
        { name: 'raw_response', type: 'text' },
        { name: 'sync_payload', type: 'text' },
        { name: 'audit_snapshot', type: 'text' },
        { name: 'import_xml', type: 'text' },
        { name: 'debug_trace', type: 'text' },
        { name: 'legacy_dump', type: 'text' },
      ]);
      for (const col of [
        'conteudo_html', 'raw_response', 'sync_payload', 'audit_snapshot',
        'import_xml', 'debug_trace', 'legacy_dump',
      ]) {
        expect(def.exportableColumns).not.toContain(col);
        expect(def.importableColumns).not.toContain(col);
      }
    });

    it('coluna tipo json/jsonb (qualquer nome) é sempre excluída', () => {
      const [def] = defsFor([
        { name: 'nome', type: 'varchar' },
        { name: 'preferencias', type: 'json' },
        { name: 'configuracoes', type: 'jsonb' },
      ]);
      expect(def.exportableColumns).not.toContain('preferencias');
      expect(def.exportableColumns).not.toContain('configuracoes');
    });

    it('anotação interna (notas_internas/observacoes_internas) é excluída, mas observação de formulário permanece', () => {
      const [def] = defsFor([
        { name: 'nome', type: 'varchar' },
        { name: 'observacoes', type: 'text' },
        { name: 'notas_internas', type: 'text' },
      ]);
      expect(def.exportableColumns).toContain('observacoes');
      expect(def.exportableColumns).not.toContain('notas_internas');
    });

    it('campo de texto longo legítimo do formulário (ex.: corpo de contrato) permanece exportável', () => {
      const [def] = defsFor([
        { name: 'titulo', type: 'varchar' },
        { name: 'conteudo', type: 'text' },
      ]);
      expect(def.exportableColumns).toContain('conteudo');
      expect(def.importableColumns).toContain('conteudo');
    });
  });
});
