/**
 * DevAuthBypassBanner — banner de aviso quando DEV_AUTH_BYPASS está activo.
 *
 * Renderiza uma faixa fixa (bottom) com aviso amarelo/âmbar em desenvolvimento.
 * Nunca visível em produção — DEV_AUTH_BYPASS é false em builds prod (env.ts).
 */

import { DEV_AUTH_BYPASS } from "@/shared/lib/env";
import { ShieldOff } from "lucide-react";

export function DevAuthBypassBanner() {
  if (!DEV_AUTH_BYPASS) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-amber-950 text-xs font-semibold select-none"
      role="alert"
      aria-label="DEV AUTH BYPASS activo"
      data-testid="dev-auth-bypass-banner"
    >
      <ShieldOff className="h-3.5 w-3.5 shrink-0" />
      <span>
        ⚠ DEV AUTH BYPASS ACTIVO — autenticação e RBAC desactivados para desenvolvimento. Nunca usar em produção.
      </span>
      <ShieldOff className="h-3.5 w-3.5 shrink-0" />
    </div>
  );
}
