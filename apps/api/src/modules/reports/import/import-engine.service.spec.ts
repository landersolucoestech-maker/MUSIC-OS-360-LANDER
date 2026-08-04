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

describe('ImportEngineService — abas filhas (projects → Músicas do Projeto, Parte 87)', () => {
  const PROJECTS_DEF: ReportEntityDefinition = {
    entityName: 'ProjectEntity', tableName: 'projects', category: EntityCategory.REPORTABLE,
    identityColumn: 'titulo', displayColumn: 'titulo', dateColumn: 'created_at',
    exportableColumns: ['projeto_ref', 'tipo', 'titulo', 'observacoes', 'status'],
    importableColumns: ['projeto_ref', 'tipo', 'titulo', 'observacoes', 'status'],
    filterableColumns: ['status'], sortableColumns: ['titulo'], searchableColumns: ['titulo'],
    sensitiveColumns: [], requiredImportColumns: ['titulo'], supportsExport: true, supportsImport: true,
  };
  const PROJECTS_REPORT = {
    tableName: 'projects', label: 'Projetos', reportable: true, hasSoftDelete: true,
    columns: [
      { name: 'id', type: 'uuid', isEnum: false, nullable: false, hasDefault: true },
      { name: 'tipo', type: 'String', isEnum: false, nullable: false, hasDefault: false },
      { name: 'titulo', type: 'String', isEnum: false, nullable: false, hasDefault: false },
      { name: 'observacoes', type: 'String', isEnum: false, nullable: true, hasDefault: false },
      { name: 'status', type: 'String', isEnum: false, nullable: false, hasDefault: true },
      { name: 'tenant_id', type: 'String', isEnum: false, nullable: false, hasDefault: false },
    ],
  };

  function makeProjectsEngine() {
    const metadata = { scan: () => ({ entities: [PROJECTS_REPORT] }) } as any;
    const definitions = { getDefinition: () => PROJECTS_DEF } as any;
    const tableGuard = { assertTableUsable: jest.fn().mockResolvedValue(undefined) } as any;
    return new ImportEngineService(metadata, definitions, new ImportParserService(), new ImportMapperService(), new ImportValidationService(), tableGuard, new ExportFormatService());
  }

  function multiSheetXlsx(sheets: Array<{ name: string; aoa: string[][] }>) {
    const wb = XLSX.utils.book_new();
    for (const s of sheets) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.aoa), s.name);
    }
    const content = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return { filename: 'projects.xlsx', content };
  }

  it('buildTemplate: workbook com 3 abas — Projetos, Músicas do Projeto, Instruções', async () => {
    const result = await makeProjectsEngine().buildTemplate('projects', 't');
    const wb = XLSX.read(result.body, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Projetos', 'Músicas do Projeto', 'Instruções']);

    const mainRows = XLSX.utils.sheet_to_json(wb.Sheets['Projetos']!, { header: 1 }) as unknown[][];
    expect(mainRows[0]).toEqual(['Projeto ID de referência', 'Tipo', 'Título', 'Observações', 'Situação']);
    expect(mainRows[1][0]).toBe('1'); // valor de exemplo fixo da coluna ref

    const childRows = XLSX.utils.sheet_to_json(wb.Sheets['Músicas do Projeto']!, { header: 1 }) as unknown[][];
    expect(childRows[0][0]).toBe('Projeto ID de referência');
    expect(childRows[0]).toContain('Nome');
    expect(childRows[1][0]).toBe('1'); // mesmo valor de exemplo — correlaciona com a aba principal
  });

  it('validateFile: correlaciona linha principal com linhas da aba filha via projeto_ref', async () => {
    const file = multiSheetXlsx([
      {
        name: 'Projetos',
        aoa: [
          ['Projeto ID de referência', 'Tipo', 'Título', 'Status'],
          ['A', 'ep', 'Meu EP', 'planejamento'],
        ],
      },
      {
        name: 'Músicas do Projeto',
        aoa: [
          ['Projeto ID de referência', 'Nome', 'Compositores', 'Ordem'],
          ['A', 'Faixa 1', 'Fulano, Ciclano', '0'],
          ['A', 'Faixa 2', 'Beltrano', '1'],
        ],
      },
    ]);

    const result = await makeProjectsEngine().validateFile('projects', file, 't');
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.data.titulo).toBe('Meu EP');
    expect(row.childSheets?.musicas).toHaveLength(2);
    expect(row.childSheets!.musicas[0]).toMatchObject({ nome: 'Faixa 1', compositores: ['Fulano', 'Ciclano'] });
    expect(row.childSheets!.musicas[1]).toMatchObject({ nome: 'Faixa 2', compositores: ['Beltrano'] });
  });

  it('validateFile: sem aba filha no arquivo → linha principal validada normalmente, sem childSheets', async () => {
    const file = multiSheetXlsx([
      { name: 'Projetos', aoa: [['Projeto ID de referência', 'Tipo', 'Título'], ['A', 'single', 'Só Música']] },
    ]);
    const result = await makeProjectsEngine().validateFile('projects', file, 't');
    expect(result.rows[0].valid).toBe(true);
    expect(result.rows[0].childSheets).toBeUndefined();
  });
});
