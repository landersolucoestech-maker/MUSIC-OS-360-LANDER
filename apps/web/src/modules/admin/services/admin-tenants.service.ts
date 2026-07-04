import { api } from "@/shared/lib/api-client";
import type { AdminTenant } from "../types";

export type UpdateAdminTenantPayload = Partial<Pick<
  AdminTenant,
  "name" | "owner_email" | "slug" | "country" | "plan" | "status"
>>;

export const adminTenantsService = {
  list() {
    return api.get<AdminTenant[]>("/billing/admin/tenants");
  },

  update(tenantId: string, payload: UpdateAdminTenantPayload) {
    return api.patch<AdminTenant>(`/billing/admin/tenants/${tenantId}`, payload);
  },
};
