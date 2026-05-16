export type ImportFormat = "csv" | "xlsx" | "json" | "xml" | "ofx";
export type ExportFormat = "csv" | "xlsx" | "json" | "pdf";

export type ImportStatus = "idle" | "uploading" | "previewing" | "mapping" | "importing" | "done" | "error";
export type ExportStatus = "idle" | "generating" | "done" | "error";

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportJob {
  id: string;
  format: ImportFormat;
  status: ImportStatus;
  filename: string;
  module?: string;
  total_rows?: number | null;
  processed_rows?: number | null;
  errors?: ImportError[] | null;
  created_at?: string;
  completed_at?: string | null;
  /* camelCase aliases used in mock-data (kept for backward compat) */
  totalRows?: number | null;
  processedRows?: number | null;
  errorCount?: number;
  createdAt?: string;
  completedAt?: string | null;
  createdBy?: string;
  canRollback?: boolean;
}

export interface ExportJob {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  filename?: string | null;
  url?: string | null;
  created_at?: string;
  completed_at?: string | null;
  /* camelCase aliases used in mock-data */
  module?: string;
  totalRows?: number | null;
  createdAt?: string;
  completedAt?: string | null;
  createdBy?: string;
}

export type AuditAction = "import" | "export" | "create" | "update" | "delete" | "login" | "permission";
export type AuditStatus = "success" | "error" | "warning";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  status: AuditStatus;
  module: string;
  user: string;
  description: string;
  recordCount?: number | null;
  userEmail?: string | null;
  createdAt: string;
  /* snake_case server fields (optional for compatibility) */
  user_id?: string | null;
  entity_type?: string;
  entity_id?: string | null;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: string;
}
