/**
 * useCanAccess — gate por (módulo, ação) sobre a FONTE ÚNICA de permissões.
 *
 * FASE 7: NÃO consulta mais matriz local (PERMISSION_MATRIX) nem role. Traduz
 * `module + action` → `resource:action` (via MODULE_RESOURCE — apenas nomes) e
 * consulta usePermissions(), cuja única fonte é membership.permissions.
 */
import { usePermissions } from "./usePermissions";
import { MODULE_RESOURCE } from "@/shared/lib/permission-map";

export type PermissionModule =
  | "catalog"
  | "contracts"
  | "accounting"
  | "artists"
  | "crm"
  | "marketing"
  | "rh"
  | "settings"
  | "admin";

export type PermissionAction = "read" | "create" | "update" | "delete" | "export" | "manage";

/** Ação da UI → ações `resource:action` do backend (qualquer uma satisfaz). */
const ACTION_BACKEND: Record<PermissionAction, string[]> = {
  read: ["read"],
  create: ["create"],
  update: ["update"],
  delete: ["delete"],
  export: ["export"],
  manage: ["update", "delete"],
};

/** true se o utilizador tem a ação no módulo, segundo membership.permissions. */
export function useCanAccess(module: PermissionModule, action: PermissionAction): boolean {
  const { hasAnyPermission } = usePermissions();
  const resource = MODULE_RESOURCE[module] ?? module;
  return hasAnyPermission(ACTION_BACKEND[action].map((a) => `${resource}:${a}`));
}

/** Ações permitidas para o utilizador no módulo (derivadas de membership.permissions). */
export function useModuleActions(module: PermissionModule): PermissionAction[] {
  const { can } = usePermissions();
  const resource = MODULE_RESOURCE[module] ?? module;
  return (["read", "create", "update", "delete", "export"] as PermissionAction[]).filter((a) =>
    can(resource, a),
  );
}
