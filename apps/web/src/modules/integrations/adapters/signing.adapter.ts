/**
 * integrations/adapters/signing.adapter.ts
 *
 * Adapter de assinatura digital.
 *
 * REGRA: o frontend NUNCA chama APIs externas de assinatura directamente e
 * NUNCA simula sucesso. Enquanto o fluxo não estiver fiado ao backend real
 * (/integrations/autentique), qualquer chamada falha explicitamente — mesmo
 * padrão de unavailable.provider (storage/streaming).
 *
 * Uso:
 *   import { resolveSigningAdapter } from "@/modules/integrations/adapters/signing.adapter";
 *   const adapter = resolveSigningAdapter("autentique");
 */

import type { ISigningProvider } from "@/modules/integrations/dto";

export type SigningProviderId = "autentique" | "clicksign" | "docusign";

function unavailable(provider: string): never {
  throw new Error(
    `Assinatura digital (${provider}) não possui provider real configurado no frontend. ` +
    "Use o backend real (/integrations/autentique) antes de chamar este adapter.",
  );
}

function createUnavailableSigningProvider(provider: SigningProviderId): ISigningProvider {
  return {
    createDocument: () => Promise.reject(unavailable(provider)),
    getDocument:    () => Promise.reject(unavailable(provider)),
    listDocuments:  () => Promise.reject(unavailable(provider)),
    cancelDocument: () => Promise.reject(unavailable(provider)),
    resendInvite:   () => Promise.reject(unavailable(provider)),
    handleWebhook:  () => Promise.reject(unavailable(provider)),
    verifyConnection: () => Promise.resolve(false),
  };
}

export function resolveSigningAdapter(provider: SigningProviderId = "autentique"): ISigningProvider {
  return createUnavailableSigningProvider(provider);
}

export const signingAdapter: ISigningProvider = createUnavailableSigningProvider("autentique");
