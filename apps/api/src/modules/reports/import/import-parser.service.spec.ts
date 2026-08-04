import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ImportParserService } from './import-parser.service';
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_COLUMNS,
  IMPORT_MAX_ROWS,
  IMPORT_MAX_UNCOMPRESSED_BYTES,
} from './import.types';

function workbookBuffer(
  rows: unknown[][],
  sheetNames: string[] = ['Dados'],
  configure?: (workbook: XLSX.WorkBook, worksheet: XLSX.WorkSheet) => void,
): Buffer {
  const workbook = XLSX.utils.book_new();
  for (const name of sheetNames) {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    configure?.(workbook, worksheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function mutateFirstCentralDirectoryEntry(
  input: Buffer,
  mutate: (copy: Buffer, offset: number) => void,
): Buffer {
  const copy = Buffer.from(input);
  for (let offset = 0; offset <= copy.length - 4; offset += 1) {
    if (copy.readUInt32LE(offset) === 0x02014b50) {
      mutate(copy, offset);
      return copy;
    }
  }
  throw new Error('Diretório central não encontrado no fixture.');
}

describe('ImportParserService — hardening XLSX', () => {
  const service = new ImportParserService();

  it('preserva Unicode, acentos e zeros à esquerda em células textuais', () => {
    const content = workbookBuffer([
      ['Nome artístico', 'Código'],
      ['João d’Ávila 🎵', '00123'],
    ]);
    const result = service.parse('artists.xlsx', content, 'Dados');
    expect(result.headers).toEqual(['Nome artístico', 'Código']);
    expect(result.rows).toEqual([
      expect.objectContaining({ 'Nome artístico': 'João d’Ávila 🎵', Código: '00123' }),
    ]);
  });

  it('rejeita arquivo vazio', () => {
    expect(() => service.parse('artists.xlsx', Buffer.alloc(0))).toThrow(BadRequestException);
  });

  it('rejeita extensão não suportada com código estável', () => {
    const content = workbookBuffer([['Campo']]);
    try {
      service.parse('artists.txt', content);
      throw new Error('deveria ter lançado');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        error: 'UNSUPPORTED_IMPORT_FORMAT',
      });
    }
  });

  it('rejeita texto plano renomeado como workbook', () => {
    const fakeContent = Buffer.from('nome;email\nAna;a@example.com\n', 'utf8');
    try {
      service.parse('artists.xlsx', fakeContent);
      throw new Error('deveria ter lançado');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        error: 'INVALID_XLSX_WORKBOOK',
      });
    }
  });

  it('rejeita conteúdo acima do limite antes do parser OpenXML', () => {
    const oversized = Buffer.alloc(IMPORT_MAX_BYTES + 1, 0x41);
    expect(() => service.parse('artists.xlsx', oversized)).toThrow(/limite de .* bytes/);
  });

  it('rejeita workbook com mais de uma aba', () => {
    const content = workbookBuffer([['a'], ['1']], ['Principal', 'Auxiliar']);
    expect(() => service.parse('artists.xlsx', content)).toThrow(BadRequestException);
  });

  it('rejeita nome de aba divergente do contrato', () => {
    const content = workbookBuffer([['a'], ['1']], ['Outra']);
    expect(() => service.parse('artists.xlsx', content, 'Artistas')).toThrow(/Nome da aba inválido/);
  });

  it('rejeita aba oculta', () => {
    const content = workbookBuffer([['a'], ['1']], ['Dados'], (workbook) => {
      workbook.Workbook = { Sheets: [{ Hidden: 1 }] };
    });
    expect(() => service.parse('artists.xlsx', content)).toThrow(/deve estar visível/);
  });

  it('rejeita células mescladas', () => {
    const content = workbookBuffer([['a', 'b'], ['1', '2']], ['Dados'], (_workbook, worksheet) => {
      worksheet['!merges'] = [XLSX.utils.decode_range('A1:B1')];
    });
    expect(() => service.parse('artists.xlsx', content)).toThrow(/mescladas/);
  });

  it('rejeita fórmulas', () => {
    const content = workbookBuffer([['a'], ['valor']], ['Dados'], (_workbook, worksheet) => {
      worksheet.A2 = { t: 'n', f: '1+1', v: 2 };
    });
    expect(() => service.parse('artists.xlsx', content)).toThrow(/Fórmula não permitida/);
  });

  it('rejeita cabeçalhos duplicados após normalização Unicode e caixa', () => {
    const content = workbookBuffer([['Nome', 'NOME'], ['A', 'B']]);
    expect(() => service.parse('artists.xlsx', content)).toThrow(/Cabeçalho duplicado/);
  });

  it('rejeita cabeçalho vazio entre colunas utilizadas', () => {
    const content = workbookBuffer([['Nome', '', 'E-mail'], ['A', '', 'a@example.com']]);
    expect(() => service.parse('artists.xlsx', content)).toThrow(/Cabeçalho vazio/);
  });

  it('rejeita quantidade de colunas acima do limite', () => {
    const headers = Array.from({ length: IMPORT_MAX_COLUMNS + 1 }, (_, index) => `Campo ${index}`);
    const content = workbookBuffer([headers, headers.map(() => 'x')]);
    expect(() => service.parse('artists.xlsx', content)).toThrow(/colunas excede/);
  });

  it('rejeita arquivo com mais linhas que o limite sem truncamento silencioso', () => {
    const rows: string[][] = [['nome']];
    for (let index = 0; index < IMPORT_MAX_ROWS + 5; index += 1) rows.push([`Artista ${index}`]);
    const content = workbookBuffer(rows);
    expect(() => service.parse('artists.xlsx', content)).toThrow(/limite de \d+ registros/);
  });

  it('aceita exatamente o limite de linhas', () => {
    const rows: string[][] = [['nome']];
    for (let index = 0; index < IMPORT_MAX_ROWS; index += 1) rows.push([`Artista ${index}`]);
    const result = service.parse('artists.xlsx', workbookBuffer(rows));
    expect(result.rows).toHaveLength(IMPORT_MAX_ROWS);
  });

  it('rejeita entrada ZIP criptografada antes de interpretar o workbook', () => {
    const content = mutateFirstCentralDirectoryEntry(
      workbookBuffer([['a'], ['1']]),
      (copy, offset) => copy.writeUInt16LE(copy.readUInt16LE(offset + 8) | 0x1, offset + 8),
    );
    expect(() => service.parse('artists.xlsx', content)).toThrow(/criptografadas/);
  });

  it('rejeita expansão descompactada incompatível com o limite', () => {
    const content = mutateFirstCentralDirectoryEntry(
      workbookBuffer([['a'], ['1']]),
      (copy, offset) => copy.writeUInt32LE(IMPORT_MAX_UNCOMPRESSED_BYTES + 1, offset + 24),
    );
    expect(() => service.parse('artists.xlsx', content)).toThrow(/descompactada excede/);
  });

  it('rejeita workbook truncado', () => {
    const valid = workbookBuffer([['a'], ['1']]);
    expect(() => service.parse('artists.xlsx', valid.subarray(0, valid.length - 32))).toThrow(
      /Diretório central ZIP ausente|truncado/,
    );
  });
});
