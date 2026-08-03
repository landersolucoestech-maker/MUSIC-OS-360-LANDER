import { api } from "@/shared/lib/api-client";
import type { AdminAuditLog, AuditAction } from "../types";

/**
 * Serviço real de audit logs para o Painel Admin.
 * Usa o endpoint existente `GET /audit-logs` (tenant-scoped, RequireRole viewer),
 * que retorna `{ data, meta }`. Sem fonte mock runtime — mapeamento defensivo
 * (o endpoint é escopado ao tenant; não expõe tenant_name/user_name garantidos).
 */
interface RawAudit {
  id: string;
  action?: string;
  entity?: string | null;
  entity_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  actor_role?: string | null;
  tenant_id?: string;
  ip_address?: string | null;
  details?: string | null;
  created_at?: string;
}

function toAdminAudit(r: RawAudit): AdminAuditLog {
  return {
    id: r.id,
    action: (r.action ?? "update") as AuditAction,
    entity: r.entity ?? "",
    entity_id: r.entity_id ?? "",
    user_id: r.user_id ?? "",
    user_name: r.user_name ?? r.user_id ?? "—",
    user_email: r.user_email ?? "",
    tenant_id: r.tenant_id ?? "",
    tenant_name: "",
    ip_address: r.ip_address ?? "—",
    details: r.details ?? undefined,
    created_at: r.created_at ?? new Date().toISOString(),
  };
}

export const adminAuditService = {
  async list(): Promise<AdminAuditLog[]> {
    // api.get() já desembrulha o envelope {data,timestamp}; o controller
    // retorna {data: [...], meta} diretamente (TransformInterceptor preserva
    // objetos que já têm `data`), então o valor aqui já É o array — o
    // `res?.data ?? []` anterior sempre caía no fallback e a tela de
    // auditoria do Admin nunca mostrava nenhum registro real.
    const res = await api.get<RawAudit[]>("/audit-logs?limit=200");
    return (res ?? []).map(toAdminAudit);
  },
};
