import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ImportParserService } from './import-parser.service';
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, IMPORT_MAX_SHEETS } from './import.types';

function xlsxBuffer(rows: string[][], sheetNames: string[] = ['Sheet1']): Buffer {
  const wb = XLSX.utils.book_new();
  for (const name of sheetNames) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('ImportParserService — xlsx hardening (advisory GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9)', () => {
  const svc = new ImportParserService();

  it('faz parse de um arquivo pequeno e válido normalmente', () => {
    const content = xlsxBuffer([
      ['nome', 'email'],
      ['Artista 1', 'a1@example.com'],
      ['Artista 2', 'a2@example.com'],
    ]);
    const result = svc.parse('artists.xlsx', content);
    expect(result.headers).toEqual(['nome', 'email']);
    expect(result.rows).toHaveLength(2);
  });

  it('rejeita arquivo vazio', () => {
    expect(() => svc.parse('artists.xlsx', Buffer.alloc(0))).toThrow(BadRequestException);
  });

  it('rejeita extensão não suportada (arquivo separado por vírgula, nunca aceito) com o código UNSUPPORTED_IMPORT_FORMAT', () => {
    const content = xlsxBuffer([['a']]);
    try {
      svc.parse('artists.csv', content);
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({ error: 'UNSUPPORTED_IMPORT_FORMAT' });
    }
  });

  it('rejeita arquivo separado por vírgula renomeado para .xlsx — assinatura ZIP/OLE2 ausente (Parte 81)', () => {
    const fakeContent = Buffer.from('nome,email\nAna,a@example.com\n', 'utf8');
    try {
      svc.parse('artists.xlsx', fakeContent);
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({ error: 'UNSUPPORTED_IMPORT_FORMAT' });
    }
  });

  it('rejeita conteúdo acima de IMPORT_MAX_BYTES antes de chamar XLSX.read', () => {
    const oversized = Buffer.alloc(IMPORT_MAX_BYTES + 1, 0x41);
    expect(() => svc.parse('artists.xlsx', oversized)).toThrow(/limite de .* bytes/);
  });

  it('rejeita planilha com mais de IMPORT_MAX_SHEETS abas', () => {
    const names = Array.from({ length: IMPORT_MAX_SHEETS + 1 }, (_, i) => `S${i}`);
    const content = xlsxBuffer([['a', 'b'], ['1', '2']], names);
    expect(() => svc.parse('artists.xlsx', content)).toThrow(/limite de .* abas/);
  });

  it('rejeita arquivo com mais linhas que IMPORT_MAX_ROWS (não trunca silenciosamente)', () => {
    const rows = [['nome']];
    for (let i = 0; i < IMPORT_MAX_ROWS + 5; i++) rows.push([`Artista ${i}`]);
    const content = xlsxBuffer(rows);
    expect(() => svc.parse('artists.xlsx', content)).toThrow(/limite de \d+ registros/);
  });

  it('aceita arquivo com exatamente IMPORT_MAX_ROWS linhas de dados', () => {
    const rows = [['nome']];
    for (let i = 0; i < IMPORT_MAX_ROWS; i++) rows.push([`Artista ${i}`]);
    const content = xlsxBuffer(rows);
    const result = svc.parse('artists.xlsx', content);
    expect(result.rows).toHaveLength(IMPORT_MAX_ROWS);
  });
});
