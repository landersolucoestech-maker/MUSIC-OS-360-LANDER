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

// Limite real do Excel (OOXML) por célula é 32767 caracteres. Este é o ÚLTIMO
// ponto antes de escrever qualquer valor no Excel — nenhuma célula chega ao
// XLSX sem passar por sanitizeExcelCellValue. Nenhum campo de formulário
// legítimo (ex.: corpo de contrato) pode estourar a célula e derrubar a
// exportação inteira.
export const EXCEL_CELL_MAX_CHARS = 32767;
const EXCEL_CELL_SAFE_CHARS = 32000;
const TRUNCATION_SUFFIX = '… [truncado: excede o limite de célula do Excel]';

export interface CellContext {
  entity: string;
  column: string;
}

/**
 * Única função de sanitização de célula do caminho real (backend) de exportação.
 * - null/undefined → vazio
 * - objeto/array cru → NUNCA vira célula (blob técnico; já deveria ter sido
 *   excluído em ReportEntityDefinitionService, mas isto é defesa em profundidade)
 * - string acima do limite do Excel → truncada com marcador explícito
 * - garante que o resultado final nunca ultrapassa EXCEL_CELL_MAX_CHARS
 */
export function sanitizeExcelCellValue(value: unknown, context: CellContext): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('pt-BR');
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') {
    // eslint-disable-next-line no-console
    console.warn(`[reports-export] campo técnico ignorado (objeto/array cru): ${context.entity}.${context.column}`);
    return '';
  }
  // Datas ISO em string → dd/mm/aaaa
  let text: string;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T?/.test(value)) {
    const d = new Date(value);
    text = Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  } else {
    text = String(value);
  }
  if (text.length > EXCEL_CELL_MAX_CHARS) {
    // eslint-disable-next-line no-console
    console.warn(
      `[reports-export] campo truncado para exportação: ${context.entity}.${context.column} ` +
      `tinha ${text.length} caracteres (limite Excel: ${EXCEL_CELL_MAX_CHARS})`,
    );
    return text.slice(0, EXCEL_CELL_SAFE_CHARS - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
  }
  return text;
}

@Injectable()
export class ExportFormatService {
  /** Cabeçalhos pt-BR (chave técnica → label da camada i18n). */
  headers(columns: string[]): ExportColumnHeader[] {
    return columns.map((key) => ({ key, label: getFieldLabelPtBr(key) }));
  }

  toXlsx(entity: string, columns: string[], rows: Record<string, unknown>[]): Buffer {
    const header = this.headers(columns).map((h) => h.label);
    const aoa: unknown[][] = [
      header,
      ...rows.map((r) => columns.map((c) => sanitizeExcelCellValue(r[c], { entity, column: c }))),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entity.slice(0, 31) || 'Export');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
