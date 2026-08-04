/**
 * modules/reports/import/import.types.ts
 * Validação de importação XLSX em uma única aba.
 */
export type ImportFormat = 'xlsx';
export const IMPORT_MAX_ROWS = 5000;
export const IMPORT_MAX_BYTES = 1024 * 1024;
export const IMPORT_MAX_SHEETS = 1;

export interface ParsedFile {
  format: ImportFormat;
  headers: string[];
  rows: Record<string, string>[];
}

export interface FieldTypeMeta {
  type: string;
  isEnum: boolean;
  enumValues?: string[];
  nullable: boolean;
  hasDefault: boolean;
}

export interface RowIssue {
  column: string;
  message: string;
}

export interface RowValidation {
  index: number;
  data: Record<string, unknown>;
  valid: boolean;
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface ImportValidationResult {
  entity: string;
  supportsImport: boolean;
  mapping: Record<string, string | null>;
  unknownColumns: string[];
  ignoredColumns: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: RowValidation[];
  errors: string[];
  warnings: string[];
}
