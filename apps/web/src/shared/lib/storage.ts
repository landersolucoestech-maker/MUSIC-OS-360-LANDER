/**
 * Storage abstraction layer — porta única de acesso a dados.
 *
 * VITE_MOCK_MODE=true  (desenvolvimento padrão):
 *   → Usa MOCK_DATA/localStorage — comportamento idêntico ao modo standalone.
 * VITE_MOCK_MODE=false (produção / backend disponível):
 *   → Usa HTTP API real (api-client.ts).
 *   → Tabelas sem endpoint no backend fazem fallback para in-memory.
 *
 * Contrato público (nomes e parâmetros) idêntico ao modo mock.
 * Hooks, services e use-cases não percebem a troca.
 */
import { MOCK_DATA, MOCK_USER_ID, saveMockData } from "@/shared/data/mockData";
import { getCurrentOrgId } from "./tenant";
import { TenantError, NotFoundError, TransactionError, ConflictError, IntegrationError } from "./errors";
import { api, TABLE_ENDPOINT, PENDING_TABLES } from "./api-client";
import { MOCK_MODE } from "./env";
import { stripUnsafeKeys } from "./safe-object";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type StorageRow = Record<string, unknown> & { id: string };

export interface ListOptions {
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  /** Número máximo de registos a retornar. Undefined = sem limite. */
  limit?: number;
  /** Índice do primeiro registo a retornar (0-based). */
  offset?: number;
  /** Passa true para ignorar o filtro de tenant (uso interno apenas). */
  _bypassTenant?: boolean;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

/** Entrada de auditoria imutável. */
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

const AUDIT_TABLE = "_audit_log";
const AUDIT_MAX_ENTRIES = 2000;

function writeAuditEntry(entry: Omit<AuditEntry, "id">): void {
  try {
    if (!MOCK_DATA[AUDIT_TABLE]) MOCK_DATA[AUDIT_TABLE] = [];
    const log = MOCK_DATA[AUDIT_TABLE] as AuditEntry[];
    const auditEntry: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    log.unshift(auditEntry);
    if (log.length > AUDIT_MAX_ENTRIES) log.splice(AUDIT_MAX_ENTRIES);
  } catch { /* audit nunca deve interromper operações de negócio */ }
}

// ─── Tenant enforcement (mock mode) ──────────────────────────────────────────

const TENANT_SCOPED_TABLES = new Set([
  "artistas", "clientes", "contatos", "leads", "proposals", "proposal_items", "followups", "contratos",
  "obras", "fonogramas", "shares", "lancamentos", "transacoes",
  "notas_fiscais", "projetos", "eventos", "inventario",
  "campanhas", "marketing_projects", "conteudos", "briefings", "tarefas_marketing",
  "metas_artistas", "monitoramentos", "licencas", "regras_financeiras",
  "ecad_reports", "funcionarios", "folha_pagamento",
  "afastamentos", "documentos_funcionario",
]);

function isTenantScoped(table: string): boolean {
  return TENANT_SCOPED_TABLES.has(table);
}

function assertRecordTenant(record: StorageRow, table: string, operation: string): void {
  if (!isTenantScoped(table)) return;
  const orgId = record["org_id"];
  if (!orgId) return;
  const currentOrg = getCurrentOrgId();
  if (orgId !== currentOrg)
    throw new TenantError(currentOrg, orgId as string, `${operation} em "${table}"`);
}

// ─── Helpers internos (mock mode) ────────────────────────────────────────────

function applyFilters<T extends StorageRow>(rows: T[], filters?: Record<string, unknown>): T[] {
  if (!filters) return rows;
  return rows.filter((row) =>
    Object.entries(filters).every(([k, v]) => v === undefined || v === null || row[k] === v),
  );
}

function sortRows<T extends StorageRow>(
  rows: T[],
  orderBy: { column: string; ascending?: boolean } = { column: "created_at", ascending: false },
): T[] {
  const ascending = orderBy.ascending ?? false;
  return [...rows].sort((a, b) => {
    const av = a[orderBy.column];
    const bv = b[orderBy.column];
    if (av === bv) return 0;
    if (av == null) return ascending ? -1 : 1;
    if (bv == null) return ascending ? 1 : -1;
    if (av < bv) return ascending ? -1 : 1;
    if (av > bv) return ascending ? 1 : -1;
    return 0;
  });
}

// ─── Mock implementation ──────────────────────────────────────────────────────

const mockStorage = {
  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    const snapshot = JSON.parse(JSON.stringify(MOCK_DATA)) as Record<string, unknown>;
    try {
      return await callback();
    } catch (err) {
      Object.keys(MOCK_DATA).forEach((k) => { delete (MOCK_DATA as Record<string, unknown>)[k]; });
      Object.assign(MOCK_DATA, snapshot);
      saveMockData();
      throw new TransactionError(err);
    }
  },

  async list<T extends StorageRow>(table: string, options?: ListOptions): Promise<T[]> {
    const rows = (MOCK_DATA[table] ?? []) as T[];
    let filtered: T[];
    if (isTenantScoped(table) && !options?._bypassTenant) {
      const orgId = getCurrentOrgId();
      filtered = applyFilters(rows.filter((r) => !r["org_id"] || r["org_id"] === orgId), options?.filters);
    } else {
      filtered = applyFilters(rows, options?.filters);
    }
    const sorted = sortRows(filtered, options?.orderBy ?? { column: "created_at", ascending: false });
    const offset = options?.offset ?? 0;
    const limit  = options?.limit;
    return limit !== undefined ? sorted.slice(offset, offset + limit) : sorted.slice(offset);
  },

  async findById<T extends StorageRow>(table: string, id: string): Promise<T | undefined> {
    const rows = (MOCK_DATA[table] ?? []) as T[];
    const record = rows.find((r) => r.id === id);
    if (!record) return undefined;
    if (isTenantScoped(table)) {
      const orgId = record["org_id"];
      if (orgId && orgId !== getCurrentOrgId()) return undefined;
    }
    return record;
  },

  async getById<T extends StorageRow>(table: string, id: string): Promise<T | undefined> {
    return mockStorage.findById<T>(table, id);
  },

  async create<T extends StorageRow>(
    table: string,
    data: Omit<T, "id" | "user_id" | "created_at" | "updated_at">,
  ): Promise<T> {
    const now = new Date().toISOString();
    const orgId = isTenantScoped(table) ? getCurrentOrgId() : undefined;
    const newRow = {
      ...stripUnsafeKeys(data as Record<string, unknown>),
      ...(orgId !== undefined && { org_id: orgId }),
      id: `mock-${table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: MOCK_USER_ID,
      version: 1,
      created_at: now,
      updated_at: now,
    } as unknown as T;
    if (!MOCK_DATA[table]) MOCK_DATA[table] = [];
    (MOCK_DATA[table] as T[]).unshift(newRow);
    writeAuditEntry({
      entity: table, entity_id: newRow.id, action: "create", before: null,
      after: { ...newRow }, org_id: (orgId as string) ?? null, user_id: MOCK_USER_ID,
      timestamp: now, version_after: 1,
    });
    saveMockData();
    return newRow;
  },

  async update<T extends StorageRow>(table: string, id: string, data: Partial<T>): Promise<T> {
    const rows = (MOCK_DATA[table] ?? []) as T[];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(table, id);
    assertRecordTenant(rows[idx], table, "update");
    const before = { ...rows[idx] };
    const { org_id: _dropped, version: _v, ...safeData } = data as Record<string, unknown>;
    const currentVersion = (rows[idx]["version"] as number) ?? 0;
    // Merge com guarda explícita por chave em AMBAS as fontes (registro
    // existente + payload do usuário): nenhuma cópia de __proto__/constructor/
    // prototype, sem spread de entrada não confiável (prototype pollution, CWE-915).
    const updated: Record<string, unknown> = {};
    const current = rows[idx] as Record<string, unknown>;
    for (const k of Object.keys(current)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      updated[k] = current[k];
    }
    for (const k of Object.keys(safeData)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      updated[k] = safeData[k];
    }
    updated["version"] = currentVersion + 1;
    updated["updated_at"] = new Date().toISOString();
    rows[idx] = updated as T;
    writeAuditEntry({
      entity: table, entity_id: id, action: "update", before, after: { ...updated },
      org_id: (rows[idx]["org_id"] as string | null) ?? null, user_id: MOCK_USER_ID,
      timestamp: updated["updated_at"] as string, version_after: currentVersion + 1,
    });
    saveMockData();
    return updated as T;
  },

  async updateOptimistic<T extends StorageRow>(table: string, id: string, data: Partial<T>, expectedVersion: number): Promise<T> {
    const rows = (MOCK_DATA[table] ?? []) as T[];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(table, id);
    const currentVersion = (rows[idx]["version"] as number) ?? 1;
    if (currentVersion !== expectedVersion)
      throw new ConflictError(
        `[optimistic-lock] Conflito de versão em "${table}" id="${id}": ` +
        `esperado v${expectedVersion}, encontrado v${currentVersion}. Recarregue os dados e tente novamente.`,
        "version",
      );
    return mockStorage.update<T>(table, id, data);
  },

  async delete(table: string, id: string): Promise<void> {
    const rows = (MOCK_DATA[table] ?? []) as StorageRow[];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return;
    assertRecordTenant(rows[idx], table, "delete");
    const before = { ...rows[idx] };
    const orgId = rows[idx]["org_id"] as string | null;
    rows.splice(idx, 1);
    writeAuditEntry({
      entity: table, entity_id: id, action: "delete", before, after: null,
      org_id: orgId ?? null, user_id: MOCK_USER_ID, timestamp: new Date().toISOString(),
    });
    saveMockData();
  },

  async getAuditLog(filters?: { entity?: string; entity_id?: string; action?: "create" | "update" | "delete"; limit?: number }): Promise<AuditEntry[]> {
    let result = (MOCK_DATA[AUDIT_TABLE] ?? []) as AuditEntry[];
    if (filters?.entity)    result = result.filter((e) => e.entity    === filters.entity);
    if (filters?.entity_id) result = result.filter((e) => e.entity_id === filters.entity_id);
    if (filters?.action)    result = result.filter((e) => e.action    === filters.action);
    return result.slice(0, filters?.limit ?? 200);
  },

  raw(): typeof MOCK_DATA { return MOCK_DATA; },
  getRaw<T>(key: string): T | null { return (MOCK_DATA[key] as T) ?? null; },
  setRaw<T>(key: string, value: T): void {
    (MOCK_DATA as Record<string, unknown>)[key] = value;
    saveMockData();
  },
};

// ─── HTTP implementation ──────────────────────────────────────────────────────

/** Tracks which pending tables we've already warned about (avoid log spam). */
const _pendingTablesWarned = new Set<string>();

/**
 * Returns the backend endpoint for a table or throws.
 *
 * Three cases in HTTP mode (VITE_USE_MOCK=false):
 *   1. TABLE_ENDPOINT has the table   → return endpoint, call backend.
 *   2. PENDING_TABLES has the table   → degrade gracefully:
 *        • reads → return empty/undefined (no crash, UI shows empty state).
 *        • writes → throw a user-friendly UnavailableError that the UI can catch.
 *   3. Neither                        → throw IntegrationError (unknown table).
 *
 * Case 2 is EXPLICIT per-table (not a silent global fallback): every pending
 * table is named with its reason in PENDING_TABLES in api-client.ts.
 */
function resolveTable(table: string): { ep: string } | { pending: true; reason: string } {
  const ep = TABLE_ENDPOINT[table];
  if (ep) return { ep };
  const reason = PENDING_TABLES[table];
  if (reason) {
    if (!_pendingTablesWarned.has(table)) {
      _pendingTablesWarned.add(table);
      // eslint-disable-next-line no-console
      console.warn(`[storage:http] ${table}: ${reason}. Module operates in read-only empty-state mode until backend route ships.`);
    }
    return { pending: true, reason };
  }
  throw new IntegrationError("storage", `Unknown table "${table}". Add it to TABLE_ENDPOINT or PENDING_TABLES in api-client.ts.`);
}

/**
 * Erro lançado para mutations em tabelas pendentes em produção HTTP mode.
 * UI deve tratar e mostrar "Módulo indisponível nesta versão".
 */
function unavailableTable(table: string, reason: string): never {
  throw new IntegrationError(
    "module-unavailable",
    `Módulo "${table}" indisponível nesta versão: ${reason}`,
    { retryable: false, statusCode: 503 },
  );
}

const httpStorage = {
  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },

  async list<T extends StorageRow>(table: string, options?: ListOptions): Promise<T[]> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) {
      unavailableTable(table, resolved.reason);
    }
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
    if (options?.limit  !== undefined) params.set("limit",  String(options.limit));
    if (options?.offset !== undefined) params.set("offset", String(options.offset));
    const qs = params.toString();
    const rows = await api.get<T[]>(`${resolved.ep}${qs ? `?${qs}` : ""}`);
    return rows;
  },

  async findById<T extends StorageRow>(table: string, id: string): Promise<T | undefined> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) {
      unavailableTable(table, resolved.reason);
    }
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
    if ("pending" in resolved) {
      unavailableTable(table, resolved.reason);
    }
    return api.post<T>(resolved.ep, data);
  },

  async update<T extends StorageRow>(table: string, id: string, data: Partial<T>): Promise<T> {
    const resolved = resolveTable(table);
    if ("pending" in resolved) {
      unavailableTable(table, resolved.reason);
    }
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
    if ("pending" in resolved) {
      unavailableTable(table, resolved.reason);
    }
    return api.delete(`${resolved.ep}/${id}`);
  },

  async getAuditLog(filters?: {
    entity?: string;
    entity_id?: string;
    action?: "create" | "update" | "delete";
    limit?: number;
  }): Promise<AuditEntry[]> {
    const params = new URLSearchParams();
    if (filters?.entity)    params.set("entity",    filters.entity);
    if (filters?.entity_id) params.set("entity_id", filters.entity_id);
    if (filters?.action)    params.set("action",    filters.action);
    if (filters?.limit)     params.set("limit",     String(filters.limit));
    const qs = params.toString();
    return api.get<AuditEntry[]>(`/audit-log${qs ? `?${qs}` : ""}`);
  },

  raw(): typeof MOCK_DATA { return MOCK_DATA; },
  getRaw<T>(key: string): T | null { return (MOCK_DATA[key] as T) ?? null; },
  setRaw<T>(key: string, value: T): void {
    (MOCK_DATA as Record<string, unknown>)[key] = value;
    saveMockData();
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Implementação ativa de storage.
 * Em modo mock: operações async sobre MOCK_DATA/localStorage.
 * Em modo HTTP: chamadas REST ao backend NestJS (fallback in-memory para tabelas sem endpoint).
 * Ambas as implementações partilham a mesma interface async — sem cast inseguro.
 */
export const storage: typeof mockStorage = MOCK_MODE ? mockStorage : httpStorage;
