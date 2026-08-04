/**
 * modules/reports/export/export.types.ts  ·  FASE 2.2
 */
export type ExportFormat = 'xlsx';

export const EXPORT_FORMATS: ExportFormat[] = ['xlsx'];
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
  /**
   * Nome interno da coluna de PK incluída na query só para correlacionar
   * linhas com campos `computed` pós-fetch (ver ExportEngineService) — nunca
   * aparece em `columns`/no arquivo final. `null` quando o contrato não tem
   * campo computed.
   */
  internalIdColumn: string | null;
}

export interface ExportResult {
  filename: string;
  contentType: string;
  body: Buffer;
  recordCount: number;
  format: ExportFormat;
}
