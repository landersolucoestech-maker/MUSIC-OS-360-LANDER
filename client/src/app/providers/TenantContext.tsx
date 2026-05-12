import React, { createContext, useContext, useState, useEffect } from "react";
import type { FeatureFlags } from "@/shared/lib/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "@/shared/lib/feature-flags";
import { MOCK_MODE } from "@/shared/lib/env";
import { ROLE_PERMISSIONS, getPermissionsFromToken } from "./tenant-labels";

// ─── Plan & billing ───────────────────────────────────────────────────────────

export type TenantPlan           = "starter" | "professional" | "enterprise";
export type TenantBillingStatus  = "active" | "trial" | "suspended" | "cancelled";
export type TenantIndustry       = "gravadora" | "editora" | "distribuidora" | "agencia" | "publisher" | "outro";

// ─── RBAC — Permissions ───────────────────────────────────────────────────────

export type TenantRole = "owner" | "admin" | "manager" | "editor" | "viewer";

export interface TenantModulePermission {
  read:   boolean;
  write:  boolean;
  delete: boolean;
  export: boolean;
}

export type TenantModuleKey =
  | "artists" | "catalog" | "releases" | "contracts"
  | "accounting" | "crm" | "marketing" | "events"
  | "inventory" | "rh" | "monitoring" | "licensing"
  | "projects" | "leads" | "audit" | "settings";

export type TenantPermissions = Record<TenantModuleKey, TenantModulePermission>;

// ROLE_PERMISSIONS disponível em ./tenant-labels

// ─── Tenant config (branding + UX per tenant) ─────────────────────────────────

export interface TenantConfig {
  primaryColor?:    string;
  logoUrl?:         string;
  faviconUrl?:      string;
  customDomain?:    string;
  emailFromName?:   string;
  emailFromAddr?:   string;
  supportEmail?:    string;
  whitelabel:       boolean;
  hideProductName:  boolean;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export type OnboardingStep =
  | "company_profile"
  | "invite_team"
  | "first_artist"
  | "first_catalog_item"
  | "first_contract"
  | "connect_integration"
  | "complete";

export interface TenantOnboarding {
  completed:    boolean;
  currentStep:  OnboardingStep;
  steps: Record<OnboardingStep, boolean>;
}

const DEFAULT_ONBOARDING: TenantOnboarding = {
  completed:   true,
  currentStep: "complete",
  steps: {
    company_profile:      true,
    invite_team:          true,
    first_artist:         true,
    first_catalog_item:   true,
    first_contract:       true,
    connect_integration:  false,
    complete:             false,
  },
};

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface TenantBilling {
  status:          TenantBillingStatus;
  trialEndsAt?:    string;
  currentPeriodEnd?: string;
  seats:           number;
  seatsUsed:       number;
  planId?:         string;
  customerId?:     string;
  subscriptionId?: string;
}

// ─── Tenant ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id:          string;
  name:        string;
  slug:        string;
  plan:        TenantPlan;
  industry:    TenantIndustry;
  website?:    string;
  cnpj?:       string;
  phone?:      string;
  address?:    string;
  features:    FeatureFlags;
  permissions: TenantPermissions;
  config:      TenantConfig;
  billing:     TenantBilling;
  onboarding:  TenantOnboarding;
  meta: {
    createdAt:  string;
    timezone:   string;
    locale:     string;
    currency:   string;
    version:    number;
  };
}

// getPermissionsFromToken disponível em ./tenant-labels

// ─── Mock tenant — Gravadora Exemplo Ltda ─────────────────────────────────────

const MOCK_TENANT: Tenant = {
  id:       "ten-gravadora-exemplo-001",
  name:     "Gravadora Exemplo Ltda",
  slug:     "gravadora-exemplo",
  plan:     "enterprise",
  industry: "gravadora",
  cnpj:     "12.345.678/0001-90",
  phone:    "+55 11 3000-0000",
  address:  "Av. Paulista, 1000 — São Paulo, SP",
  features:    DEFAULT_FEATURE_FLAGS,
  permissions: ROLE_PERMISSIONS.owner,
  config: {
    whitelabel:      false,
    hideProductName: false,
  },
  billing: {
    status:            "active",
    seats:             25,
    seatsUsed:         8,
    currentPeriodEnd:  "2026-06-01T00:00:00.000Z",
  },
  onboarding: DEFAULT_ONBOARDING,
  meta: {
    createdAt: "2024-01-15T00:00:00.000Z",
    timezone:  "America/Sao_Paulo",
    locale:    "pt-BR",
    currency:  "BRL",
    version:   1,
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface TenantContextType {
  tenant:           Tenant;
  setTenant:        React.Dispatch<React.SetStateAction<Tenant>>;
  isFeatureEnabled: (flag: keyof FeatureFlags) => boolean;
  hasPermission:    (module: TenantModuleKey, action: keyof TenantModulePermission) => boolean;
  canRead:          (module: TenantModuleKey) => boolean;
  canWrite:         (module: TenantModuleKey) => boolean;
  canDelete:        (module: TenantModuleKey) => boolean;
  canExport:        (module: TenantModuleKey) => boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant>(MOCK_TENANT);

  const isFeatureEnabled = (flag: keyof FeatureFlags): boolean =>
    tenant.features[flag] ?? false;

  const hasPermission = (module: TenantModuleKey, action: keyof TenantModulePermission): boolean =>
    tenant.permissions[module]?.[action] ?? false;

  const canRead   = (m: TenantModuleKey) => hasPermission(m, "read");
  const canWrite  = (m: TenantModuleKey) => hasPermission(m, "write");
  const canDelete = (m: TenantModuleKey) => hasPermission(m, "delete");
  const canExport = (m: TenantModuleKey) => hasPermission(m, "export");

  return (
    <TenantContext.Provider value={{ tenant, setTenant, isFeatureEnabled, hasPermission, canRead, canWrite, canDelete, canExport }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
}

/**
 * useSyncTenantFromJWT — sincroniza permissões do tenant a partir do JWT real.
 *
 * FASE 05: Em MOCK_MODE não faz nada (tenant usa ROLE_PERMISSIONS.owner por defeito).
 * Em produção, lê o role e org_id do JWT e actualiza as permissões do tenant.
 *
 * Chamar num componente raiz (ex: AppShell) após autenticação.
 */
export function useSyncTenantFromJWT(): void {
  const { setTenant } = useTenant();

  useEffect(() => {
    if (MOCK_MODE) return;
    try {
      const raw = localStorage.getItem("access_token");
      if (!raw) return;
      const parts = raw.split(".");
      if (parts.length < 2) return;
      const decoded = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
      ) as { role?: TenantRole; org_id?: string };
      if (!decoded.role || !(decoded.role in ROLE_PERMISSIONS)) return;
      setTenant(prev => ({
        ...prev,
        id:          decoded.org_id ?? prev.id,
        permissions: ROLE_PERMISSIONS[decoded.role as TenantRole] ?? ROLE_PERMISSIONS.viewer,
      }));
    } catch { /* ignore — JWT inválido ou ausente */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Label constants (PLAN_LABEL, INDUSTRY_LABEL, BILLING_STATUS_LABEL, ROLE_LABEL)
// e ROLE_PERMISSIONS disponíveis em ./tenant-labels
