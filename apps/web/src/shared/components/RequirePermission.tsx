/**
 * shared/components/RequirePermission.tsx
 *
 * Gate de RBAC sobre a FONTE ÚNICA de permissões (membership.permissions, via usePermissions).
 * Renderiza `children` apenas se o utilizador tiver a permissão; caso contrário `fallback`.
 *
 * Durante o carregamento das permissões em produção (permissionKeys ainda null), renderiza
 * `loadingFallback` (por omissão null = nada visível e não-interactivo) — NUNCA abre por ausência.
 *
 * Uso:
 *   <RequirePermission module="accounting" action="write">
 *     <Button>Nova Transação</Button>
 *   </RequirePermission>
 */
import { usePermissions } from "@/shared/hooks/usePermissions";
import type { TenantModuleKey, TenantModulePermission } from "@/app/providers/TenantContext";

interface RequirePermissionProps {
  module:   TenantModuleKey;
  action:   keyof TenantModulePermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

export function RequirePermission({
  module,
  action,
  children,
  fallback = null,
  loadingFallback = null,
}: RequirePermissionProps) {
  const { canModule, isLoadingPermissions } = usePermissions();
  if (isLoadingPermissions) return <>{loadingFallback}</>;
  return canModule(module, action) ? <>{children}</> : <>{fallback}</>;
}

/** Alias semântico — gate por permissão. */
export const PermissionGate = RequirePermission;

/**
 * Hook companion — retorna true/false sem wrapper JSX.
 *   const canWrite = useHasPermission("accounting", "write");
 */
export function useHasPermission(
  module: TenantModuleKey,
  action: keyof TenantModulePermission,
): boolean {
  const { canModule } = usePermissions();
  return canModule(module, action);
}
