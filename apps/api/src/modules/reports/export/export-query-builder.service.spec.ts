import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExportQueryBuilderService } from './export-query-builder.service';
import { EntityCategory } from '../entity-metadata.types';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import type { ExportQueryParams } from './export.types';

const DEF: ReportEntityDefinition = {
  entityName: 'ArtistEntity', tableName: 'artists', category: EntityCategory.REPORTABLE,
  identityColumn: 'nome_artistico', displayColumn: 'nome_artistico', dateColumn: 'created_at',
  exportableColumns: ['nome_artistico', 'email', 'status'],
  importableColumns: ['nome_artistico', 'email'],
  filterableColumns: ['status'],
  sortableColumns: ['nome_artistico', 'created_at'],
  searchableColumns: ['nome_artistico', 'email'],
  sensitiveColumns: ['cpf_encrypted'],
  requiredImportColumns: ['nome_artistico'],
  supportsExport: true, supportsImport: true,
};
const base = (p: Partial<ExportQueryParams> = {}): ExportQueryParams => ({ format: 'xlsx', page: 1, pageSize: 100, ...p });

describe('ExportQueryBuilderService — query segura entity-driven', () => {
  const svc = new ExportQueryBuilderService();

  it('monta SELECT com colunas explícitas (nunca SELECT *) + tenant sempre', () => {
    const q = svc.build(DEF, base(), 'tenant-1');
    expect(q.sql).toContain('SELECT "nome_artistico", "email", "status" FROM "artists"');
    expect(q.sql).not.toContain('*');
    expect(q.sql).toContain('"tenant_id" = $1');
    expect(q.parameters[0]).toBe('tenant-1');
  });

  it('sem tenant → ForbiddenException', () => {
    expect(() => svc.build(DEF, base(), '')).toThrow(ForbiddenException);
  });

  it('coluna fora do contrato → 400', () => {
    expect(() => svc.build(DEF, base({ columns: ['email', 'segredo'] }), 't')).toThrow(BadRequestException);
  });

  it('coluna sensível → 400 (nunca exportada)', () => {
    expect(() => svc.build(DEF, base({ columns: ['cpf_encrypted'] }), 't')).toThrow(BadRequestException);
  });

  it('filtro permitido aplica WHERE parametrizado; filtro proibido → 400', () => {
    const q = svc.build(DEF, base({ filters: { status: 'ativo' } }), 't');
    expect(q.sql).toContain('"status" = $2');
    expect(q.parameters).toContain('ativo');
    expect(() => svc.build(DEF, base({ filters: { email: 'x@y' } }), 't')).toThrow(BadRequestException);
  });

  it('ordenação permitida; proibida → 400', () => {
    const q = svc.build(DEF, base({ sort: 'created_at', order: 'DESC' }), 't');
    expect(q.sql).toContain('ORDER BY "created_at" DESC');
    expect(() => svc.build(DEF, base({ sort: 'email' }), 't')).toThrow(BadRequestException);
  });

  it('paginação respeita limite máximo', () => {
    const q = svc.build(DEF, base({ pageSize: 999999, page: 3 }), 't');
    expect(q.parameters).toContain(1000);        // pageSize clamp
    expect(q.parameters).toContain(2000);        // offset (page-1)*1000
  });

  it('soft delete aplica deleted_at IS NULL quando informado', () => {
    const q = svc.build(DEF, base(), 't', { softDeleteColumn: 'deleted_at' });
    expect(q.sql).toContain('"deleted_at" IS NULL');
  });
});
