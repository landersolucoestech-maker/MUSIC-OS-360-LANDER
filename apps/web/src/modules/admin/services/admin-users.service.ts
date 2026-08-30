import { api } from "@/shared/lib/api-client";
import type { AdminUser } from "../types";

/**
 * Serviço real de usuários cross-tenant para o Painel Admin (Decision Gate
 * item 6/GAP-07). Usa `GET /admin/users` (super_admin), que já resolve
 * papel/tenant/MFA/last_login no backend — ver
 * apps/api/src/modules/admin-users/admin-users.service.ts para a fonte
 * (join real com `roles`/`tenants` + Supabase Admin API `listUsers()`
 * paginado, nunca N+1 por usuário; `sessions_count` é sempre null porque a
 * Admin API do Supabase não expõe essa informação — nunca fabricado).
 */
interface RawAdminUser {
  id: string;
  name: string;
  email: string;
  role_slug: string;
  role_name: string;
  tenant_id: string;
  tenant_name: string;
  status: "active" | "blocked";
  joined_at: string | null;
  last_login: string | null;
  mfa_enabled: boolean | null;
  sessions_count: null;
}

export const adminUsersService = {
  async list(params?: { search?: string; status?: string; tenantId?: string }): Promise<AdminUser[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.tenantId) query.set("tenantId", params.tenantId);
    const qs = query.toString();
    const res = await api.get<RawAdminUser[]>(`/admin/users${qs ? `?${qs}` : ""}`);
    return (res ?? []) as AdminUser[];
  },
};
