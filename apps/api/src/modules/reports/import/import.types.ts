/**
 * modules/reports/import/import.types.ts  ·  FASE 2.3A
 * Validação de importação (upload → parse → mapping → preview → validação).
 * NENHUMA persistência nesta fase.
 */
export type ImportFormat = 'xlsx';
export const IMPORT_MAX_ROWS = 5000;

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
}

export interface RowIssue {
  column: string;
  message: string;
}

export interface RowValidation {
  index: number;
  /** Dados normalizados (chave técnica → valor coergido). Preview, não persistido. */
  data: Record<string, unknown>;
  valid: boolean;
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface ImportValidationResult {
  entity: string;
  supportsImport: boolean;
  /** Cabeçalho do arquivo → coluna técnica (ou null se desconhecido). */
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
