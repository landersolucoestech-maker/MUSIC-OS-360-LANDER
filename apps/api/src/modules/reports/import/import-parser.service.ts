/**
 * modules/reports/import/import-parser.service.ts  ·  FASE 2.3A
 * Faz o parse do arquivo XLSX enviado em linhas brutas (string).
 * Não valida nem persiste.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { isWritableKey } from '../../../core/security/safe-object';
import { IMPORT_MAX_ROWS, IMPORT_MAX_BYTES, IMPORT_MAX_SHEETS, type ImportFormat, type ParsedFile } from './import.types';

function formatFromName(filename: string): ImportFormat {
  if (/\.(xlsx|xls)$/i.test(filename)) return 'xlsx';
  throw new BadRequestException('Formato de arquivo não suportado (use XLSX).');
}

@Injectable()
export class ImportParserService {
  parse(filename: string, content: Buffer): ParsedFile {
    formatFromName(filename);
    if (!content || content.length === 0) throw new BadRequestException('Arquivo vazio.');
    // Defense-in-depth cap independent of the global JSON body-size limit —
    // xlsx (SheetJS) has no patched release for CVE-2023-30533 (prototype
    // pollution) / CVE-2024-22363 (ReDoS); bounding bytes/sheets/rows read
    // reduces the blast radius of a malicious upload since the library
    // itself can't be fixed here (see scripts/dependency-audit-waivers.json).
    if (content.length > IMPORT_MAX_BYTES) {
      throw new BadRequestException(`Arquivo excede o limite de ${IMPORT_MAX_BYTES} bytes.`);
    }
    return this.parseXlsx(content);
  }

  private parseXlsx(content: Buffer): ParsedFile {
    // sheetRows bounds how many rows SheetJS itself materializes per sheet —
    // stops pathological parsing before it happens, rather than only
    // rejecting the result afterwards. +2 (not +1) so a file with exactly
    // IMPORT_MAX_ROWS+1 body rows is still observed and rejected below,
    // instead of being silently truncated to the limit.
    const wb = XLSX.read(content, { type: 'buffer', sheetRows: IMPORT_MAX_ROWS + 2 });
    if (wb.SheetNames.length > IMPORT_MAX_SHEETS) {
      throw new BadRequestException(`Planilha excede o limite de ${IMPORT_MAX_SHEETS} abas.`);
    }
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
