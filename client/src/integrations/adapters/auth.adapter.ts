/**
 * integrations/adapters/auth.adapter.ts
 *
 * Adapter de autenticação — selecciona MockAuthProvider (standalone)
 * ou ClerkAuthProvider (produção) sem expor detalhes ao código de domínio.
 *
 * REGRA: módulos NUNCA importam o provider directamente.
 * Importam sempre daqui.
 *
 * Uso:
 *   import { authAdapter } from "@/integrations/adapters/auth.adapter";
 *   const session = await authAdapter.signIn({ email, password });
 */

import type { IAuthProvider } from "@/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockAuthProvider } from "@/integrations/providers";

/**
 * MIGRAÇÃO: quando Clerk estiver configurado, substituir este bloco:
 *
 *   import { ClerkAuthProvider } from "@/integrations/providers/clerk/clerk-auth.provider";
 *   const realProvider = new ClerkAuthProvider({ publishableKey: import.meta.env.VITE_CLERK_KEY });
 */

function resolveAuthProvider(): IAuthProvider {
  if (MOCK_MODE) return mockAuthProvider;

  // PRODUÇÃO: Clerk provider (a implementar quando backend estiver pronto)
  // return realAuthProvider;
  return mockAuthProvider; // fallback enquanto real não está implementado
}

export const authAdapter: IAuthProvider = resolveAuthProvider();
