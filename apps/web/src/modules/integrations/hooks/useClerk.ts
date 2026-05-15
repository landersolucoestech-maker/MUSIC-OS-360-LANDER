/**
 * integrations/hooks/useClerk.ts
 *
 * Hook stub para integração Clerk (autenticação multi-tenant).
 *
 * ESTADO ACTUAL: standalone — AuthProvider em app/providers/AuthProvider.tsx.
 * MIGRAÇÃO FUTURA:
 *   1. Instalar @clerk/react
 *   2. Envolver <App> com <ClerkProvider publishableKey={...}>
 *   3. Substituir useAuth() por useClerkAuth() em toda a aplicação
 *   4. Este hook passa a delegar para @clerk/react
 *
 * Contrato: @/shared/integrations/contracts/auth.contract → IAuthProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do Clerk ────────────────────────────────────────────────

export interface ClerkStatus extends IntegrationRuntimeStatus {
  integration_id: "clerk";
  publishable_key_configured: boolean;
  organization_id?: string | null;
  session_strategy: "cookie" | "header";
}

// ─── Hook de status ───────────────────────────────────────────────────────────

/**
 * Retorna o estado da integração Clerk.
 * Em modo standalone devolve sempre disconnected.
 */
export function useClerkStatus() {
  return useQuery<ClerkStatus>({
    queryKey: ["integrations", "clerk", "status"],
    queryFn: async (): Promise<ClerkStatus> => ({
      integration_id: "clerk",
      status: "disabled",
      connected: false,
      publishable_key_configured: false,
      session_strategy: "cookie",
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

/**
 * MIGRAÇÃO FUTURA: implementar com @clerk/react hooks.
 * Todos os métodos abaixo lançam DisabledIntegrationError em modo standalone.
 */
export function useClerkSignIn() {
  return {
    signIn: () => disabledIntegration("Clerk"),
  };
}

export function useClerkSignUp() {
  return {
    signUp: () => disabledIntegration("Clerk"),
  };
}

export function useClerkOrganization() {
  return {
    organization: null,
    inviteMember: () => disabledIntegration("Clerk"),
    revokeMember: () => disabledIntegration("Clerk"),
  };
}
