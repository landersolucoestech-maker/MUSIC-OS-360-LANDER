import React, { createContext, useContext, useState } from "react";
import type { FeatureFlags } from "@/shared/lib/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "@/shared/lib/feature-flags";

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

const FULL_PERMISSION: TenantModulePermission = { read: true, write: true, delete: true, export: true };
const READ_ONLY:       TenantModulePermission = { read: true, write: false, delete: false, export: true };
const NO_ACCESS:       TenantModulePermission = { read: false, write: false, delete: false, export: false };

const MODULE_KEYS: TenantModuleKey[] = [
  "artists", "catalog", "releases", "contracts",
  "accounting", "crm", "marketing", "events",
  "inventory", "rh", "monitoring", "licensing",
  "projects", "leads", "audit", "settings",
];

/** Role-based default permissions */
export const ROLE_PERMISSIONS: Record<TenantRole, TenantPermissions> = {
  owner:   Object.fromEntries(MODULE_KEYS.map(k => [k, FULL_PERMISSION])) as TenantPermissions,
  admin:   Object.fromEntries(MODULE_KEYS.map(k => [k, FULL_PERMISSION])) as TenantPermissions,
  manager: Object.fromEntries(MODULE_KEYS.map(k => [k, k === "audit" || k === "settings" ? READ_ONLY : FULL_PERMISSION])) as TenantPermissions,
  editor:  Object.fromEntries(MODULE_KEYS.map(k => [k, k === "audit" || k === "settings" ? NO_ACCESS : { read: true, write: true, delete: false, export: true }])) as TenantPermissions,
  viewer:  Object.fromEntries(MODULE_KEYS.map(k => [k, k === "audit" || k === "settings" ? NO_ACCESS : READ_ONLY])) as TenantPermissions,
};

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
  setTenant:        (tenant: Tenant) => void;
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

/** Billing status labels */
export const BILLING_STATUS_LABEL: Record<TenantBillingStatus, string> = {
  active:    "Ativo",
  trial:     "Trial",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

/** Role labels */
export const ROLE_LABEL: Record<TenantRole, string> = {
  owner:   "Proprietário",
  admin:   "Administrador",
  manager: "Gerente",
  editor:  "Editor",
  viewer:  "Visualizador",
};
