import { api } from "@/shared/lib/api-client";
import type { AdminSubscription } from "../types";

export type AdminBillingStateStatus =
  | "active"
  | "trial"
  | "payment_grace"
  | "read_only"
  | "suspended"
  | "cancelled";

export interface AdminBillingActionResponse {
  tenantId: string;
  status: AdminBillingStateStatus;
  graceUntil?: string | null;
  suspendedAt?: string | null;
  manualOverride?: boolean;
  manualOverrideUntil?: string | null;
}

export const adminBillingService = {
  listSubscriptions() {
    return api.get<AdminSubscription[]>("/billing/admin/subscriptions");
  },

  listInvoices(tenantId?: string) {
    const suffix = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    return api.get(`/billing/admin/invoices${suffix}`);
  },

  suspendTenant(tenantId: string, reason: string) {
    return api.post<AdminBillingActionResponse>(`/billing/admin/tenants/${tenantId}/suspend`, {
      reason,
    });
  },

  reactivateTenant(tenantId: string, reason: string) {
    return api.post<AdminBillingActionResponse>(`/billing/admin/tenants/${tenantId}/reactivate`, {
      reason,
    });
  },

  applyOverride(
    tenantId: string,
    payload: {
      status: AdminBillingStateStatus;
      reason: string;
      until?: string;
    },
  ) {
    return api.post<AdminBillingActionResponse>(
      `/billing/admin/tenants/${tenantId}/override`,
      payload,
    );
  },

  removeOverride(tenantId: string, reason: string) {
    return api.post<AdminBillingActionResponse>(
      `/billing/admin/tenants/${tenantId}/override/remove`,
      { reason },
    );
  },
};
