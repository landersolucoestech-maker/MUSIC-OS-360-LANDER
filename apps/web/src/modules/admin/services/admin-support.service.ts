import { api } from "@/shared/lib/api-client";
import type { AdminSupportTicket, SupportTicketStatus, SupportTicketPriority } from "../types";

/**
 * Serviço real de tickets de suporte para o Painel Admin.
 *
 * REM-01 (Remaining Product Completion Backlog): usava `GET /support-tickets`
 * (tenant-scoped, RequireRole manager) — um super_admin só via os tickets do
 * ÚNICO tenant ao qual sua sessão estava vinculada, nunca uma visão
 * cross-tenant real, apesar do painel implicar isso. Agora usa o endpoint
 * real `GET /support-tickets/admin` (RequireRole super_admin, sem filtro de
 * tenant_id — RLS `super_admin_full_access`), que já retorna `tenant_name`
 * via join real com `tenants`. `requester_email`/`first_response_at`
 * continuam indisponíveis honestamente (a entidade não tem essas colunas
 * hoje) — não fabricados.
 */
interface RawAdminTicket {
  id: string;
  subject?: string;
  category?: string | null;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assigned_to?: string | null;
  tenant_id?: string;
  tenant_name?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
}

function toAdminTicket(r: RawAdminTicket): AdminSupportTicket {
  const created = r.created_at ?? new Date().toISOString();
  return {
    id: r.id,
    subject: r.subject ?? "(sem assunto)",
    category: r.category ?? "",
    tenant_id: r.tenant_id ?? "",
    tenant_name: r.tenant_name ?? "",
    requester_email: "",
    status: (r.status ?? "open") as SupportTicketStatus,
    priority: (r.priority ?? "medium") as SupportTicketPriority,
    assigned_to: r.assigned_to ?? undefined,
    created_at: created,
    updated_at: r.updated_at ?? created,
    first_response_at: undefined,
    resolved_at: r.resolved_at ?? undefined,
  };
}

export const adminSupportService = {
  async list(): Promise<AdminSupportTicket[]> {
    const res = await api.get<RawAdminTicket[]>("/support-tickets/admin");
    return (res ?? []).map(toAdminTicket);
  },
};
