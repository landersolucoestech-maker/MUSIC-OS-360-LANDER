// ─── Resposta padrão da API ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
  timestamp: string;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ─── Erro padrão da API ───────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}

// ─── Paginação ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
  search?: string;
}

// ─── Auditoria ────────────────────────────────────────────────────────────────

export interface AuditableEntity {
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

// ─── Multi-tenant ─────────────────────────────────────────────────────────────

export interface TenantScoped {
  tenant_id: string;
}
