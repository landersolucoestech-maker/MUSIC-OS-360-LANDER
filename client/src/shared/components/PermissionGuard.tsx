import { ShieldX } from "lucide-react";
import { useCanAccess } from "@/shared/hooks/useCanAccess";
import { useCurrentRole } from "@/shared/hooks/useHasRole";
import type { PermissionModule, PermissionAction } from "@/shared/hooks/useCanAccess";

interface PermissionGuardProps {
  children: React.ReactNode;
  /**
   * Module + action to check. If the user's role doesn't have access,
   * the fallback (or default AccessDenied) is rendered instead.
   *
   * @example
   *   <PermissionGuard module="financeiro" action="delete">
   */
  module: PermissionModule;
  action: PermissionAction;
  fallback?: React.ReactNode;
  /**
   * Legacy: if provided, acts as a pass-through (ignored, kept for back-compat).
   * Prefer the module/action API.
   */
  requiredPermission?: string;
}

export function PermissionGuard({ children, module, action, fallback }: PermissionGuardProps) {
  const canAccess = useCanAccess(module, action);
  const role = useCurrentRole();

  if (!role) return fallback ? <>{fallback}</> : <AccessDenied />;
  if (!canAccess) return fallback ? <>{fallback}</> : <AccessDenied />;

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <ShieldX className="h-12 w-12" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Acesso Negado</h3>
        <p className="text-sm mt-1">Você não tem permissão para acessar esta página.</p>
        <p className="text-xs mt-2">Entre em contato com o administrador do sistema.</p>
      </div>
    </div>
  );
}
