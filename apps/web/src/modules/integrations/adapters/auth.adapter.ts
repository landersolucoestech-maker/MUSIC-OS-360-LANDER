/**
 * integrations/adapters/auth.adapter.ts
 *
 * Adapter de autenticação — selecciona MockAuthProvider (standalone)
 * ou NestAuthProvider (produção) sem expor detalhes ao código de domínio.
 *
 * REGRA: módulos NUNCA importam o provider directamente.
 * Importam sempre daqui.
 *
 * Uso:
 *   import { authAdapter } from "@/modules/integrations/adapters/auth.adapter";
 *   const session = await authAdapter.signIn({ email, password });
 */

import type { IAuthProvider } from "@/modules/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockAuthProvider } from "@/modules/integrations/providers";

function resolveAuthProvider(): IAuthProvider {
  if (MOCK_MODE) return mockAuthProvider;

  // PRODUÇÃO: NestAuthProvider via JWT
  // import { nestAuthProvider } from "@/modules/integrations/providers/nest/nest-auth.provider";
  // return nestAuthProvider;
  return mockAuthProvider;
}

export const authAdapter: IAuthProvider = resolveAuthProvider();
