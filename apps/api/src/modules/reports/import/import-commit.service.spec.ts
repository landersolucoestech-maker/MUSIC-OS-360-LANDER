import { ForbiddenException } from '@nestjs/common';
import { ImportCommitService } from './import-commit.service';
import { EntityCategory } from '../entity-metadata.types';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import type { ImportValidationResult } from './import.types';

const DEF: ReportEntityDefinition = {
  entityName: 'ArtistEntity', tableName: 'artists', category: EntityCategory.REPORTABLE,
  identityColumn: 'nome_artistico', displayColumn: 'nome_artistico', dateColumn: 'created_at',
  exportableColumns: ['nome_artistico'], importableColumns: ['nome_artistico'],
  filterableColumns: [], sortableColumns: ['nome_artistico'], searchableColumns: ['nome_artistico'],
  sensitiveColumns: ['cpf_encrypted'], requiredImportColumns: ['nome_artistico'],
  supportsExport: true, supportsImport: true,
};

function validResult(rows = 2): ImportValidationResult {
  return {
    entity: 'artists', supportsImport: true, mapping: {}, unknownColumns: [], ignoredColumns: [],
    totalRows: rows, validRows: rows, invalidRows: 0,
    rows: Array.from({ length: rows }, (_, i) => ({ index: i, data: { nome_artistico: `A${i}` }, valid: true, errors: [], warnings: [] })),
    errors: [], warnings: [],
  };
}

function makeQR(queryImpl: (sql: string, params: unknown[]) => unknown) {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn((sql: string, params: unknown[]) => Promise.resolve(queryImpl(sql, params))),
    isTransactionActive: true,
  };
}

function makeSvc(opts: { validation?: ImportValidationResult; def?: ReportEntityDefinition; queryImpl?: (sql: string, p: unknown[]) => unknown } = {}) {
  const qr = makeQR(opts.queryImpl ?? (() => []));
  const ds = { createQueryRunner: () => qr } as any;
  const engine = { validateFile: jest.fn().mockReturnValue(opts.validation ?? validResult()) } as any;
  const definitions = { getDefinition: () => (opts.def ?? DEF) } as any;
  const audit = { record: jest.fn() } as any;
  const encryption = { encryptNullable: jest.fn((v: string | null) => (v == null ? null : `enc:${v}`)) } as any;
  const svc = new ImportCommitService(ds, engine, definitions, audit, encryption);
  return { svc, qr, engine, audit, encryption };
}

const file = { filename: 'artists.xlsx', content: Buffer.from('Nome artístico\nA0\nA1') };

describe('ImportCommitService — commit transacional (FASE 2.3B)', () => {
  it('import válido → COMMIT atômico, insere whitelist + tenant forçado, audita', async () => {
    const { svc, qr, engine, audit } = makeSvc();
    const res = await svc.commit('artists', file, 'tenant-1', 'user-1');

    expect(engine.validateFile).toHaveBeenCalled();            // revalidação
    expect(qr.startTransaction).toHaveBeenCalled();
    expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    expect(qr.rollbackTransaction).not.toHaveBeenCalled();
    expect(res.importedRows).toBe(2);
    expect(res.failedRows).toBe(0);
    // INSERT com tenant_id forçado = tenant atual
    const insert = qr.query.mock.calls.find((c: any[]) => String(c[0]).startsWith('INSERT')) as [string, unknown] | undefined;
    expect(insert?.[0]).toContain('"tenant_id"');
    expect(insert?.[1]).toContain('tenant-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'committed', successCount: 2 }));
  });

  it('validação inválida → NÃO abre transação, 0 persistido', async () => {
    const bad = validResult(1);
    bad.invalidRows = 1; bad.validRows = 0; bad.rows[0].valid = false; bad.rows[0].errors = [{ column: 'nome_artistico', message: 'campo obrigatório vazio' }];
    const { svc, qr } = makeSvc({ validation: bad });
    const res = await svc.commit('artists', file, 't', 'u');
    expect(qr.startTransaction).not.toHaveBeenCalled();
    expect(res.importedRows).toBe(0);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('duplicado no banco → ROLLBACK total (create-only, parcial proibido)', async () => {
    const { svc, qr, audit } = makeSvc({ queryImpl: (sql) => (sql.startsWith('SELECT 1') ? [{}] : []) });
    const res = await svc.commit('artists', file, 't', 'u');
    expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).not.toHaveBeenCalled();
    expect(res.importedRows).toBe(0);
    expect(res.errors.some((e) => /já existe/i.test(e))).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'rolledback' }));
  });

  it('FK inválida → ROLLBACK', async () => {
    const def: ReportEntityDefinition = { ...DEF, importableColumns: ['nome_artistico', 'cliente_id'] };
    const v = validResult(1); v.rows[0].data = { nome_artistico: 'A', cliente_id: 'c-x' };
    const { svc, qr } = makeSvc({ def, validation: v, queryImpl: (sql) => (sql.includes('"clients"') ? [] : []) });
    const res = await svc.commit('artists', file, 't', 'u');
    expect(qr.rollbackTransaction).toHaveBeenCalled();
    expect(res.errors.some((e) => /relacionamento inválido/i.test(e))).toBe(true);
  });

  it('exceção na persistência → ROLLBACK e propaga', async () => {
    const { svc, qr } = makeSvc({ queryImpl: (sql) => { if (sql.startsWith('INSERT')) throw new Error('db boom'); return []; } });
    await expect(svc.commit('artists', file, 't', 'u')).rejects.toThrow('db boom');
    expect(qr.rollbackTransaction).toHaveBeenCalled();
  });

  it('sem tenant → 403 (nunca persiste)', async () => {
    const { svc } = makeSvc();
    await expect(svc.commit('artists', file, undefined, 'u')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('ImportCommitService — campo computed (projects.musicas, Parte 86)', () => {
  const PROJECTS_DEF: ReportEntityDefinition = {
    entityName: 'ProjectEntity', tableName: 'projects', category: EntityCategory.REPORTABLE,
    identityColumn: 'titulo', displayColumn: 'titulo', dateColumn: 'created_at',
    exportableColumns: ['tipo', 'titulo', 'musicas'], importableColumns: ['tipo', 'titulo', 'musicas'],
    filterableColumns: [], sortableColumns: ['titulo'], searchableColumns: ['titulo'],
    sensitiveColumns: [], requiredImportColumns: ['titulo'], supportsExport: true, supportsImport: true,
  };

  function projectsValidation(musicasJson: string): ImportValidationResult {
    return {
      entity: 'projects', supportsImport: true, mapping: {}, unknownColumns: [], ignoredColumns: [],
      totalRows: 1, validRows: 1, invalidRows: 0,
      rows: [{ index: 0, data: { tipo: 'ep', titulo: 'Meu EP', musicas: musicasJson }, valid: true, errors: [], warnings: [] }],
      errors: [], warnings: [],
    };
  }

  it('INSERT de projects usa RETURNING id, e o writer registrado insere as musicas parseadas', async () => {
    const musicas = JSON.stringify([{ nome: 'Faixa 1', compositores: ['Fulano'] }]);
    const queryImpl = (sql: string) => {
      if (sql.startsWith('INSERT INTO "projects"')) return [{ id: 'proj-gerado' }];
      return [];
    };
    const { svc, qr } = makeSvc({ def: PROJECTS_DEF, validation: projectsValidation(musicas), queryImpl });

    const res = await svc.commit('projects', { filename: 'projects.xlsx', content: Buffer.from('') }, 'tenant-1', 'user-1');

    expect(res.importedRows).toBe(1);
    const projectInsert = qr.query.mock.calls.find((c: any[]) => String(c[0]).startsWith('INSERT INTO "projects"'));
    expect(projectInsert![0]).toContain('RETURNING "id"');
    // "musicas" nunca vai como coluna direta do INSERT de projects (é computed)
    expect(projectInsert![0]).not.toContain('"musicas"');

    const trackInsert = qr.query.mock.calls.find((c: any[]) => String(c[0]).includes('"project_tracks"'));
    expect(trackInsert).toBeDefined();
    expect(trackInsert![1]).toEqual(expect.arrayContaining(['tenant-1', 'proj-gerado', 'Faixa 1']));
  });

  it('INSERT sem id retornado para campo computed → lança erro explícito (nunca falha silenciosamente)', async () => {
    const musicas = JSON.stringify([{ nome: 'Faixa 1' }]);
    const queryImpl = (sql: string) => (sql.startsWith('INSERT INTO "projects"') ? [] : []);
    const { svc } = makeSvc({ def: PROJECTS_DEF, validation: projectsValidation(musicas), queryImpl });
    await expect(
      svc.commit('projects', { filename: 'projects.xlsx', content: Buffer.from('') }, 'tenant-1', 'user-1'),
    ).rejects.toThrow(/sem id retornado/);
  });
});
