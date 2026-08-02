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
  PasswordChangeRequiredError,
} from "./errors";
import { API_BASE_URL } from "./env";

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

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
  contract_templates: "/contract-templates",
  transacoes: "/transactions",
  leads: "/leads",
  clientes: "/clients",
  contatos: "/clients",
  campanhas: "/campaigns",
  marketing_projects: "/marketing/projects",
  conteudos: "/marketing/contents",
  briefings: "/briefings",
  takedowns: "/takedowns",
  projetos: "/projects",
  eventos: "/events",
  funcionarios: "/hr/employees",
  folha_pagamento: "/hr/payroll",
  afastamentos: "/hr/leave-requests",
  ferias_ausencias: "/hr/leave-requests",
  usuarios: "/users",
  users: "/users",
  org_members: "/users",
  lancamentos: "/releases",
  notas_fiscais: "/invoices",
  proposals: "/proposals",
  proposal_items: "/proposal-items",
  followups: "/followups",
  lead_interactions: "/lead-interactions",
  metas_artistas: "/artist-goals",
  relatorios_ecad: "/ecad-reports",
  ecad_reports: "/ecad-reports",
  deteccoes: "/content-detections",
  content_detections: "/content-detections",
  documentos_funcionario: "/hr/employees",
  support_tickets: "/support-tickets",
  audit_logs: "/audit-logs",
  inventario: "/inventory",
  licencas: "/licenses",
  regras_financeiras: "/financial-rules",
  financial_categories: "/financial-categories",
  categorias_financeiras: "/financial-categories",
};

export const PENDING_TABLES: Record<string, string> = {
  regras: "Rules UI storage table has no backend controller",
  tarefas_marketing: "Marketing tasks have no backend controller",
  monitoramentos: "Monitoring table has no backend controller",
  roles: "RBAC is currently exposed through /users and auth context, not a /roles CRUD",
  permissions: "Permissions are computed server-side, not exposed as a /permissions CRUD",
  integrations: "Integrations are exposed via sub-routes (integrations/autentique, integrations/external-data), not a flat /integrations CRUD",
  regras_transacao: "Transaction-categorization rules have no backend controller yet",
  contract_service_types: "Contract service types have no dedicated backend controller",
};

async function mapError(res: Response): Promise<never> {
  let body: { message?: string | string[]; error?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {}

  const rawMsg = body.message;
  const msg = Array.isArray(rawMsg) ? rawMsg.join("; ") : (rawMsg ?? res.statusText);

  switch (res.status) {
    case 400:
      throw new ValidationError(msg);
    case 403:
      // GlobalExceptionFilter preserva o `error` code de guards como
      // MustChangePasswordGuard (ver apps/api/.../global-exception.filter.ts) —
      // sem isso, todo 403 virava um TenantError genérico e o frontend não
      // tinha como saber que precisava mostrar a tela de troca de senha.
      if (body.error === "MUST_CHANGE_PASSWORD") {
        throw new PasswordChangeRequiredError(msg);
      }
      throw new TenantError("", "", msg);
    case 404:
      throw new NotFoundError(msg, "");
    case 409:
      throw new ConflictError(msg);
    default:
      throw new IntegrationError("api", msg, { statusCode: res.status });
  }
}

// ── 401 circuit-breaker — stops polling/request storms when auth is invalid ──
// After a 401 we short-circuit further requests for AUTH_BACKOFF_MS so 30+ background
// pollers don't flood the API while React Query/etc. realise auth is gone.
const AUTH_BACKOFF_MS = 30_000;
let _authFailUntil = 0;
const _authBus = new EventTarget();

export function onAuthInvalidated(listener: () => void): () => void {
  const fn = () => listener();
  _authBus.addEventListener('invalid', fn);
  return () => _authBus.removeEventListener('invalid', fn);
}

export function clearAuthBackoff(): void {
  _authFailUntil = 0;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Short-circuit during auth backoff window — don't hit network.
  if (Date.now() < _authFailUntil) {
    throw new IntegrationError('api', 'Auth invalidated — request paused', { statusCode: 401 });
  }

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
    if (_authFailUntil < Date.now()) {
      _authFailUntil = Date.now() + AUTH_BACKOFF_MS;
      _authBus.dispatchEvent(new Event('invalid'));
    }
  }

  if (!res.ok) {
    return mapError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const payload = (await res.json()) as ApiResponse<T>;
  return payload.data;
}

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined ?? {}),
    },
  });
  if (!res.ok) return mapError(res);
  if (res.status === 204) return undefined as T;
  const payload = (await res.json()) as ApiResponse<T>;
  return payload.data;
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
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (path: string) =>
    request<void>(path, {
      method: "DELETE",
    }),
};

export const publicApi = {
  get: <T>(path: string) => publicRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    publicRequest<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
