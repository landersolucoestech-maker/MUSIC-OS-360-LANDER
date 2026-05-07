/**
 * MUSIC OS 360 — RBAC (Role-Based Access Control)
 *
 * Architecture prepared for future backend enforcement.
 * Currently: all permissions resolve to true in standalone mock mode.
 *
 * Future flow:
 *   1. Backend resolves user roles/permissions from JWT claims
 *   2. TenantContext loads permission set for current user+tenant
 *   3. usePermission() checks against the resolved set
 */

// ─── Role definitions ─────────────────────────────────────────────────────────

export type SystemRole =
  | "super_admin"       // Platform-level: full access to all tenants
  | "org_owner"         // Tenant owner: full access within tenant
  | "org_admin"         // Tenant admin: manage users, settings
  | "manager"           // Module manager: CRUD in assigned modules
  | "editor"            // Editor: create/update, no delete
  | "viewer"            // Read-only access
  | "finance_manager"   // Financeiro module full access
  | "artist_manager"    // Artists + catalog modules
  | "marketing_manager"; // Marketing module

// ─── Permission scopes ────────────────────────────────────────────────────────

export type ResourceAction = "view" | "create" | "update" | "delete" | "export" | "import" | "approve";

export type ResourceScope =
  | "artists"
  | "catalog"
  | "releases"
  | "contracts"
  | "accounting"
  | "crm"
  | "leads"
  | "marketing"
  | "events"
  | "inventory"
  | "rh"
  | "monitoring"
  | "licensing"
  | "projects"
  | "settings"
  | "users"
  | "integrations"
  | "audit";

export interface Permission {
  resource: ResourceScope;
  action:   ResourceAction;
}

export interface RoleDefinition {
  role:         SystemRole;
  label:        string;
  description:  string;
  permissions:  Permission[];
  inherits?:    SystemRole[];
}

// ─── Permission check helpers ─────────────────────────────────────────────────

/**
 * In standalone mock mode — all permissions are granted.
 * Replace with real check against user's resolved permission set.
 */
export function hasPermission(
  _userRole: SystemRole,
  _resource: ResourceScope,
  _action: ResourceAction
): boolean {
  // Standalone mode: always allow
  return true;
}

/**
 * Check if a role implies super-access.
 * Super admin and org owner bypass permission checks.
 */
export function isSuperRole(role: SystemRole): boolean {
  return role === "super_admin" || role === "org_owner";
}

// ─── Role display metadata ────────────────────────────────────────────────────

export const ROLE_LABEL: Record<SystemRole, string> = {
  super_admin:       "Super Admin",
  org_owner:         "Proprietário",
  org_admin:         "Administrador",
  manager:           "Gerente",
  editor:            "Editor",
  viewer:            "Visualizador",
  finance_manager:   "Gestor Financeiro",
  artist_manager:    "Gestor de Artistas",
  marketing_manager: "Gestor de Marketing",
};

export const ROLE_DESCRIPTION: Record<SystemRole, string> = {
  super_admin:       "Acesso total à plataforma em todos os tenants",
  org_owner:         "Acesso total dentro da organização",
  org_admin:         "Gerencia usuários, configurações e integrações",
  manager:           "CRUD completo nos módulos atribuídos",
  editor:            "Criação e edição, sem exclusão",
  viewer:            "Somente visualização",
  finance_manager:   "Acesso completo ao módulo Financeiro",
  artist_manager:    "Gerencia artistas e catálogo",
  marketing_manager: "Gerencia campanhas e conteúdo de marketing",
};
