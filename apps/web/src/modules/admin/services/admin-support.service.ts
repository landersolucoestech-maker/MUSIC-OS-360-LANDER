import { api } from "@/shared/lib/api-client";
import type { AdminSupportTicket, SupportTicketStatus, SupportTicketPriority } from "../types";

/**
 * Serviço real de tickets de suporte para o Painel Admin.
 * Usa o endpoint existente `GET /support-tickets` (tenant-scoped, RequireRole manager),
 * que retorna `{ data, meta }`. Sem fonte mock runtime — o mapeamento é defensivo
 * porque o endpoint é escopado ao tenant atual (não expõe tenant_name).
 */
interface RawTicket {
  id: string;
  subject?: string;
  category?: string | null;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assigned_to?: string | null;
  tenant_id?: string;
  requester_email?: string | null;
  created_at?: string;
  updated_at?: string;
  first_response_at?: string | null;
  resolved_at?: string | null;
}

interface TicketListEnvelope {
  data: RawTicket[];
  meta?: { total: number; offset: number; limit: number };
}

function toAdminTicket(r: RawTicket): AdminSupportTicket {
  const created = r.created_at ?? new Date().toISOString();
  return {
    id: r.id,
    subject: r.subject ?? "(sem assunto)",
    category: r.category ?? "",
    tenant_id: r.tenant_id ?? "",
    tenant_name: "",
    requester_email: r.requester_email ?? "",
    status: (r.status ?? "open") as SupportTicketStatus,
    priority: (r.priority ?? "medium") as SupportTicketPriority,
    assigned_to: r.assigned_to ?? undefined,
    created_at: created,
    updated_at: r.updated_at ?? created,
    first_response_at: r.first_response_at ?? undefined,
    resolved_at: r.resolved_at ?? undefined,
  };
}

export const adminSupportService = {
  async list(): Promise<AdminSupportTicket[]> {
    const res = await api.get<TicketListEnvelope>("/support-tickets?limit=200");
    return (res?.data ?? []).map(toAdminTicket);
  },
};
