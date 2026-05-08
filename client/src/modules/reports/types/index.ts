export type ReportModuleId =
  | "visao-geral"
  | "performance"
  | "financeiro"
  | "contratos"
  | "catalogo"
  | "distribuicao"
  | "royalties"
  | "importacoes"
  | "exportacoes"
  | "auditoria"
  | "logs"
  | "analytics";

export type ImportFormat = "csv" | "xlsx" | "json" | "xml";
export type ExportFormat = "csv" | "xlsx" | "pdf" | "json";

export type ImportStatus = "idle" | "uploading" | "parsing" | "validating" | "mapping" | "importing" | "done" | "error" | "rolled_back";
export type ExportStatus = "idle" | "generating" | "done" | "error";

export interface ImportJob {
  id: string;
  filename: string;
  format: ImportFormat;
  module: string;
  status: ImportStatus;
  totalRows: number;
  processedRows: number;
  errorCount: number;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  errors: ImportError[];
  canRollback: boolean;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ExportJob {
  id: string;
  format: ExportFormat;
  module: string;
  status: ExportStatus;
  totalRows: number;
  filename: string;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  filters?: Record<string, string>;
}

export interface AuditLogEntry {
  id: string;
  action: "import" | "export" | "create" | "update" | "delete" | "login" | "permission";
  module: string;
  user: string;
  userEmail: string;
  description: string;
  recordCount?: number;
  status: "success" | "error" | "warning";
  createdAt: string;
  metadata?: Record<string, string | number>;
}

export interface ReportKPI {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  format?: "number" | "currency" | "percent";
}

export interface ColumnPreset {
  id: string;
  label: string;
  columns: string[];
  isDefault?: boolean;
}

export interface ExportConfig {
  format: ExportFormat;
  columns: string[];
  filters: Record<string, string>;
  dateFrom?: string;
  dateTo?: string;
  preset?: string;
}
