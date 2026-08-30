import { api } from "@/shared/lib/api-client";
import type { AdminAuditLog, AuditAction } from "../types";

/**
 * Serviço real de audit logs para o Painel Admin.
 *
 * REM-01 (Remaining Product Completion Backlog): usava `GET /audit-logs`
 * (tenant-scoped, RequireRole viewer) — um super_admin só via o audit trail
 * do ÚNICO tenant ao qual sua sessão estava vinculada, nunca uma visão
 * cross-tenant real. Agora usa `GET /audit-logs/admin` (RequireRole
 * super_admin, sem filtro de tenant_id — RLS `super_admin_full_access`),
 * que já retorna `tenant_name` via join real com `tenants`.
 * `user_name`/`user_email`/`details` continuam indisponíveis honestamente
 * (a entidade não tem essas colunas hoje — só `user_id`) — não fabricados.
 */
interface RawAdminAudit {
  id: string;
  action?: string;
  entity?: string | null;
  entity_id?: string | null;
  user_id?: string | null;
  actor_role?: string | null;
  tenant_id?: string;
  tenant_name?: string;
  ip_address?: string | null;
  created_at?: string;
}

function toAdminAudit(r: RawAdminAudit): AdminAuditLog {
  return {
    id: r.id,
    action: (r.action ?? "update") as AuditAction,
    entity: r.entity ?? "",
    entity_id: r.entity_id ?? "",
    user_id: r.user_id ?? "",
    user_name: r.user_id ?? "—",
    user_email: "",
    tenant_id: r.tenant_id ?? "",
    tenant_name: r.tenant_name ?? "",
    ip_address: r.ip_address ?? "—",
    details: undefined,
    created_at: r.created_at ?? new Date().toISOString(),
  };
}

export const adminAuditService = {
  async list(): Promise<AdminAuditLog[]> {
    const res = await api.get<RawAdminAudit[]>("/audit-logs/admin");
    return (res ?? []).map(toAdminAudit);
  },
};
