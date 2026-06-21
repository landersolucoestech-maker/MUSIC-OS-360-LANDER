/**
 * modules/reports/export/export.types.ts  ·  FASE 2.2
 */
export type ExportFormat = 'json' | 'csv' | 'xlsx';

export const EXPORT_FORMATS: ExportFormat[] = ['json', 'csv', 'xlsx'];
export const EXPORT_DEFAULT_PAGE_SIZE = 100;
export const EXPORT_MAX_PAGE_SIZE = 1000;

export interface ExportQueryParams {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, string>;
  sort?: string;
  order?: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

export interface BuiltExportQuery {
  sql: string;
  parameters: unknown[];
  columns: string[];
}

export interface ExportResult {
  filename: string;
  contentType: string;
  body: string | Buffer | Record<string, unknown>;
  recordCount: number;
  format: ExportFormat;
}
