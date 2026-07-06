import * as XLSX from 'xlsx';
import { ExportFormatService, sanitizeExcelCellValue, EXCEL_CELL_MAX_CHARS } from './export-format.service';

describe('ExportFormatService — serialização XLSX', () => {
  const svc = new ExportFormatService();

  function readFirstSheetRows(buf: Buffer): unknown[][] {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  }

  it('cabeçalhos usam label pt-BR, nunca a chave técnica', () => {
    const buf = svc.toXlsx('artists', ['nome_artistico'], [{ nome_artistico: 'Ana' }]);
    const rows = readFirstSheetRows(buf);
    expect(rows[0]).toContain('Nome artístico');
    expect(rows[0]).not.toContain('nome_artistico');
  });

  it('campo de texto que excede o limite de célula do Excel é truncado (nunca derruba a exportação)', () => {
    const huge = 'A'.repeat(40000); // > 32767, ex.: corpo de contrato muito longo
    const buf = svc.toXlsx('contract_templates', ['conteudo'], [{ conteudo: huge }]);
    const rows = readFirstSheetRows(buf);
    const cell = String(rows[1][0]);
    expect(cell.length).toBeLessThanOrEqual(32767);
    expect(cell).toContain('truncado');
  });

  it('valor dentro do limite não é alterado', () => {
    const normal = 'Texto normal de observação.';
    const buf = svc.toXlsx('artists', ['observacoes'], [{ observacoes: normal }]);
    const rows = readFirstSheetRows(buf);
    expect(rows[1][0]).toBe(normal);
  });

  describe('sanitizeExcelCellValue — última barreira antes do Excel (todas as entidades)', () => {
    it('null/undefined viram célula vazia', () => {
      expect(sanitizeExcelCellValue(null, { entity: 'artists', column: 'x' })).toBe('');
      expect(sanitizeExcelCellValue(undefined, { entity: 'artists', column: 'x' })).toBe('');
    });

    it('objeto/array cru NUNCA vira célula (defesa em profundidade, mesmo que já devesse ter sido excluído antes)', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(sanitizeExcelCellValue({ a: 1 }, { entity: 'artists', column: 'metadata' })).toBe('');
      expect(sanitizeExcelCellValue([1, 2, 3], { entity: 'artists', column: 'tags' })).toBe('');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('loga entidade, coluna e tamanho quando trunca (rastreável em produção)', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const huge = 'X'.repeat(50000);
      sanitizeExcelCellValue(huge, { entity: 'contract_templates', column: 'conteudo' });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('contract_templates.conteudo'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('50000'));
      warn.mockRestore();
    });

    it('garante que o resultado nunca ultrapassa EXCEL_CELL_MAX_CHARS mesmo para entradas absurdamente grandes', () => {
      const absurd = 'Z'.repeat(200000);
      const out = sanitizeExcelCellValue(absurd, { entity: 'briefings', column: 'descricao' });
      expect(out.length).toBeLessThanOrEqual(EXCEL_CELL_MAX_CHARS);
    });
  });
});
