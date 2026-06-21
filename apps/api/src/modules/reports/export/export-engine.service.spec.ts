import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExportEngineService } from './export-engine.service';
import { ExportQueryBuilderService } from './export-query-builder.service';
import { ExportFormatService } from './export-format.service';
import { EntityCategory } from '../entity-metadata.types';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';

const DEF: ReportEntityDefinition = {
  entityName: 'ArtistEntity', tableName: 'artists', category: EntityCategory.REPORTABLE,
  identityColumn: 'nome_artistico', displayColumn: 'nome_artistico', dateColumn: 'created_at',
  exportableColumns: ['nome_artistico', 'email', 'status'],
  importableColumns: ['nome_artistico'], filterableColumns: ['status'],
  sortableColumns: ['nome_artistico', 'created_at'], searchableColumns: ['nome_artistico'],
  sensitiveColumns: ['cpf_encrypted'], requiredImportColumns: ['nome_artistico'],
  supportsExport: true, supportsImport: true,
};

function makeEngine(opts: {
  reportable?: boolean; hasEntity?: boolean; def?: ReportEntityDefinition | null; rows?: Record<string, unknown>[];
} = {}) {
  const rows = opts.rows ?? [{ nome_artistico: 'A', email: 'a@x.com', status: 'ativo' }];
  const report = opts.hasEntity === false ? undefined : {
    tableName: 'artists', reportable: opts.reportable ?? true, hasSoftDelete: true,
    columns: [{ name: 'deleted_at', isDeletedAt: true }],
  };
  const metadata = { scan: () => ({ entities: report ? [report] : [] }) } as any;
  const definitions = { getDefinition: () => (opts.def === undefined ? DEF : opts.def) } as any;
  const ds = { query: jest.fn().mockResolvedValue(rows) } as any;
  const audit = { record: jest.fn() } as any;
  const tableGuard = { assertTableUsable: jest.fn().mockResolvedValue(undefined) } as any;
  const engine = new ExportEngineService(ds, metadata, definitions, new ExportQueryBuilderService(), new ExportFormatService(), audit, tableGuard);
  return { engine, ds, audit };
}

const params = (p: any = {}) => ({ format: 'json', page: 1, pageSize: 100, ...p });

describe('ExportEngineService — orquestração entity-driven', () => {
  it('exporta JSON com isolamento por tenant e audita', async () => {
    const { engine, ds, audit } = makeEngine();
    const res = await engine.export('artists', params(), 'tenant-1', 'user-1');
    expect(res.format).toBe('json');
    expect((res.body as any).data.length).toBe(1);
    // tenant do request é o $1 da query (cross-tenant impossível via querystring)
    expect(ds.query.mock.calls[0][1][0]).toBe('tenant-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'artists', status: 'success', recordCount: 1, tenantId: 'tenant-1' }));
  });

  it('CSV/XLSX retornam cabeçalho pt-BR e content-type correto', async () => {
    const { engine } = makeEngine();
    const csv = await engine.export('artists', params({ format: 'csv' }), 't', 'u');
    expect(csv.contentType).toContain('text/csv');
    expect(String(csv.body)).toContain('Nome artístico');
    expect(String(csv.body)).not.toContain('nome_artistico');
    const xlsx = await engine.export('artists', params({ format: 'xlsx' }), 't', 'u');
    expect(xlsx.contentType).toContain('spreadsheetml');
    expect(Buffer.isBuffer(xlsx.body)).toBe(true);
  });

  it('entidade inexistente → 404', async () => {
    const { engine } = makeEngine({ hasEntity: false });
    await expect(engine.export('nope', params(), 't', 'u')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('entidade não reportável → 404', async () => {
    const { engine } = makeEngine({ reportable: false });
    await expect(engine.export('artists', params(), 't', 'u')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('contrato sem supportsExport → 400', async () => {
    const { engine } = makeEngine({ def: { ...DEF, supportsExport: false } });
    await expect(engine.export('artists', params(), 't', 'u')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sem tenant → 403', async () => {
    const { engine } = makeEngine();
    await expect(engine.export('artists', params(), undefined, 'u')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tentativa de exportar coluna sensível → 400', async () => {
    const { engine } = makeEngine();
    await expect(engine.export('artists', params({ columns: ['cpf_encrypted'] }), 't', 'u')).rejects.toBeInstanceOf(BadRequestException);
  });
});
