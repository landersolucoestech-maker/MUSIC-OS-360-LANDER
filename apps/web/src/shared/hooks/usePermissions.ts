import { useMemo } from "react";
import { useTenant } from "@/app/providers/TenantContext";
import type { TenantModuleKey, TenantModulePermission } from "@/app/providers/TenantContext";
import { AUTH_DISABLED, IS_DEV } from "@/shared/lib/env";
import { tenantModulePermissionKeys } from "@/shared/lib/permission-map";

/**
 * usePermissions — FONTE ÚNICA de autorização do frontend (FASE 7 / endurecido na 7.1).
 *
 * Consome exclusivamente `membership.permissions: string[]` (formato `resource:action`),
 * exposto pelo backend via /auth/context e armazenado em TenantContext.permissionKeys.
 * O frontend apenas oculta/bloqueia/desabilita; o backend é a autoridade final.
 *
 * Comportamento de `permissionKeys === null`:
 *  - DEV/MOCK/AUTH_DISABLED → permissivo (não trava o dev).
 *  - PRODUÇÃO real → NÃO abre (trata como "carregando/ausente" → nega). `isLoadingPermissions`
 *    sinaliza o estado para os gates renderizarem um fallback seguro.
 *
 * NÃO é uma matriz de autorização: a decisão vem só do conjunto `membership.permissions`.
 */
export interface UsePermissions {
  permissions: string[];
  isLoadingPermissions: boolean;
  hasPermission: (permission: string) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  can: (resource: string, action: string) => boolean;
  canModule: (module: TenantModuleKey, action: keyof TenantModulePermission) => boolean;
}

export function usePermissions(): UsePermissions {
  const { permissionKeys } = useTenant();

  return useMemo<UsePermissions>(() => {
    // Permissivo APENAS fora de produção (dev/mock/auth-disabled). Em produção real,
    // ausência de permissões NUNCA libera.
    const devPermissive = AUTH_DISABLED || IS_DEV;
    const isLoadingPermissions = !devPermissive && permissionKeys === null;
    const granted = new Set(permissionKeys ?? []);

    const hasPermission = (permission: string): boolean =>
      devPermissive ? true : granted.has(permission);

    return {
      permissions: permissionKeys ?? [],
      isLoadingPermissions,
      hasPermission,
      hasAllPermissions: (permissions) =>
        devPermissive ? true : permissions.every((p) => granted.has(p)),
      hasAnyPermission: (permissions) =>
        devPermissive ? true : permissions.length === 0 ? true : permissions.some((p) => granted.has(p)),
      can: (resource, action) => hasPermission(`${resource}:${action}`),
      canModule: (module, action) => {
        if (devPermissive) return true;
        return tenantModulePermissionKeys(module, action).some((k) => granted.has(k));
      },
    };
  }, [permissionKeys]);
}
