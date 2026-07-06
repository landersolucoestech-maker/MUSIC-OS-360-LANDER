/**
 * modules/reports/import/import-parser.service.ts  ·  FASE 2.3A
 * Faz o parse do arquivo XLSX enviado em linhas brutas (string).
 * Não valida nem persiste.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { isWritableKey } from '../../../core/security/safe-object';
import { IMPORT_MAX_ROWS, type ImportFormat, type ParsedFile } from './import.types';

function formatFromName(filename: string): ImportFormat {
  if (/\.(xlsx|xls)$/i.test(filename)) return 'xlsx';
  throw new BadRequestException('Formato de arquivo não suportado (use XLSX).');
}

@Injectable()
export class ImportParserService {
  parse(filename: string, content: Buffer): ParsedFile {
    formatFromName(filename);
    if (!content || content.length === 0) throw new BadRequestException('Arquivo vazio.');
    return this.parseXlsx(content);
  }

  private parseXlsx(content: Buffer): ParsedFile {
    const wb = XLSX.read(content, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new BadRequestException('Planilha sem abas.');
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
    if (matrix.length === 0) throw new BadRequestException('Planilha vazia.');

    const headers = (matrix[0] as unknown[]).map((h) => String(h ?? '').trim());
    const body = matrix.slice(1);
    this.assertRowLimit(body.length);

    const rows = body.map((line) => {
      const rec: Record<string, string> = Object.create(null);
      headers.forEach((h, i) => { if (isWritableKey(h)) rec[h] = String((line as unknown[])[i] ?? ''); });
      return rec;
    });
    return { format: 'xlsx', headers: headers.filter(isWritableKey), rows };
  }

  private assertRowLimit(n: number): void {
    if (n > IMPORT_MAX_ROWS) {
      throw new BadRequestException(`Arquivo excede o limite de ${IMPORT_MAX_ROWS} registros.`);
    }
  }
}
