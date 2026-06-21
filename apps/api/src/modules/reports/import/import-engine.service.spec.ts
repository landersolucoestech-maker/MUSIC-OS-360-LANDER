import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ImportEngineService } from './import-engine.service';
import { ImportParserService } from './import-parser.service';
import { ImportMapperService } from './import-mapper.service';
import { ImportValidationService } from './import-validation.service';
import { EntityCategory } from '../entity-metadata.types';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';

const DEF: ReportEntityDefinition = {
  entityName: 'ArtistEntity', tableName: 'artists', category: EntityCategory.REPORTABLE,
  identityColumn: 'nome_artistico', displayColumn: 'nome_artistico', dateColumn: 'created_at',
  exportableColumns: ['nome_artistico', 'email', 'status'],
  importableColumns: ['nome_artistico', 'email', 'status'],
  filterableColumns: ['status'], sortableColumns: ['nome_artistico'], searchableColumns: ['nome_artistico'],
  sensitiveColumns: ['cpf_encrypted'], requiredImportColumns: ['nome_artistico'],
  supportsExport: true, supportsImport: true,
};

const REPORT = {
  tableName: 'artists', reportable: true, hasSoftDelete: true,
  columns: [
    { name: 'nome_artistico', type: 'String', isEnum: false, nullable: false },
    { name: 'email', type: 'String', isEnum: false, nullable: true },
    { name: 'status', type: 'String', isEnum: true, enumValues: ['ativo', 'inativo'], nullable: true },
    { name: 'cpf_encrypted', type: 'String', isEnum: false, nullable: true },
    { name: 'tenant_id', type: 'String', isEnum: false, nullable: false },
  ],
};

function makeEngine(opts: { reportable?: boolean; hasEntity?: boolean; def?: ReportEntityDefinition | null } = {}) {
  const report = opts.hasEntity === false ? undefined : { ...REPORT, reportable: opts.reportable ?? true };
  const metadata = { scan: () => ({ entities: report ? [report] : [] }) } as any;
  const definitions = { getDefinition: () => (opts.def === undefined ? DEF : opts.def) } as any;
  const tableGuard = { assertTableUsable: jest.fn().mockResolvedValue(undefined) } as any;
  return new ImportEngineService(metadata, definitions, new ImportParserService(), new ImportMapperService(), new ImportValidationService(), tableGuard);
}
const csv = (s: string) => ({ filename: 'artists.csv', content: Buffer.from(s, 'utf8') });

describe('ImportEngineService — validação (FASE 2.3A, sem persistência)', () => {
  it('mapeia cabeçalhos pt-BR (round-trip do export) para colunas técnicas e valida', async () => {
    const res = await makeEngine().validateFile('artists',
      csv('Nome artístico,E-mail,Situação\nJoão,joao@x.com,ativo'), 'tenant-1');
    expect(res.mapping['Nome artístico']).toBe('nome_artistico');
    expect(res.mapping['E-mail']).toBe('email');
    expect(res.mapping['Situação']).toBe('status');
    expect(res.totalRows).toBe(1);
    expect(res.validRows).toBe(1);
    expect(res.rows[0].data).toEqual({ nome_artistico: 'João', email: 'joao@x.com', status: 'ativo' });
  });

  it('campo obrigatório vazio → linha inválida', async () => {
    const res = await makeEngine().validateFile('artists',
      csv('Nome artístico,E-mail\n,maria@x.com'), 't');
    expect(res.validRows).toBe(0);
    expect(res.rows[0].errors[0].column).toBe('nome_artistico');
  });

  it('enum inválido → linha inválida', async () => {
    const res = await makeEngine().validateFile('artists',
      csv('Nome artístico,Situação\nAna,explodido'), 't');
    expect(res.rows[0].valid).toBe(false);
    expect(res.rows[0].errors.some((e) => e.column === 'status')).toBe(true);
  });

  it('coluna desconhecida → warning (ignorada)', async () => {
    const res = await makeEngine().validateFile('artists',
      csv('Nome artístico,Campo Maluco\nAna,x'), 't');
    expect(res.unknownColumns).toContain('Campo Maluco');
    expect(res.warnings.some((w) => w.includes('Campo Maluco'))).toBe(true);
  });

  it('coluna sensível → rejeitada (erro bloqueante)', async () => {
    const res = await makeEngine().validateFile('artists',
      csv('Nome artístico,cpf_encrypted\nAna,123'), 't');
    expect(res.errors.some((e) => /sensível/i.test(e))).toBe(true);
  });

  it('tenant_id no arquivo → ignorado (nunca importado)', async () => {
    const res = await makeEngine().validateFile('artists',
      csv('Nome artístico,tenant_id\nAna,outro-tenant'), 't');
    expect(res.ignoredColumns).toContain('tenant_id');
    expect(res.rows[0].data).not.toHaveProperty('tenant_id');
  });

  it('duplicidade interna por identidade → warning', async () => {
    const res = await makeEngine().validateFile('artists',
      csv('Nome artístico\nAna\nAna'), 't');
    expect(res.rows[1].warnings.some((w) => /duplicado/.test(w.message))).toBe(true);
  });

  it('JSON exportado pelo sistema é reimportável', async () => {
    const json = JSON.stringify({ data: [{ nome_artistico: 'Beto', status: 'inativo' }] });
    const res = await makeEngine().validateFile('artists', { filename: 'artists.json', content: Buffer.from(json) }, 't');
    expect(res.validRows).toBe(1);
    expect(res.rows[0].data.status).toBe('inativo');
  });

  it('sem tenant → 403; entidade inexistente → 404; supportsImport=false → 400', async () => {
    await expect(makeEngine().validateFile('artists', csv('Nome artístico\nA'), undefined)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(makeEngine({ hasEntity: false }).validateFile('nope', csv('x\n1'), 't')).rejects.toBeInstanceOf(NotFoundException);
    await expect(makeEngine({ def: { ...DEF, supportsImport: false } }).validateFile('artists', csv('Nome artístico\nA'), 't')).rejects.toBeInstanceOf(BadRequestException);
  });
});
