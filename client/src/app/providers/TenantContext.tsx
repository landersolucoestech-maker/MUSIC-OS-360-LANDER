import React, { createContext, useContext, useState } from "react";
import type { FeatureFlags } from "@/shared/lib/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "@/shared/lib/feature-flags";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TenantPlan = "starter" | "professional" | "enterprise";
export type TenantBillingStatus = "active" | "trial" | "suspended";
export type TenantIndustry = "gravadora" | "editora" | "distribuidora" | "agencia" | "publisher" | "outro";

export interface Tenant {
  id:          string;
  name:        string;
  slug:        string;
  plan:        TenantPlan;
  industry:    TenantIndustry;
  logoUrl?:    string;
  website?:    string;
  cnpj?:       string;
  features:    FeatureFlags;
  billing: {
    status:       TenantBillingStatus;
    trialEndsAt?: string;
    seats:        number;
  };
  meta: {
    createdAt:    string;
    timezone:     string;
    locale:       string;
    currency:     string;
  };
}

interface TenantContextType {
  tenant:     Tenant;
  setTenant:  (tenant: Tenant) => void;
  isFeatureEnabled: (flag: keyof FeatureFlags) => boolean;
}

// ─── Mock tenant — Gravadora Exemplo Ltda ─────────────────────────────────────

const MOCK_TENANT: Tenant = {
  id:       "ten-gravadora-exemplo-001",
  name:     "Gravadora Exemplo Ltda",
  slug:     "gravadora-exemplo",
  plan:     "enterprise",
  industry: "gravadora",
  cnpj:     "12.345.678/0001-90",
  features: DEFAULT_FEATURE_FLAGS,
  billing: {
    status: "active",
    seats:  25,
  },
  meta: {
    createdAt: "2024-01-15T00:00:00.000Z",
    timezone:  "America/Sao_Paulo",
    locale:    "pt-BR",
    currency:  "BRL",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant>(MOCK_TENANT);

  const isFeatureEnabled = (flag: keyof FeatureFlags): boolean =>
    tenant.features[flag] ?? false;

  return (
    <TenantContext.Provider value={{ tenant, setTenant, isFeatureEnabled }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
}

/** Plan display labels */
export const PLAN_LABEL: Record<TenantPlan, string> = {
  starter:      "Starter",
  professional: "Professional",
  enterprise:   "Enterprise",
};

/** Industry display labels */
export const INDUSTRY_LABEL: Record<TenantIndustry, string> = {
  gravadora:     "Gravadora",
  editora:       "Editora Musical",
  distribuidora: "Distribuidora",
  agencia:       "Agência Artística",
  publisher:     "Publisher",
  outro:         "Outro",
};
