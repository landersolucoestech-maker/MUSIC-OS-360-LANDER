/**
 * modules/reports/import/import-parser.service.ts  ·  FASE 2.3A
 * Faz o parse do arquivo enviado (CSV/XLSX/JSON) em linhas brutas (string).
 * Não valida nem persiste.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { isWritableKey } from '../../../core/security/safe-object';
import { IMPORT_MAX_ROWS, type ImportFormat, type ParsedFile } from './import.types';

function formatFromName(filename: string): ImportFormat {
  if (/\.json$/i.test(filename)) return 'json';
  if (/\.(xlsx|xls)$/i.test(filename)) return 'xlsx';
  if (/\.csv$/i.test(filename)) return 'csv';
  throw new BadRequestException('Formato de arquivo não suportado (use CSV, XLSX ou JSON).');
}

@Injectable()
export class ImportParserService {
  parse(filename: string, content: Buffer): ParsedFile {
    const format = formatFromName(filename);
    if (!content || content.length === 0) throw new BadRequestException('Arquivo vazio.');

    if (format === 'json') return this.parseJson(content);
    if (format === 'csv') return this.parseCsv(content);
    return this.parseXlsx(content);
  }

  /** Parser CSV robusto (aspas, vírgulas/quebras escapadas, BOM). */
  private parseCsv(content: Buffer): ParsedFile {
    let text = content.toString('utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // remove BOM
    const matrix: string[][] = [];
    let row: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
        } else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); matrix.push(row); row = []; cur = ''; }
      else if (ch === '\r') { /* ignora */ }
      else cur += ch;
    }
    if (cur !== '' || row.length > 0) { row.push(cur); matrix.push(row); }

    const nonEmpty = matrix.filter((r) => r.some((c) => c.trim() !== ''));
    if (nonEmpty.length === 0) throw new BadRequestException('CSV vazio.');
    const headers = nonEmpty[0].map((h) => h.trim());
    const body = nonEmpty.slice(1);
    this.assertRowLimit(body.length);
    const rows = body.map((line) => {
      const rec: Record<string, string> = Object.create(null);
      headers.forEach((h, idx) => { if (isWritableKey(h)) rec[h] = String(line[idx] ?? ''); });
      return rec;
    });
    return { format: 'csv', headers: headers.filter(isWritableKey), rows };
  }

  private parseJson(content: Buffer): ParsedFile {
    let json: unknown;
    try { json = JSON.parse(content.toString('utf8')); } catch { throw new BadRequestException('JSON inválido.'); }
    // Aceita array de objetos OU { data: [...] } (formato exportado pelo sistema).
    const arr = Array.isArray(json) ? json : (json as { data?: unknown }).data;
    if (!Array.isArray(arr)) throw new BadRequestException('JSON deve conter um array de registros.');
    this.assertRowLimit(arr.length);

    const headerSet = new Set<string>();
    const rows = arr.map((o) => {
      const rec: Record<string, string> = Object.create(null);
      if (o && typeof o === 'object') {
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (!isWritableKey(k)) continue; // ignora chaves poluentes (__proto__, …)
          headerSet.add(k);
          rec[k] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      }
      return rec;
    });
    return { format: 'json', headers: [...headerSet], rows };
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
