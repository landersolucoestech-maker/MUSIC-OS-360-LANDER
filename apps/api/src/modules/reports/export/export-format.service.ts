/**
 * modules/reports/export/export-format.service.ts  ·  FASE 2.2
 *
 * Serialização centralizada. Cabeçalhos SEMPRE em pt-BR via getFieldLabelPtBr
 * (fonte única). Valores formatados em pt-BR (data, booleano, número). Sem
 * formatação espalhada pela aplicação.
 */
import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { getFieldLabelPtBr } from '../i18n/field-labels.pt-br';

export interface ExportColumnHeader {
  key: string;
  label: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('pt-BR');
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  // Datas ISO em string → dd/mm/aaaa
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T?/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
  }
  return String(value);
}

function csvCell(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

@Injectable()
export class ExportFormatService {
  /** Cabeçalhos pt-BR (chave técnica → label da camada i18n). */
  headers(columns: string[]): ExportColumnHeader[] {
    return columns.map((key) => ({ key, label: getFieldLabelPtBr(key) }));
  }

  toJson(entity: string, columns: string[], rows: Record<string, unknown>[]): Record<string, unknown> {
    return {
      metadata: {
        entity,
        columns: this.headers(columns),
        recordCount: rows.length,
        generatedAt: new Date().toISOString(),
      },
      data: rows,
    };
  }

  toCsv(columns: string[], rows: Record<string, unknown>[]): string {
    const head = this.headers(columns).map((h) => csvCell(h.label)).join(',');
    const body = rows.map((r) => columns.map((c) => csvCell(formatValue(r[c]))).join(',')).join('\n');
    return '﻿' + head + (body ? '\n' + body : '');
  }

  toXlsx(entity: string, columns: string[], rows: Record<string, unknown>[]): Buffer {
    const header = this.headers(columns).map((h) => h.label);
    const aoa: unknown[][] = [header, ...rows.map((r) => columns.map((c) => formatValue(r[c])))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entity.slice(0, 31) || 'Export');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
