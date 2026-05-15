/**
 * shared/components/RequirePermission.tsx
 *
 * HOC / wrapper de RBAC.  Renderiza `children` apenas se o utilizador tiver
 * a permissão requerida no módulo indicado.  Caso contrário, renderiza
 * `fallback` (por omissão: null — o elemento é invisível e não interactivo).
 *
 * Uso:
 *   <RequirePermission module="accounting" action="write">
 *     <Button>Nova Transação</Button>
 *   </RequirePermission>
 *
 *   <RequirePermission module="contracts" action="delete" fallback={<span>Sem permissão</span>}>
 *     <Button variant="destructive">Eliminar</Button>
 *   </RequirePermission>
 */
import { useTenant } from "@/app/providers/TenantContext";
import type { TenantModuleKey, TenantModulePermission } from "@/app/providers/TenantContext";

interface RequirePermissionProps {
  module:   TenantModuleKey;
  action:   keyof TenantModulePermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({
  module,
  action,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { hasPermission } = useTenant();
  return hasPermission(module, action) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook companion — retorna true/false sem precisar de wrapper JSX.
 *
 * Uso:
 *   const canWrite = useHasPermission("accounting", "write");
 */
export function useHasPermission(
  module: TenantModuleKey,
  action: keyof TenantModulePermission,
): boolean {
  const { hasPermission } = useTenant();
  return hasPermission(module, action);
}
