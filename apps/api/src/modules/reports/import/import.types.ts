/**
 * modules/reports/import/import.types.ts  ·  FASE 2.3A
 * Validação de importação (upload → parse → mapping → preview → validação).
 * NENHUMA persistência nesta fase.
 */
export type ImportFormat = 'xlsx';
export const IMPORT_MAX_ROWS = 5000;
/**
 * Defense-in-depth cap on raw bytes handed to XLSX.read(), independent of
 * the global JSON body-size limit (see scripts/verify-body-limit-guard.mjs).
 * xlsx has no patched release for its known prototype-pollution/ReDoS
 * advisories (scripts/dependency-audit-waivers.json) — bounding input size
 * here protects this path even if the body-parser's own limit ever changes.
 */
export const IMPORT_MAX_BYTES = 1024 * 1024;
export const IMPORT_MAX_SHEETS = 20;

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
  /** Coluna tem DEFAULT no schema (Postgres preenche se omitida do INSERT). */
  hasDefault: boolean;
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
