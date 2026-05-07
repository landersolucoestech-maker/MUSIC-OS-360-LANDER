/**
 * Tipos canônicos do módulo settings.
 * Constantes de permissões vivem em settings/domain/roles.rules.ts.
 */
export type { CompanySettings } from "../hooks/useCompanySettings";

export type {
  Role,
  Permission,
  RolePermission,
  TeamMember,
  TeamInvite,
} from "../hooks/useRoles";
