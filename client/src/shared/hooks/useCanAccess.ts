import { useCurrentRole } from "./useHasRole";
import type { AppRole } from "./useHasRole";

/**
 * Permission modules — mirrors server/src/modules/permissions/permissions.map.ts
 */
export type PermissionModule =
  | "catalog"
  | "contracts"
  | "financeiro"
  | "artists"
  | "crm"
  | "marketing"
  | "rh"
  | "settings"
  | "admin";

export type PermissionAction = "read" | "create" | "update" | "delete" | "export" | "manage";

type ModuleActions = Partial<Record<PermissionModule, PermissionAction[]>>;

const ALL:         PermissionAction[] = ["read", "create", "update", "delete", "export", "manage"];
const READ_ONLY:   PermissionAction[] = ["read"];
const CRUD:        PermissionAction[] = ["read", "create", "update", "delete"];
const CRUD_EXPORT: PermissionAction[] = ["read", "create", "update", "delete", "export"];
const READ_EXPORT: PermissionAction[] = ["read", "export"];

/**
 * Client-side permission matrix — mirrors PERMISSION_MATRIX on the backend.
 * Source of truth is the backend (`server/src/modules/permissions/permissions.map.ts`).
 * This copy is used for UI gating only (show/hide elements, guard routes).
 * Keep in sync with the backend matrix — drift will cause UI/API mismatches.
 */
const PERMISSION_MATRIX: Record<AppRole, ModuleActions> = {
  super_admin:  { catalog: ALL, contracts: ALL, financeiro: ALL, artists: ALL, crm: ALL, marketing: ALL, rh: ALL, settings: ALL, admin: ALL },
  tenant_owner: { catalog: ALL, contracts: ALL, financeiro: ALL, artists: ALL, crm: ALL, marketing: ALL, rh: ALL, settings: ALL, admin: [] },
  admin:        { catalog: CRUD_EXPORT, contracts: CRUD_EXPORT, financeiro: CRUD_EXPORT, artists: CRUD_EXPORT, crm: CRUD_EXPORT, marketing: CRUD_EXPORT, rh: CRUD_EXPORT, settings: CRUD, admin: [] },
  financeiro:   { catalog: READ_EXPORT, contracts: READ_EXPORT, financeiro: CRUD_EXPORT, artists: READ_ONLY, crm: READ_ONLY, marketing: READ_ONLY, rh: READ_EXPORT, settings: [], admin: [] },
  juridico:     { catalog: READ_ONLY, contracts: CRUD_EXPORT, financeiro: READ_EXPORT, artists: READ_ONLY, crm: READ_ONLY, marketing: READ_ONLY, rh: [], settings: [], admin: [] },
  artista:      { catalog: READ_ONLY, contracts: READ_ONLY, financeiro: [], artists: READ_ONLY, crm: [], marketing: READ_ONLY, rh: [], settings: [], admin: [] },
  produtor:     { catalog: CRUD, contracts: READ_ONLY, financeiro: READ_ONLY, artists: READ_ONLY, crm: READ_ONLY, marketing: READ_ONLY, rh: [], settings: [], admin: [] },
  marketing_manager: { catalog: READ_ONLY, contracts: READ_ONLY, financeiro: READ_EXPORT, artists: READ_ONLY, crm: CRUD, marketing: CRUD_EXPORT, rh: [], settings: [], admin: [] },
  comercial:    { catalog: READ_ONLY, contracts: ["read", "create", "update"], financeiro: READ_ONLY, artists: READ_ONLY, crm: CRUD_EXPORT, marketing: READ_ONLY, rh: [], settings: [], admin: [] },
  colaborador:  { catalog: READ_ONLY, contracts: READ_ONLY, financeiro: READ_ONLY, artists: READ_ONLY, crm: READ_ONLY, marketing: READ_ONLY, rh: READ_ONLY, settings: [], admin: [] },
  rh_manager:   { catalog: READ_ONLY, contracts: READ_ONLY, financeiro: READ_EXPORT, artists: READ_ONLY, crm: READ_ONLY, marketing: [], rh: CRUD_EXPORT, settings: READ_ONLY, admin: [] },
  viewer:       { catalog: READ_ONLY, contracts: READ_ONLY, financeiro: READ_ONLY, artists: READ_ONLY, crm: READ_ONLY, marketing: READ_ONLY, rh: READ_ONLY, settings: READ_ONLY, admin: [] },
};

/**
 * Returns true if the current user's role has the given action on the given module.
 *
 * @example
 *   useCanAccess('contracts', 'delete') // false for 'artista'
 *   useCanAccess('financeiro', 'read')  // true for all roles with financeiro access
 */
export function useCanAccess(module: PermissionModule, action: PermissionAction): boolean {
  const role = useCurrentRole();
  if (!role) return false;

  const allowed = PERMISSION_MATRIX[role]?.[module] ?? [];
  return allowed.includes("manage") || allowed.includes(action);
}

/**
 * Returns all allowed actions for the current user on a given module.
 */
export function useModuleActions(module: PermissionModule): PermissionAction[] {
  const role = useCurrentRole();
  if (!role) return [];
  return PERMISSION_MATRIX[role]?.[module] ?? [];
}
