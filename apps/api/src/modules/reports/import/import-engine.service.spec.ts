import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ImportEngineService } from './import-engine.service';
import { ImportParserService } from './import-parser.service';
import { ImportMapperService } from './import-mapper.service';
import { ImportValidationService } from './import-validation.service';
import { ExportFormatService } from '../export/export-format.service';
import { EntityCategory } from '../entity-metadata.types';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';

const DEF: ReportEntityDefinition = {
  entityName: 'ArtistEntity', tableName: 'artists', category: EntityCategory.REPORTABLE,
  identityColumn: 'nome_artistico', displayColumn: 'nome_artistico', dateColumn: 'created_at',
  exportableColumns: ['nome_artistico', 'email', 'status', 'categoria'],
  importableColumns: ['nome_artistico', 'email', 'status', 'categoria'],
  filterableColumns: ['status'], sortableColumns: ['nome_artistico'], searchableColumns: ['nome_artistico'],
  sensitiveColumns: ['cpf_encrypted'], requiredImportColumns: ['nome_artistico'],
  supportsExport: true, supportsImport: true,
};

const REPORT = {
  tableName: 'artists', reportable: true, hasSoftDelete: true,
  columns: [
    { name: 'nome_artistico', type: 'String', isEnum: false, nullable: false, hasDefault: false },
    { name: 'email', type: 'String', isEnum: false, nullable: true, hasDefault: false },
    { name: 'status', type: 'String', isEnum: true, enumValues: ['ativo', 'inativo'], nullable: true, hasDefault: false },
    { name: 'cpf_encrypted', type: 'String', isEnum: false, nullable: true, hasDefault: false },
    { name: 'tenant_id', type: 'String', isEnum: false, nullable: false, hasDefault: false },
    // NOT NULL sem DEFAULT e fora de requiredImportColumns (só a identityColumn
    // está lá) — reproduz o gap que causava 500 no commit (Parte 80).
    { name: 'categoria', type: 'String', isEnum: false, nullable: false, hasDefault: false },
  ],
};

function makeEngine(opts: { reportable?: boolean; hasEntity?: boolean; def?: ReportEntityDefinition | null } = {}) {
  const report = opts.hasEntity === false ? undefined : { ...REPORT, reportable: opts.reportable ?? true };
  const metadata = { scan: () => ({ entities: report ? [report] : [] }) } as any;
  const definitions = { getDefinition: () => (opts.def === undefined ? DEF : opts.def) } as any;
  const tableGuard = { assertTableUsable: jest.fn().mockResolvedValue(undefined) } as any;
  return new ImportEngineService(metadata, definitions, new ImportParserService(), new ImportMapperService(), new ImportValidationService(), tableGuard, new ExportFormatService());
}
/** Constrói um arquivo XLSX a partir de linhas separadas por vírgula (facilita os testes). */
function xlsx(delimitedText: string) {
  const rows = delimitedText.split('\n').map((line) => line.split(','));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const content = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return { filename: 'artists.xlsx', content };
}

describe('ImportEngineService — validação (FASE 2.3A, sem persistência)', () => {
  it('mapeia cabeçalhos pt-BR (round-trip do export) para colunas técnicas e valida', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,E-mail,Situação\nJoão,joao@x.com,ativo'), 'tenant-1');
    expect(res.mapping['Nome artístico']).toBe('nome_artistico');
    expect(res.mapping['E-mail']).toBe('email');
    expect(res.mapping['Situação']).toBe('status');
    expect(res.totalRows).toBe(1);
    expect(res.validRows).toBe(1);
    expect(res.rows[0].data).toEqual({ nome_artistico: 'João', email: 'joao@x.com', status: 'ativo' });
  });

  it('campo obrigatório vazio → linha inválida', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,E-mail\n,maria@x.com'), 't');
    expect(res.validRows).toBe(0);
    expect(res.rows[0].errors[0].column).toBe('nome_artistico');
  });

  it('coluna NOT NULL sem DEFAULT ausente do arquivo → erro bloqueante mesmo fora de requiredImportColumns (Parte 80: evita 500 no commit)', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,E-mail\nAna,ana@x.com'), 't');
    expect(res.errors.some((e) => e.includes('categoria'))).toBe(true);
  });

  it('coluna NOT NULL sem DEFAULT presente mas vazia na linha → linha inválida', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,Categoria\nAna,'), 't');
    expect(res.rows[0].valid).toBe(false);
    expect(res.rows[0].errors.some((e) => e.column === 'categoria')).toBe(true);
  });

  it('enum inválido → linha inválida', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,Situação\nAna,explodido'), 't');
    expect(res.rows[0].valid).toBe(false);
    expect(res.rows[0].errors.some((e) => e.column === 'status')).toBe(true);
  });

  it('coluna desconhecida → warning (ignorada)', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,Campo Maluco\nAna,x'), 't');
    expect(res.unknownColumns).toContain('Campo Maluco');
    expect(res.warnings.some((w) => w.includes('Campo Maluco'))).toBe(true);
  });

  it('coluna sensível → rejeitada (erro bloqueante)', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,cpf_encrypted\nAna,123'), 't');
    expect(res.errors.some((e) => /sensível/i.test(e))).toBe(true);
  });

  it('tenant_id no arquivo → ignorado (nunca importado)', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico,tenant_id\nAna,outro-tenant'), 't');
    expect(res.ignoredColumns).toContain('tenant_id');
    expect(res.rows[0].data).not.toHaveProperty('tenant_id');
  });

  it('duplicidade interna por identidade → warning', async () => {
    const res = await makeEngine().validateFile('artists',
      xlsx('Nome artístico\nAna\nAna'), 't');
    expect(res.rows[1].warnings.some((w) => /duplicado/.test(w.message))).toBe(true);
  });

  it('arquivo com extensão diferente de .xlsx/.xls é rejeitado (nenhum outro formato é aceito)', async () => {
    const wrongExtensionFile = { filename: 'artists.csv', content: Buffer.from('Nome artístico\nAna') };
    await expect(makeEngine().validateFile('artists', wrongExtensionFile, 't')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sem tenant → 403; entidade inexistente → 404; supportsImport=false → 400', async () => {
    await expect(makeEngine().validateFile('artists', xlsx('Nome artístico\nA'), undefined)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(makeEngine({ hasEntity: false }).validateFile('nope', xlsx('x\n1'), 't')).rejects.toBeInstanceOf(NotFoundException);
    await expect(makeEngine({ def: { ...DEF, supportsImport: false } }).validateFile('artists', xlsx('Nome artístico\nA'), 't')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ImportEngineService — buildTemplate (Parte 80/81)', () => {
  it('gera workbook XLSX com aba de dados (cabeçalho + 1 exemplo sintético) e aba de Instruções', async () => {
    const result = await makeEngine().buildTemplate('artists', 't');
    expect(result.filename).toBe('artists_template.xlsx');
    const wb = XLSX.read(result.body, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['artists', 'Instruções']);

    const dataRows = XLSX.utils.sheet_to_json(wb.Sheets['artists']!, { header: 1 }) as unknown[][];
    expect(dataRows).toHaveLength(2); // cabeçalho + 1 linha de exemplo sintético
    expect(dataRows[0]).toHaveLength(DEF.importableColumns.length);
    expect(dataRows[1]).toHaveLength(DEF.importableColumns.length);

    const instrucoesRows = XLSX.utils.sheet_to_json(wb.Sheets['Instruções']!, { header: 1 }) as unknown[][];
    expect(instrucoesRows.some((r) => String(r[0]).includes('Versão do template'))).toBe(true);
    // categoria é NOT NULL sem DEFAULT (Parte 81) → aparece como obrigatório na aba de instruções
    const categoriaRow = instrucoesRows.find((r) => r[0] === 'Categoria');
    expect(categoriaRow?.[1]).toBe('Sim');
  });

  it('sem tenant → 403; entidade inexistente → 404; supportsImport=false → 400', async () => {
    await expect(makeEngine().buildTemplate('artists', undefined)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(makeEngine({ hasEntity: false }).buildTemplate('nope', 't')).rejects.toBeInstanceOf(NotFoundException);
    await expect(makeEngine({ def: { ...DEF, supportsImport: false } }).buildTemplate('artists', 't')).rejects.toBeInstanceOf(BadRequestException);
  });
});
