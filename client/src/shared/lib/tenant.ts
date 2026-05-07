/**
 * Tenant helpers — ponto único de acesso ao org_id da sessão.
 *
 * VITE_MOCK_MODE=true:  retorna MOCK_ORG_ID (comportamento standalone inalterado).
 * VITE_MOCK_MODE=false: decodifica o JWT em memória (via api-client) para extrair org_id.
 *
 * stampTenant / withTenantFilter / assertTenantScope mantêm assinatura idêntica
 * para não quebrar imports — em modo real o backend faz enforcement via extensão Prisma.
 */
import { MOCK_ORG_ID } from "@/shared/data/mockData";
import { getAccessToken } from "@/shared/lib/api-client";

// VITE_USE_MOCK is canonical; VITE_MOCK_MODE kept for back-compat.
const MOCK_MODE =
  import.meta.env.VITE_USE_MOCK !== "false" &&
  import.meta.env.VITE_MOCK_MODE !== "false";

// ─── JWT payload decode ───────────────────────────────────────────────────────

function decodeOrgId(): string {
  const token = getAccessToken();
  if (!token) return MOCK_ORG_ID; // fallback enquanto não há sessão
  try {
    const payload = token.split(".")[1];
    const p = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return typeof p["org_id"] === "string" ? p["org_id"] : MOCK_ORG_ID;
  } catch {
    return MOCK_ORG_ID;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retorna o org_id do tenant atual.
 * Ponto único — troca automaticamente entre mock e JWT real conforme VITE_MOCK_MODE.
 */
export function getCurrentOrgId(): string {
  return MOCK_MODE ? MOCK_ORG_ID : decodeOrgId();
}

/**
 * Aplica o filtro de tenant a um objeto de filtros genérico.
 * Em modo real: no-op — o backend injeta org_id via contexto JWT; não enviamos org_id
 * no payload para evitar conflito com DTOs com whitelist estrita.
 */
export function withTenantFilter<T extends Record<string, unknown>>(
  filters?: T,
): T & { org_id?: string } {
  if (!MOCK_MODE) return (filters ?? {}) as T & { org_id?: string };
  return { ...(filters ?? ({} as T)), org_id: getCurrentOrgId() };
}

/**
 * Garante que um registro pertence ao tenant atual.
 * Em modo real: no-op — o backend faz enforcement via extensão Prisma.
 */
export function assertTenantScope(
  record: { org_id?: string | null },
  context = "record",
): void {
  if (!MOCK_MODE) return; // backend enforces
  const orgId = getCurrentOrgId();
  if (record.org_id && record.org_id !== orgId) {
    throw new Error(
      `[tenant] Cross-tenant access denied: ${context} belongs to org "${record.org_id}", current org is "${orgId}"`,
    );
  }
}

/**
 * Injeta org_id em um objeto antes de salvar.
 * Em modo real: no-op — o backend extrai org_id do JWT, não do body; injetar
 * org_id no payload causaria rejeição por DTOs com whitelist estrita.
 */
export function stampTenant<T extends Record<string, unknown>>(
  data: T,
): T & { org_id?: string } {
  if (!MOCK_MODE) return data;
  return { ...data, org_id: getCurrentOrgId() };
}
