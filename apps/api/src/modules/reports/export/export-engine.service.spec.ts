import { BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import * as XLSX from 'xlsx';
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
  // Double de EncryptionService: identidade (o spec injeta plaintext nas rows).
  const encryption = { decryptNullable: jest.fn((v: string | null) => v) } as any;
  const engine = new ExportEngineService(ds, metadata, definitions, new ExportQueryBuilderService(), new ExportFormatService(), audit, tableGuard, encryption);
  return { engine, ds, audit };
}

const params = (p: any = {}) => ({ format: 'xlsx', page: 1, pageSize: 100, ...p });

describe('ExportEngineService — orquestração entity-driven', () => {
  it('exporta XLSX com isolamento por tenant e audita', async () => {
    const { engine, ds, audit } = makeEngine();
    const res = await engine.export('artists', params(), 'tenant-1', 'user-1');
    expect(res.format).toBe('xlsx');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    // tenant do request é o $1 da query (cross-tenant impossível via querystring)
    expect(ds.query.mock.calls[0][1][0]).toBe('tenant-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'artists', status: 'success', recordCount: 1, tenantId: 'tenant-1' }));
  });

  it('rejeita formato não suportado (Parte 81 — nenhum formato além de xlsx é aceito) com UNSUPPORTED_EXPORT_FORMAT', async () => {
    const { engine } = makeEngine();
    try {
      await engine.export('artists', params({ format: 'other' as any }), 't', 'u');
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({ error: 'UNSUPPORTED_EXPORT_FORMAT' });
    }
  });

  it('XLSX retorna cabeçalho pt-BR e content-type correto', async () => {
    const { engine } = makeEngine();
    const xlsx = await engine.export('artists', params({ format: 'xlsx' }), 't', 'u');
    expect(xlsx.contentType).toContain('spreadsheetml');
    expect(xlsx.filename).toMatch(/\.xlsx$/);
    expect(Buffer.isBuffer(xlsx.body)).toBe(true);
    const wb = XLSX.read(xlsx.body as Buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    expect(rows[0]).toContain('Nome artístico');
    expect(rows[0]).not.toContain('nome_artistico');
  });

  it('entidade inexistente/não registrada para relatórios → 422', async () => {
    const { engine } = makeEngine({ hasEntity: false });
    await expect(engine.export('nope', params(), 't', 'u')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('entidade não exportável pela Central de Relatórios → 422', async () => {
    const { engine } = makeEngine({ reportable: false });
    await expect(engine.export('artists', params(), 't', 'u')).rejects.toBeInstanceOf(UnprocessableEntityException);
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

describe('ExportEngineService — campo computed (projects.musicas, Parte 86)', () => {
  const PROJECTS_DEF: ReportEntityDefinition = {
    entityName: 'ProjectEntity', tableName: 'projects', category: EntityCategory.REPORTABLE,
    identityColumn: 'titulo', displayColumn: 'titulo', dateColumn: 'created_at',
    exportableColumns: ['tipo', 'titulo', 'musicas', 'observacoes', 'status'],
    importableColumns: ['tipo', 'titulo', 'musicas', 'observacoes', 'status'],
    filterableColumns: ['status'], sortableColumns: ['titulo', 'created_at'], searchableColumns: ['titulo'],
    sensitiveColumns: [], requiredImportColumns: ['titulo'], supportsExport: true, supportsImport: true,
  };

  it('resolve musicas via resolver dedicado, serializa como JSON e remove a coluna interna de correlação', async () => {
    const mainRows = [
      { tipo: 'ep', titulo: 'Meu EP', observacoes: 'obs', status: 'em_andamento', __row_id: 'proj-1' },
    ];
    const ds = {
      query: jest.fn()
        .mockResolvedValueOnce(mainRows) // SELECT principal de "projects"
        .mockResolvedValueOnce([{        // project_tracks
          id: 'track-1', project_id: 'proj-1', nome: 'Faixa', solo_feat: 'solo',
          original_remix: 'original', instrumental: 'nao', duracao_min: '3', duracao_seg: '0',
          genero: 'pop', idioma: 'portugues', letra: null, audio_url: null,
        }])
        .mockResolvedValueOnce([]),      // project_track_participants
    } as any;
    const metadata = { scan: () => ({ entities: [{ tableName: 'projects', reportable: true, hasSoftDelete: false, columns: [] }] }) } as any;
    const definitions = { getDefinition: () => PROJECTS_DEF } as any;
    const audit = { record: jest.fn() } as any;
    const tableGuard = { assertTableUsable: jest.fn().mockResolvedValue(undefined) } as any;
    const encryption = { decryptNullable: jest.fn() } as any;
    const engine = new ExportEngineService(ds, metadata, definitions, new ExportQueryBuilderService(), new ExportFormatService(), audit, tableGuard, encryption);

    const res = await engine.export('projects', params(), 'tenant-1', 'user-1');

    // SQL principal seleciona __row_id internamente para correlação
    expect(ds.query.mock.calls[0][0]).toContain('AS "__row_id"');

    const wb = XLSX.read(res.body as Buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    expect(rows[0]).not.toContain('__row_id'); // coluna interna nunca vaza pro arquivo

    const musicasColIdx = (rows[0] as string[]).indexOf('Músicas');
    expect(musicasColIdx).toBeGreaterThanOrEqual(0);
    const parsed = JSON.parse((rows[1] as string[])[musicasColIdx]);
    expect(parsed).toEqual([{
      nome: 'Faixa', soloFeat: 'solo', originalRemix: 'original', instrumental: 'nao',
      duracaoMin: '3', duracaoSeg: '0', genero: 'pop', idioma: 'portugues', letra: null,
      audioUrl: null, compositores: [], interpretes: [], produtores: [],
    }]);
  });
});
