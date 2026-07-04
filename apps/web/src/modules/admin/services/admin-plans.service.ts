import { api } from "@/shared/lib/api-client";
import type { AdminPlan, PlanTier } from "../types";

interface BackendPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  interval: string;
  active: boolean;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "plan";
}

function toAdminPlan(b: BackendPlan): AdminPlan {
  const ui = (b.features ?? {}) as Record<string, unknown>;
  const limits = (b.limits ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d = 0) => (typeof v === "number" ? v : Number(v ?? d) || d);
  return {
    id: b.id,
    name: b.name,
    tier: b.slug as PlanTier,
    price_monthly: b.interval === "month" ? Math.round(b.amount / 100) : num(ui.price_monthly),
    price_annual: num(ui.price_annual, b.interval === "year" ? Math.round(b.amount / 100) : 0),
    max_users: num(limits.users),
    max_artists: num(limits.artists),
    max_storage_gb: num(limits.storageGb),
    features: Array.isArray(ui.labels) ? (ui.labels as string[]) : [],
    active_subscribers: 0,
    mrr: 0,
    color: typeof ui.color === "string" ? ui.color : "#3B82F6",
    active: b.active,
    stripe_product_id: b.stripe_product_id ?? undefined,
    stripe_price_id: b.stripe_price_id ?? undefined,
  };
}

function toBackendDto(p: AdminPlan): Record<string, unknown> {
  return {
    slug: p.tier || slugify(p.name),
    name: p.name,
    amount: Math.round((p.price_monthly || 0) * 100),
    currency: "brl",
    interval: "month",
    active: p.active !== false,
    features: { labels: p.features ?? [], color: p.color, price_annual: p.price_annual, tier: p.tier },
    limits: { users: p.max_users, artists: p.max_artists, storageGb: p.max_storage_gb },
  };
}

export const adminPlansService = {
  async list(): Promise<AdminPlan[]> {
    const rows = await api.get<BackendPlan[]>("/billing/plans?includeInactive=true");
    return (rows ?? []).map(toAdminPlan);
  },

  async save(plan: AdminPlan): Promise<AdminPlan[]> {
    const dto = toBackendDto(plan);
    if (plan.id && UUID_RE.test(plan.id)) await api.patch(`/billing/plans/${plan.id}`, dto);
    else await api.post("/billing/plans", dto);
    return this.list();
  },

  async remove(id: string): Promise<AdminPlan[]> {
    await api.patch(`/billing/plans/${id}`, { active: false });
    return this.list();
  },

  async syncStripe(id: string): Promise<AdminPlan[]> {
    await api.post(`/billing/plans/${id}/sync-stripe`, {});
    return this.list();
  },
};
