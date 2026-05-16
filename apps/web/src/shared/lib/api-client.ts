/**
 * HTTP API Client — singleton que gerencia tokens e faz requisições ao backend.
 *
 * - Injeta Authorization: Bearer <token> automaticamente
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

// ─── Token management ─────────────────────────────────────────────────────────
// access_token: in-memory only.
// Atualizado automaticamente pelo SupabaseAuthProvider via onAuthStateChange.
// O refresh é responsabilidade do Supabase SDK — não fazemos /auth/refresh aqui.

let _accessToken: string | null = null;

export function setAccessToken(t: string | null): void {
  _accessToken = t;
}
export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── Config ──────────────────────────────────────────────────────────────────
// API_BASE_URL vem de shared/lib/env.ts — fonte única de verdade para env vars.

// ─── Table → REST endpoint map ───────────────────────────────────────────────

/**
 * Maps storage table names to their backend REST path prefixes.
 * All tables with a backend route must be listed here.
 */
export const TABLE_ENDPOINT: Record<string, string> = {
  artistas:            "/artists",
  obras:               "/works",
  fonogramas:          "/phonograms",
  shares:              "/shares",
  contratos:           "/contracts",
  templates_contratos: "/contract-templates",
  transacoes:          "/transactions",
  leads:               "/leads",
  clientes:            "/clients",
  contatos:            "/clients",          // alias → /clients
  campanhas:           "/campaigns",
  conteudos:           "/contents",
  briefings:           "/briefings",
  tarefas_marketing:   "/marketing-tasks",
  monitoramentos:      "/monitors",
  takedowns:           "/takedowns",
  regras_financeiras:  "/rules",
  projetos:            "/projects",
  eventos:             "/events",
  inventario:          "/inventory",
  licencas:            "/licenses",
  funcionarios:        "/employees",
  folha_pagamento:     "/payroll",
  afastamentos:        "/leave",
  ferias_ausencias:    "/leave",
  regras:              "/rules",
  usuarios:            "/users",
  roles:               "/roles",
  org_members:         "/users",
  lancamentos:         "/releases",
  notas_fiscais:       "/invoices",
  lead_interactions:   "/lead-interactions",
  permissions:         "/permissions",
  metas_artistas:      "/artist-goals",
  relatorios_ecad:     "/ecad-reports",
  deteccoes:           "/content-detections",
  documentos_funcionario: "/hr/employees",
  support_tickets:        "/support/tickets",
};

/**
 * Tables that are consumed by frontend services but have no backend route yet.
 * In HTTP mode these fall back to in-memory mock with an explicit console.warn
 * so the gap is visible in the browser console.
 */
export const PENDING_TABLES: Record<string, string> = {};

// ─── Error mapping ───────────────────────────────────────────────────────────

async function mapError(res: Response): Promise<never> {
  let body: { message?: string | string[] } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch { /* ignore */ }
  const rawMsg = body.message;
  const msg = Array.isArray(rawMsg) ? rawMsg.join("; ") : (rawMsg ?? res.statusText);

  switch (res.status) {
    case 400: throw new ValidationError(msg);
    case 403: throw new TenantError("", "", msg);
    case 404: throw new NotFoundError(msg, "");
    case 409: throw new ConflictError(msg);
    default:  throw new IntegrationError("api", msg, { statusCode: res.status });
  }
}

// ─── Core request ────────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    // Token expirado ou inválido — Supabase SDK refreshará automaticamente
    // via onAuthStateChange, que chamará setAccessToken com o novo token.
    // Aqui apenas limpamos o token em memória para evitar reenvios.
    setAccessToken(null);
  }

  if (!res.ok) return mapError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const api = {
  get:    <T>(path: string)                   => request<T>(path),
  post:   <T>(path: string, body: unknown)    => request<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)    => request<T>(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path: string)                      => request<void>(path, { method: "DELETE" }),
};
