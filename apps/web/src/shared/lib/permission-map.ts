/**
 * permission-map.ts
 *
 * Tradução de NOMES de módulo (UI) para o `resource` do backend e da ação coarse
 * da UI (read/write/delete/export) para as ações `resource:action`.
 *
 * IMPORTANTE: isto NÃO é uma matriz de autorização. É apenas um mapa de nomes.
 * A autorização vem exclusivamente de `membership.permissions` (ver usePermissions).
 */
import type { TenantModuleKey, TenantModulePermission } from "@/app/providers/TenantContext";

/** Nome de módulo (UI) → resource do backend. */
export const MODULE_RESOURCE: Record<string, string> = {
  artists: "artist",
  catalog: "catalog",
  releases: "releases",
  contracts: "contracts",
  accounting: "accounting",
  crm: "crm",
  marketing: "marketing",
  events: "events",
  inventory: "inventory",
  rh: "rh",
  monitoring: "monitoring",
  licensing: "licensing",
  projects: "projects",
  leads: "leads",
  settings: "settings",
  audit: "analytics",
  musicchat: "settings",
  admin: "settings",
};

/** Ação coarse da UI → ações `resource:action` do backend (qualquer uma satisfaz). */
const TENANT_ACTION_BACKEND: Record<keyof TenantModulePermission, string[]> = {
  read: ["read"],
  write: ["update", "create"],
  delete: ["delete"],
  export: ["export"],
};

/** Converte (módulo, ação coarse) → lista de chaves `resource:action` candidatas. */
export function tenantModulePermissionKeys(
  module: TenantModuleKey,
  action: keyof TenantModulePermission,
): string[] {
  const resource = MODULE_RESOURCE[module] ?? module;
  return (TENANT_ACTION_BACKEND[action] ?? []).map((a) => `${resource}:${a}`);
}
