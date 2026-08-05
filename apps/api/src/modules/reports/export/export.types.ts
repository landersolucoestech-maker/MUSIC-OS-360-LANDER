/**
 * modules/reports/export/export.types.ts  ·  FASE 2.2
 */
export type ExportFormat = 'xlsx';

export const EXPORT_FORMATS: ExportFormat[] = ['xlsx'];

/**
 * XLSX é materializado em memória pela biblioteca atual. Acima deste volume a
 * requisição síncrona deve falhar explicitamente, nunca entregar uma planilha
 * parcial. O limite + 1 é consultado para detectar excesso sem COUNT adicional.
 */
export const EXPORT_MAX_ROWS = 50_000;
export const EXPORT_DETECTION_LIMIT = EXPORT_MAX_ROWS + 1;

export interface ExportQueryParams {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, string>;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface BuiltExportQuery {
  sql: string;
  parameters: unknown[];
  columns: string[];
}

export interface ExportResult {
  filename: string;
  contentType: string;
  body: Buffer;
  recordCount: number;
  format: ExportFormat;
}
