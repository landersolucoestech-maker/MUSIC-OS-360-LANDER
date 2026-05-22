/**
 * HTTP API Client — singleton que gerencia tokens e faz requisições ao backend.
 *
 * - Injeta Authorization: Bearer <token> automaticamente
 * - Injeta X-Tenant-ID automaticamente
 * - Converte erros HTTP para subclasses de DomainError (instanceof funciona)
 * - Token lifecycle gerenciado pelo Supabase SDK via AuthContext.tsx
 *   (auto-refresh, persistência e rotação são responsabilidade do SDK)
 * - Tabelas sem endpoint backend → fallback para dados em memória (mock)
 */
import {
  ValidationError,
  TenantError,
  NotFoundError,
  ConflictError,
  IntegrationError,
} from "./errors";
import { API_BASE_URL } from "./env";

let _accessToken: string | null = null;
let _tenantId: string | null = null;

export function setAccessToken(t: string | null): void {
  _accessToken = t;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setTenantId(tenantId: string | null): void {
  _tenantId = tenantId;
}

export function getTenantId(): string | null {
  return _tenantId;
}

export const TABLE_ENDPOINT: Record<string, string> = {
  artistas: "/artists",
  obras: "/works",
  fonogramas: "/phonograms",
  shares: "/shares",
  contratos: "/contracts",
  templates_contratos: "/contract-templates",
  transacoes: "/transactions",
  leads: "/leads",
  clientes: "/clients",
  contatos: "/clients",
  campanhas: "/campaigns",
  conteudos: "/content-detections",
  briefings: "/briefings",
  takedowns: "/takedowns",
  projetos: "/projects",
  eventos: "/events",
  funcionarios: "/hr/employees",
  folha_pagamento: "/hr/payroll",
  afastamentos: "/hr/leave-requests",
  ferias_ausencias: "/hr/leave-requests",
  usuarios: "/users",
  org_members: "/users",
  lancamentos: "/releases",
  notas_fiscais: "/invoices",
  lead_interactions: "/lead-interactions",
  metas_artistas: "/artist-goals",
  relatorios_ecad: "/ecad-reports",
  deteccoes: "/content-detections",
  documentos_funcionario: "/hr/employees",
  support_tickets: "/support-tickets",
  audit_logs: "/audit-logs",
  inventario: "/inventory",
  licencas: "/licenses",
  regras_financeiras: "/financial-rules",
};

export const PENDING_TABLES: Record<string, string> = {
  regras: "Rules UI storage table has no backend controller",
  tarefas_marketing: "Marketing tasks have no backend controller",
  monitoramentos: "Monitoring table has no backend controller",
  roles: "RBAC is currently exposed through /users and auth context, not a /roles CRUD",
  permissions: "Permissions are computed server-side, not exposed as a /permissions CRUD",
};

async function mapError(res: Response): Promise<never> {
  let body: { message?: string | string[] } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {}

  const rawMsg = body.message;
  const msg = Array.isArray(rawMsg) ? rawMsg.join("; ") : (rawMsg ?? res.statusText);

  switch (res.status) {
    case 400:
      throw new ValidationError(msg);
    case 403:
      throw new TenantError("", "", msg);
    case 404:
      throw new NotFoundError(msg, "");
    case 409:
      throw new ConflictError(msg);
    default:
      throw new IntegrationError("api", msg, { statusCode: res.status });
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  if (_tenantId) {
    headers["X-Tenant-ID"] = _tenantId;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    setAccessToken(null);
  }

  if (!res.ok) {
    return mapError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (path: string) =>
    request<void>(path, {
      method: "DELETE",
    }),
};
