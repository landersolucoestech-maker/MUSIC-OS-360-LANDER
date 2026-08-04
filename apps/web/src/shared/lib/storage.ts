import { NotFoundError, IntegrationError } from "./errors";
import { api, TABLE_ENDPOINT, PENDING_TABLES } from "./api-client";

export type StorageRow = Record<string, unknown> & { id: string };

export interface ListOptions {
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  _bypassTenant?: boolean;
}

export interface AuditEntry {
  id: string;
  entity: string;
  entity_id: string;
  action: "create" | "update" | "delete";
  before: unknown;
  after: unknown;
  org_id: string | null;
  user_id: string;
  timestamp: string;
  version_after?: number;
}

interface ListEnvelope<T> {
  data: T[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

interface StoragePort {
  runInTransaction<T>(callback: () => Promise<T>): Promise<T>;
  list<T extends StorageRow>(table: string, options?: ListOptions): Promise<T[]>;
  findById<T extends StorageRow>(table: string, id: string): Promise<T | undefined>;
  getById<T extends StorageRow>(table: string, id: string): Promise<T | undefined>;
  create<T extends StorageRow>(
    table: string,
    data: Omit<T, "id" | "user_id" | "created_at" | "updated_at">,
  ): Promise<T>;
  update<T extends StorageRow>(table: string, id: string, data: Partial<T>): Promise<T>;
  updateOptimistic<T extends StorageRow>(
    table: string,
    id: string,
    data: Partial<T>,
    expectedVersion: number,
  ): Promise<T>;
  delete(table: string, id: string): Promise<void>;
  getAuditLog(filters?: {
    entity?: string;
    entity_id?: string;
    action?: "create" | "update" | "delete";
    limit?: number;
  }): Promise<AuditEntry[]>;
  raw(): never;
  getRaw<T>(key: string): T | null;
  setRaw<T>(key: string, value: T): void;
}

const pendingTablesWarned = new Set<string>();

function resolveTable(table: string): { ep: string } | { pending: true; reason: string } {
  const ep = TABLE_ENDPOINT[table];
  if (ep) return { ep };
  const reason = PENDING_TABLES[table];
  if (reason) {
    if (!pendingTablesWarned.has(table)) {
      pendingTablesWarned.add(table);
      console.warn(`[storage:http] ${table}: ${reason}. Module unavailable until backend route ships.`);
    }
    return { pending: true, reason };
  }
  throw new IntegrationError("storage", `Unknown table "${table}". Add it to TABLE_ENDPOINT or PENDING_TABLES in api-client.ts.`);
}

function unavailableTable(table: string, reason: string): never {
  throw new IntegrationError(
    "module-unavailable",
    `Modulo "${table}" indisponivel nesta versao: ${reason}`,
    { retryable: false, statusCode: 503 },
  );
}

function unwrapList<T>(response: T[] | ListEnvelope<T>, table: string): T[] {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.data)) return response.data;
  throw new IntegrationError(
    "storage",
    `Resposta inválida ao listar "${table}": esperado array ou envelope paginado { data, meta }.\`,
  );
}

const httpStorage: StoragePort = {
  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },

  async list<T extends StorageRow>(table: string, options?: ListOptions): Promise<T[]> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) unavailableTable(table, resolved.reason);
    const params = new URLSearchParams();
    if (options?.filters) {
      for (const [k, v] of Object.entries(options.filters)) {
        if (v != null) params.set(k, String(v));
      }
    }
    if (options?.orderBy) {
      params.set("orderBy", options.orderBy.column);
      params.set("ascending", String(options.orderBy.ascending ?? false));
    }
    if (options?.limit !== undefined) params.set("limit", String(options.limit));
    if (options?.offset !== undefined) params.set("offset", String(options.offset));
    const qs = params.toString();
    const response = await api.get<T[] | ListEnvelope<T>>(`${resolved.ep}${qs ? `?${qs}` : ""}`);
    return unwrapList(response, table);
  },

  async findById<T extends StorageRow>(table: string, id: string): Promise<T | undefined> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) unavailableTable(table, resolved.reason);
    try {
      return await api.get<T>(`${resolved.ep}/${id}`);
    } catch (err) {
      if (err instanceof NotFoundError) return undefined;
      throw err;
    }
  },

  async getById<T extends StorageRow>(table: string, id: string): Promise<T | undefined> {
    return httpStorage.findById<T>(table, id);
  },

  async create<T extends StorageRow>(
    table: string,
    data: Omit<T, "id" | "user_id" | "created_at" | "updated_at">,
  ): Promise<T> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) unavailableTable(table, resolved.reason);
    return api.post<T>(resolved.ep, data);
  },

  async update<T extends StorageRow>(table: string, id: string, data: Partial<T>): Promise<T> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) unavailableTable(table, resolved.reason);
    return api.patch<T>(`${resolved.ep}/${id}`, data);
  },

  async updateOptimistic<T extends StorageRow>(
    table: string,
    id: string,
    data: Partial<T>,
    _expectedVersion: number,
  ): Promise<T> {
    return httpStorage.update<T>(table, id, data);
  },

  async delete(table: string, id: string): Promise<void> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) unavailableTable(table, resolved.reason);
    return api.delete(`${resolved.ep}/${id}`);
  },

  async getAuditLog(filters?: {
    entity?: string;
    entity_id?: string;
    action?: "create" | "update" | "delete";
    limit?: number;
  }): Promise<AuditEntry[]> {
    const params = new URLSearchParams();
    if (filters?.entity) params.set("entity", filters.entity);
    if (filters?.entity_id) params.set("entity_id", filters.entity_id);
    if (filters?.action) params.set("action", filters.action);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    const response = await api.get<AuditEntry[] | ListEnvelope<AuditEntry>>(`/audit-log${qs ? `?${qs}` : ""}`);
    return unwrapList(response, "audit-log");
  },

  raw(): never {
    throw new IntegrationError("storage", "storage.raw() is unavailable; use a backend endpoint.");
  },

  getRaw<T>(_key: string): T | null {
    throw new IntegrationError("storage", "storage.getRaw() is unavailable; use a backend endpoint.");
  },

  setRaw<T>(_key: string, _value: T): void {
    throw new IntegrationError("storage", "storage.setRaw() is unavailable; use a backend endpoint.");
  },
};

export const storage: StoragePort = httpStorage;
