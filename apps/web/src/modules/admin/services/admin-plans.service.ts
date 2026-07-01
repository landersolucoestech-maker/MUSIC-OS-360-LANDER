/**
 * admin-plans.service.ts — CRUD de planos do Painel Admin (fonte da verdade).
 *
 * GOVERNANÇA: Painel Admin → (Banco billing_plans) → Billing/Workspaces/Stripe.
 *   Os planos são criados/editados aqui pelo Admin. O backend persiste em
 *   `billing_plans` e sincroniza com o Stripe (Product/Price). STRIPE_PRICE_* não
 *   é mais usado — cada plano guarda seu stripe_price_id.
 *
 *   - MOCK_MODE (dev standalone): persiste em localStorage (semente ADMIN_PLANS).
 *   - Produção: fala com o backend real:
 *       GET   /billing/plans?includeInactive=true  -> BackendPlan[]
 *       POST  /billing/plans                        -> cria + sincroniza Stripe
 *       PATCH /billing/plans/{id}                   -> edita + re-sincroniza
 *       POST  /billing/plans/{id}/sync-stripe       -> re-sincroniza
 *   (o backend não deleta planos — "remover" = desativar, active=false.)
 *
 * ADAPTER: a UI usa o modelo rico `AdminPlan` (mensal+anual, cor, labels). Os
 * campos CANÔNICOS que governam o checkout (amount/currency/interval/active/stripe)
 * são de 1ª classe no backend; os extras de exibição (price_annual, cor, labels,
 * tier) viajam no jsonb `features`. Entitlements por módulo continuam derivados do
 * slug (PLAN_FEATURES no backend), não deste jsonb.
 */
import { MOCK_MODE } from "@/shared/lib/env";
import { api } from "@/shared/lib/api-client";
import { ADMIN_PLANS } from "../data/admin-source";
import type { AdminPlan, PlanTier } from "../types";

const STORAGE_KEY = "admin:plans";

interface BackendPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  amount: number;            // centavos
  currency: string;
  interval: string;          // month | year
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

// ── MOCK store ──────────────────────────────────────────────────────────────
function readStore(): AdminPlan[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminPlan[]) : null;
  } catch {
    return null;
  }
}
function writeStore(plans: AdminPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}
function ensureStore(): AdminPlan[] {
  const current = readStore();
  if (current) return current;
  writeStore(ADMIN_PLANS);
  return ADMIN_PLANS;
}

export const adminPlansService = {
  async list(): Promise<AdminPlan[]> {
    if (MOCK_MODE) return ensureStore();
    const rows = await api.get<BackendPlan[]>("/billing/plans?includeInactive=true");
    return (rows ?? []).map(toAdminPlan);
  },

  /** Cria ou atualiza um plano (upsert) + sincroniza Stripe no backend. */
  async save(plan: AdminPlan): Promise<AdminPlan[]> {
    if (MOCK_MODE) {
      const store = ensureStore().slice();
      const idx = store.findIndex((p) => p.id === plan.id);
      if (idx >= 0) store[idx] = plan;
      else store.push(plan);
      writeStore(store);
      return store;
    }
    const dto = toBackendDto(plan);
    if (plan.id && UUID_RE.test(plan.id)) await api.patch(`/billing/plans/${plan.id}`, dto);
    else await api.post("/billing/plans", dto);
    return this.list();
  },

  /** "Remover" = desativar (backend não deleta planos com histórico Stripe). */
  async remove(id: string): Promise<AdminPlan[]> {
    if (MOCK_MODE) {
      const store = ensureStore().filter((p) => p.id !== id);
      writeStore(store);
      return store;
    }
    await api.patch(`/billing/plans/${id}`, { active: false });
    return this.list();
  },

  /** Re-sincroniza o plano com o Stripe (Product/Price). No-op em MOCK. */
  async syncStripe(id: string): Promise<AdminPlan[]> {
    if (MOCK_MODE) return ensureStore();
    await api.post(`/billing/plans/${id}/sync-stripe`, {});
    return this.list();
  },
};
