/**
 * integrations/adapters/signing.adapter.ts
 *
 * Adapter de assinatura digital — seleciona o provider correto
 * com base no ID do provedor especificado pelo chamador.
 *
 * Providers suportados (mock mode):
 *   - "autentique"  → MockSigningProvider (padrão)
 *   - "clicksign"   → MockClicksignProvider (requer credenciais em localStorage)
 *   - "docusign"    → MockDocuSignProvider  (requer credenciais em localStorage)
 *
 * REGRA: o frontend NUNCA chama APIs externas de assinatura directamente.
 * Em produção, todas as operações passam pelo backend.
 *
 * Uso:
 *   import { resolveSigningAdapter } from "@/modules/integrations/adapters/signing.adapter";
 *   const adapter = resolveSigningAdapter("clicksign");
 *   const doc = await adapter.createDocument({ title, document, signers });
 */

import type { ISigningProvider } from "@/modules/integrations/dto";
import { mockSigningProvider }    from "@/modules/integrations/providers/mock/mock-signing.provider";
import { mockClicksignProvider }  from "@/modules/integrations/providers/mock/mock-clicksign.provider";
import { mockDocuSignProvider }   from "@/modules/integrations/providers/mock/mock-docusign.provider";

export type SigningProviderId = "autentique" | "clicksign" | "docusign";

export function resolveSigningAdapter(provider: SigningProviderId = "autentique"): ISigningProvider {
  switch (provider) {
    case "clicksign": return mockClicksignProvider;
    case "docusign":  return mockDocuSignProvider;
    default:          return mockSigningProvider;
  }
}

export const signingAdapter: ISigningProvider = mockSigningProvider;
