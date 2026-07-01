import React, { createContext, useContext, useState, useEffect } from "react";
import type { FeatureFlags } from "@/shared/lib/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "@/shared/lib/feature-flags";
import { AUTH_DISABLED, MOCK_MODE, IS_DEV } from "@/shared/lib/env";
import { ROLE_PERMISSIONS } from "./tenant-labels";
import { tenantModulePermissionKeys } from "@/shared/lib/permission-map";
import { api, getAccessToken } from "@/shared/lib/api-client";
import { useAuth } from "./AuthContext";
import type { SaasAuthContext } from "@/shared/types/saas-context";
import { SYSTEM_REGIONAL_SETTINGS } from "@/shared/lib/system-regional-settings";

// ─── Plan & billing ───────────────────────────────────────────────────────────

export type TenantPlan           = "starter" | "professional" | "enterprise";
export type TenantBillingStatus  =
  | "active" | "trial" | "suspended" | "cancelled"
  // Estados de enforcement de inadimplência (fonte da verdade = backend tenant_billing_state)
  | "past_due" | "payment_grace" | "read_only";
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
  | "projects" | "leads" | "audit" | "settings" | "musicchat";

export type TenantPermissions = Record<TenantModuleKey, TenantModulePermission>;

// ROLE_PERMISSIONS disponível em ./tenant-labels

// ─── Tenant config (branding + UX per tenant) ─────────────────────────────────

export interface TenantConfig {
  primaryColor?:    string;
  logoUrl?:         string;
  faviconUrl?:      string;
  emailFromName?:   string;
  emailFromAddr?:   string;
  supportEmail?:    string;
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
  /** Enforcement: exposto pelo backend (tenant_billing_state / GET /billing/subscription). */
  graceUntil?:     string;
  amountDue?:      number;
  invoiceUrl?:     string;
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
  config: {},
  billing: {
    status:            "active",
    seats:             25,
    seatsUsed:         8,
    currentPeriodEnd:  "2026-06-01T00:00:00.000Z",
  },
  onboarding: DEFAULT_ONBOARDING,
  meta: {
    createdAt: "2024-01-15T00:00:00.000Z",
    timezone:  SYSTEM_REGIONAL_SETTINGS.timezone,
    locale:    SYSTEM_REGIONAL_SETTINGS.locale,
    currency:  SYSTEM_REGIONAL_SETTINGS.currency,
    version:   1,
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface TenantContextType {
  tenant:           Tenant;
  setTenant:        React.Dispatch<React.SetStateAction<Tenant>>;
  /** FONTE ÚNICA de autorização: membership.permissions (resource:action). null = ainda não carregado. */
  permissionKeys:   string[] | null;
  isFeatureEnabled: (flag: keyof FeatureFlags) => boolean;
  hasPermission:    (module: TenantModuleKey, action: keyof TenantModulePermission) => boolean;
  canRead:          (module: TenantModuleKey) => boolean;
  canWrite:         (module: TenantModuleKey) => boolean;
  canDelete:        (module: TenantModuleKey) => boolean;
  canExport:        (module: TenantModuleKey) => boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

function buildInitialTenant(): Tenant {
  if (AUTH_DISABLED) return { ...MOCK_TENANT, permissions: ROLE_PERMISSIONS.owner };
  if (MOCK_MODE) return { ...MOCK_TENANT, permissions: ROLE_PERMISSIONS.owner };
  return {
    ...MOCK_TENANT,
    id:          "",
    name:        "MUSIC OS 360",
    slug:        "",
    plan:        "starter",
    permissions: ROLE_PERMISSIONS.viewer,
    onboarding: DEFAULT_ONBOARDING,
  };
}

/**
 * Maps an AppRole string (from AuthContext / shared/types/auth.ts) to the
 * TenantRole key used by ROLE_PERMISSIONS.
 * "tenant_owner" → "owner", everything else is a direct match or falls back to "viewer".
 */
function appRoleToTenantRole(appRole: string): TenantRole {
  if (appRole === "tenant_owner") return "owner";
  if (appRole in ROLE_PERMISSIONS)  return appRole as TenantRole;
  return "viewer";
}

function normalizePlan(plan: string | undefined): TenantPlan {
  return plan === "professional" || plan === "enterprise" ? plan : "starter";
}

function normalizeFeatures(features: Record<string, unknown>): FeatureFlags {
  const next = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of Object.keys(next) as Array<keyof FeatureFlags>) {
    if (typeof features[key] === "boolean") next[key] = features[key];
  }
  return next;
}

function normalizeOnboarding(settings: Record<string, unknown>): TenantOnboarding {
  const raw = settings["onboarding"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_ONBOARDING;
  }
  const onboarding = raw as Record<string, unknown>;
  const completed = onboarding["completed"] === true;
  return {
    ...DEFAULT_ONBOARDING,
    completed,
    currentStep: completed ? "complete" : "company_profile",
    steps: {
      ...DEFAULT_ONBOARDING.steps,
      company_profile: completed,
      complete: completed,
    },
  };
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [tenant, setTenant] = useState<Tenant>(buildInitialTenant);
  // FONTE ÚNICA de autorização: permissões resource:action vindas de membership.permissions.
  // null = ainda não carregado (ou MOCK/AUTH_DISABLED) → usePermissions faz fail-open de UI.
  const [permissionKeys, setPermissionKeys] = useState<string[] | null>(null);

  useEffect(() => {
    if (AUTH_DISABLED) return;
    if (MOCK_MODE || !session?.access_token) return;

    let active = true;
    api.get<SaasAuthContext>("/auth/context")
      .then((context) => {
        if (!active) return;
        const tenantRole = appRoleToTenantRole(context.membership.role);
        setPermissionKeys(Array.isArray(context.membership.permissions) ? context.membership.permissions : []);
        setTenant(prev => ({
          ...prev,
          id:          context.workspace.id || prev.id,
          name:        context.workspace.name || prev.name,
          slug:        context.workspace.slug || prev.slug,
          plan:        normalizePlan(context.workspace.plan),
          features:    normalizeFeatures(context.workspace.features),
          onboarding:  normalizeOnboarding(context.workspace.settings),
          config: {
            ...prev.config,
            logoUrl: typeof context.workspace.settings["logoUrl"] === "string"
              ? context.workspace.settings["logoUrl"] as string
              : prev.config.logoUrl,
          },
          permissions: ROLE_PERMISSIONS[tenantRole],
          billing: {
            ...prev.billing,
            planId: context.workspace.plan || prev.billing.planId,
          },
        }));
        devTenantLog("Tenant sincronizado via /auth/context:", {
          id: context.workspace.id,
          role: context.membership.role,
          permissions: context.membership.permissions.length,
        });
      })
      .catch((error: unknown) => {
        devTenantLog("Falha ao sincronizar /auth/context; usando JWT/localStorage", error);
      });

    return () => { active = false; };
  }, [session?.access_token]);

  // ── AUDIT MODE (temporário): todos os módulos/feature-flags habilitados para inspeção (reverter: tenant.features[flag] ?? false) ──
  const isFeatureEnabled = (_flag: keyof FeatureFlags): boolean => true;

  // FONTE ÚNICA de autorização: membership.permissions (resource:action).
  // Permissivo APENAS em dev/mock/auth-disabled. Em produção, ausência de permissões
  // (permissionKeys === null, ainda carregando ou indisponível) NÃO abre — fail-closed.
  const hasPermission = (module: TenantModuleKey, action: keyof TenantModulePermission): boolean => {
    if (MOCK_MODE || AUTH_DISABLED || IS_DEV) return true;
    if (permissionKeys === null) return false;
    const keys = tenantModulePermissionKeys(module, action);
    return keys.some((key) => permissionKeys.includes(key));
  };

  const canRead   = (m: TenantModuleKey) => hasPermission(m, "read");
  const canWrite  = (m: TenantModuleKey) => hasPermission(m, "write");
  const canDelete = (m: TenantModuleKey) => hasPermission(m, "delete");
  const canExport = (m: TenantModuleKey) => hasPermission(m, "export");

  return (
    <TenantContext.Provider value={{ tenant, setTenant, permissionKeys, isFeatureEnabled, hasPermission, canRead, canWrite, canDelete, canExport }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
}

// ─── DEV logging ──────────────────────────────────────────────────────────────

function devTenantLog(label: string, data?: unknown): void {
  if (import.meta.env.DEV !== true) return;
  if (data !== undefined) {
    console.log(`[MUSIC OS 360 Tenant] ${label}`, data);
  } else {
    console.log(`[MUSIC OS 360 Tenant] ${label}`);
  }
}

// ─── JWT claim parser ─────────────────────────────────────────────────────────

interface JwtAppClaims {
  role?:         string;
  org_id?:       string;
  app_metadata?: { role?: string; org_id?: string };
}

function parseJwtClaims(token: string): JwtAppClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as JwtAppClaims;
  } catch { return null; }
}

/**
 * useSyncTenantFromJWT — sincroniza permissões + metadados do tenant.
 *
 * Fontes de dados (por prioridade decrescente):
 *   1. JWT app_metadata.role + app_metadata.org_id (injetado pelo Supabase Hook)
 *   2. JWT top-level role / org_id (fallback para tokens legados)
 *
 * Re-executa em:
 *   • mudança de userEmail (login inicial)
 *   • evento window "musicos360:auth:tokenRefreshed" (refresh de token)
 */
export function useSyncTenantFromJWT(_userEmail?: string): void {
  const { setTenant } = useTenant();

  // Função interna de sincronização — partilhada pelos dois efeitos abaixo
  const syncFromJwt = React.useCallback(() => {
    if (MOCK_MODE) return;
    if (AUTH_DISABLED) return;

    // JWT claims (app_metadata.role + app_metadata.org_id via Hook)
    const token = getAccessToken();
    if (!token) {
      devTenantLog("Nenhum token em memória — aguardando login");
      return;
    }

    const decoded = parseJwtClaims(token);
    if (!decoded) return;

    // Prioridade: app_metadata (Hook) → top-level (fallback)
    const claimRole  = decoded.app_metadata?.role   ?? decoded.role;
    const claimOrgId = decoded.app_metadata?.org_id ?? decoded.org_id;

    devTenantLog("JWT claims lidas:", {
      org_id:  claimOrgId ?? "(ausente — ativar Custom Access Token Hook no Supabase)",
      role:    claimRole  ?? "(ausente)",
      source:  decoded.app_metadata?.org_id ? "app_metadata (hook)" : "top-level (fallback)",
    });

    if (!claimRole) return;
    const tenantRole = appRoleToTenantRole(claimRole);
    if (!(tenantRole in ROLE_PERMISSIONS)) return;

    setTenant(prev => ({
      ...prev,
      id:          claimOrgId ?? prev.id,
      permissions: ROLE_PERMISSIONS[tenantRole],
    }));
    devTenantLog(`Permissões elevadas para role "${tenantRole}" (org: ${claimOrgId ?? "mantida"})`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efeito 1: dispara no login / quando o email do utilizador muda
  useEffect(() => {
    syncFromJwt();
  }, [syncFromJwt]);

  // Efeito 2: dispara quando o AuthContext renova o token (TOKEN_REFRESHED)
  // sem necessidade de reload — os novos claims do hook ficam imediatamente ativos
  useEffect(() => {
    const handler = () => {
      devTenantLog("TOKEN_REFRESHED recebido — re-sincronizando claims do JWT");
      syncFromJwt();
    };
    window.addEventListener("musicos360:auth:tokenRefreshed", handler);
    return () => { window.removeEventListener("musicos360:auth:tokenRefreshed", handler); };
  }, [syncFromJwt]);
}

// Label constants (PLAN_LABEL, INDUSTRY_LABEL, BILLING_STATUS_LABEL, ROLE_LABEL)
// e ROLE_PERMISSIONS disponíveis em ./tenant-labels
