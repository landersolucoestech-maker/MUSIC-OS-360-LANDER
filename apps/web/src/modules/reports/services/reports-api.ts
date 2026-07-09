/**
 * modules/reports/services/reports-api.ts
 *
 * Cliente da Central de Relatórios. Consome exclusivamente os endpoints reais
 * do backend, sem fallback local.
 */
import { api, getAccessToken, getTenantId } from "@/shared/lib/api-client";
import { API_BASE_URL } from "@/shared/lib/env";

export type ExportFormat = "xlsx";

export interface ReportColumnMeta {
  name: string;
  label: string | null;
  type: string;
  nullable: boolean;
  primary: boolean;
  isEnum: boolean;
  enumValues?: string[];
}

export interface ReportEntity {
  entityName: string;
  tableName: string;
  /** Label pt-BR da entidade resolvido pelo backend (camada i18n central). */
  label: string | null;
  category: string;
  reportable: boolean;
  columns: ReportColumnMeta[];
  hasTenantId: boolean;
  hasSoftDelete: boolean;
  hasTimestamps: boolean;
  risks: string[];
}

export interface EntitiesInventory {
  totalEntities: number;
  reportableEntities: number;
  nonReportableEntities: number;
  unknownEntities: number;
  entities: ReportEntity[];
}

export interface ReportEntityDefinition {
  entityName: string;
  tableName: string;
  category: string;
  identityColumn: string;
  displayColumn: string;
  dateColumn: string;
  exportableColumns: string[];
  importableColumns: string[];
  filterableColumns: string[];
  sortableColumns: string[];
  searchableColumns: string[];
  sensitiveColumns: string[];
  requiredImportColumns: string[];
  supportsExport: boolean;
  supportsImport: boolean;
}

export interface ImportRowValidation {
  index: number;
  data: Record<string, unknown>;
  valid: boolean;
  errors: { column: string; message: string }[];
  warnings: { column: string; message: string }[];
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
  rows: ImportRowValidation[];
  errors: string[];
  warnings: string[];
}

export interface ImportCommitResult {
  entity: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  warnings: string[];
  errors: string[];
}

export interface ExportParams {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, string>;
  sort?: string;
  order?: "ASC" | "DESC";
  page?: number;
  pageSize?: number;
}

function buildExportQuery(params: ExportParams): string {
  const q = new URLSearchParams();
  q.set("format", params.format);
  if (params.columns?.length) q.set("columns", params.columns.join(","));
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  for (const [k, v] of Object.entries(params.filters ?? {})) {
    if (v !== "" && v != null) q.set(k, v);
  }
  return q.toString();
}

export const reportsApi = {
  /** GET /reports/entities — inventário classificado. */
  entities: () => api.get<EntitiesInventory>("/reports/entities"),

  /** GET /reports/definitions — contratos das entidades reportáveis. */
  definitions: () => api.get<ReportEntityDefinition[]>("/reports/definitions"),

  /**
   * GET /reports/entities/:entity/export — XLSX como Blob (download).
   * Usa fetch direto (o api client desserializa JSON), reaproveitando token+tenant.
   */
  exportBlob: async (entity: string, params: ExportParams): Promise<{ blob: Blob; filename: string }> => {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    const tenant = getTenantId();

    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenant) headers["X-Tenant-ID"] = tenant;

    const res = await fetch(
      `${API_BASE_URL}/api/v1/reports/entities/${entity}/export?${buildExportQuery(params)}`,
      {
        headers,
        credentials: "include",
      },
    );

    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(`Exportação falhou (${res.status})${message ? `: ${message}` : ""}`);
    }

    const cd = res.headers.get("content-disposition") ?? "";
    const filename = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? `${entity}.${params.format}`;

    return {
      blob: await res.blob(),
      filename,
    };
  },

  /** POST /reports/entities/:entity/import/validate — preview, sem persistência. */
  importValidate: (entity: string, body: ImportUploadBody) =>
    api.post<ImportValidationResult>(`/reports/entities/${entity}/import/validate`, body),

  /** POST /reports/entities/:entity/import/commit — commit transacional create-only. */
  importCommit: (entity: string, body: ImportUploadBody) =>
    api.post<ImportCommitResult>(`/reports/entities/${entity}/import/commit`, body),
};

export interface ImportUploadBody {
  filename: string;
  contentBase64: string;
}

/** Lê um arquivo XLSX para o body de importação (base64). */
export async function fileToImportBody(file: File): Promise<ImportUploadBody> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { filename: file.name, contentBase64: btoa(binary) };
}

/** Dispara o download de um Blob no navegador. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
