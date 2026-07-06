/**
 * modules/reports/services/reports-api.ts
 *
 * FASE 2.5 — cliente da Central de Relatórios. Em runtime real, consome os
 * endpoints oficiais do backend (fonte única da verdade). Em modo local
 * standalone (MOCK_MODE/AUTH_DISABLED), usa MOCK_DATA para a tela não depender
 * da API enquanto a autenticação está desligada.
 */
import * as XLSX from "xlsx";
import { api, getAccessToken, getTenantId } from "@/shared/lib/api-client";
import { API_BASE_URL, AUTH_DISABLED, MOCK_MODE } from "@/shared/lib/env";
import { storage } from "@/shared/lib/storage";

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

const LOCAL_REPORTS_ENABLED = MOCK_MODE || AUTH_DISABLED;

const LOCAL_REPORT_ENTITIES: Array<{ tableName: string; label: string }> = [
  { tableName: "artistas", label: "Artistas" },
  { tableName: "contratos", label: "Contratos" },
  { tableName: "obras", label: "Obras" },
  { tableName: "fonogramas", label: "Fonogramas" },
  { tableName: "lancamentos", label: "Lançamentos" },
  { tableName: "transacoes", label: "Transações financeiras" },
  { tableName: "clientes", label: "Clientes" },
  { tableName: "leads", label: "Leads" },
  { tableName: "eventos", label: "Eventos" },
  { tableName: "projetos", label: "Projetos" },
  { tableName: "campanhas", label: "Campanhas" },
  { tableName: "licencas", label: "Licenças" },
  { tableName: "inventario", label: "Inventário" },
  { tableName: "notas_fiscais", label: "Notas fiscais" },
  { tableName: "shares", label: "Shares" },
  { tableName: "briefings", label: "Briefings" },
  { tableName: "conteudos", label: "Conteúdos" },
  { tableName: "metas_artistas", label: "Metas de artistas" },
  { tableName: "relatorios_ecad", label: "Relatórios ECAD" },
  { tableName: "funcionarios", label: "Colaboradores" },
  { tableName: "folha_pagamento", label: "Folha de pagamento" },
  { tableName: "ferias_ausencias", label: "Férias e ausências" },
];

function inferColumnType(value: unknown): string {
  if (value == null) return "unknown";
  if (Array.isArray(value)) return "jsonb";
  if (value instanceof Date) return "timestamp";
  return typeof value;
}

function localRows(tableName: string): Record<string, unknown>[] {
  return (storage.raw()[tableName] ?? []) as Record<string, unknown>[];
}

function localColumns(tableName: string): ReportColumnMeta[] {
  const rows = localRows(tableName);
  const names = new Set<string>();
  rows.slice(0, 10).forEach((row) => Object.keys(row).forEach((key) => names.add(key)));
  return Array.from(names).map((name) => {
    const sample = rows.find((row) => row[name] != null)?.[name];
    return {
      name,
      label: name,
      type: inferColumnType(sample),
      nullable: rows.some((row) => row[name] == null),
      primary: name === "id",
      isEnum: false,
    };
  });
}

function localEntities(): EntitiesInventory {
  const entities = LOCAL_REPORT_ENTITIES.map(({ tableName, label }) => ({
    entityName: tableName,
    tableName,
    label,
    category: "REPORTABLE",
    reportable: true,
    columns: localColumns(tableName),
    hasTenantId: localColumns(tableName).some((c) => c.name === "tenant_id" || c.name === "org_id"),
    hasSoftDelete: localColumns(tableName).some((c) => c.name === "deleted_at"),
    hasTimestamps: localColumns(tableName).some((c) => c.name === "created_at") &&
      localColumns(tableName).some((c) => c.name === "updated_at"),
    risks: [] as string[],
  }));
  return {
    totalEntities: entities.length,
    reportableEntities: entities.length,
    nonReportableEntities: 0,
    unknownEntities: 0,
    entities,
  };
}

function localDefinitions(): ReportEntityDefinition[] {
  return LOCAL_REPORT_ENTITIES.map(({ tableName }) => {
    const columns = localColumns(tableName).map((c) => c.name).filter((name) =>
      !["id", "user_id", "org_id", "tenant_id", "created_at", "updated_at", "version"].includes(name),
    );
    return {
      entityName: tableName,
      tableName,
      category: "REPORTABLE",
      identityColumn: columns[0] ?? "id",
      displayColumn: columns[0] ?? "id",
      dateColumn: "created_at",
      exportableColumns: columns,
      importableColumns: [],
      filterableColumns: columns,
      sortableColumns: columns,
      searchableColumns: columns,
      sensitiveColumns: [],
      requiredImportColumns: [],
      supportsExport: columns.length > 0,
      supportsImport: false,
    };
  });
}

// Limite real do Excel (OOXML) por célula é 32767 caracteres. Este é o ÚLTIMO
// ponto antes de escrever no Excel no caminho local/mock (LOCAL_REPORTS_ENABLED)
// — o caminho efetivamente usado pela UI quando VITE_USE_MOCK/VITE_AUTH_DISABLED
// estão ativos. Nenhuma célula chega ao XLSX sem passar por esta função.
export const EXCEL_CELL_MAX_CHARS = 32767;
const EXCEL_CELL_SAFE_CHARS = 32000;
const TRUNCATION_SUFFIX = "… [truncado: excede o limite de célula do Excel]";

/**
 * Única função de sanitização de célula do caminho local/mock de exportação.
 * - null/undefined → vazio
 * - objeto/array cru → NUNCA vira célula (campo técnico, não pertence ao formulário)
 * - string acima do limite do Excel → truncada com marcador explícito
 * - garante que o resultado final nunca ultrapassa EXCEL_CELL_MAX_CHARS
 */
export function sanitizeExcelCellValue(value: unknown, context: { entity: string; column: string }): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    // eslint-disable-next-line no-console
    console.warn(`[reports-export] campo técnico ignorado (objeto/array cru): ${context.entity}.${context.column}`);
    return "";
  }
  const text = value instanceof Date ? value.toLocaleDateString("pt-BR") : String(value);
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

export function serializeLocalRows(entity: string, rows: Record<string, unknown>[], columns: string[]): ArrayBuffer {
  const aoa = [
    columns,
    ...rows.map((row) => columns.map((column) => sanitizeExcelCellValue(row[column], { entity, column }))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entity.slice(0, 31) || "Export");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
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
  entities: () => LOCAL_REPORTS_ENABLED ? localEntities() : api.get<EntitiesInventory>("/reports/entities"),

  /** GET /reports/definitions — contratos das entidades reportáveis. */
  definitions: () => LOCAL_REPORTS_ENABLED ? localDefinitions() : api.get<ReportEntityDefinition[]>("/reports/definitions"),

  /**
   * GET /reports/entities/:entity/export — XLSX como Blob (download).
   * Usa fetch direto (o api client desserializa JSON), reaproveitando token+tenant.
   */
  exportBlob: async (entity: string, params: ExportParams): Promise<{ blob: Blob; filename: string }> => {
    if (LOCAL_REPORTS_ENABLED) {
      const def = localDefinitions().find((d) => d.tableName === entity);
      const columns = params.columns?.length ? params.columns : (def?.exportableColumns ?? []);
      const xlsx = serializeLocalRows(entity, localRows(entity), columns);
      return {
        blob: new Blob([xlsx], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        filename: `${entity}.xlsx`,
      };
    }
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    const tenant = getTenantId();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenant) headers["X-Tenant-ID"] = tenant;
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/entities/${entity}/export?${buildExportQuery(params)}`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Exportação falhou (${res.status})`);
    const cd = res.headers.get("content-disposition") ?? "";
    const filename = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? `${entity}.${params.format}`;
    return { blob: await res.blob(), filename };
  },

  /** POST /reports/entities/:entity/import/validate — preview, sem persistência. */
  importValidate: (entity: string, body: ImportUploadBody) =>
    LOCAL_REPORTS_ENABLED
      ? Promise.reject(new Error("Importação local indisponível em modo mock."))
      : api.post<ImportValidationResult>(`/reports/entities/${entity}/import/validate`, body),

  /** POST /reports/entities/:entity/import/commit — commit transacional create-only. */
  importCommit: (entity: string, body: ImportUploadBody) =>
    LOCAL_REPORTS_ENABLED
      ? Promise.reject(new Error("Importação local indisponível em modo mock."))
      : api.post<ImportCommitResult>(`/reports/entities/${entity}/import/commit`, body),
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
