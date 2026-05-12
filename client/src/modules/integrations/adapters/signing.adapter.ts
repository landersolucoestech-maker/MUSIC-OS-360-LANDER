/**
 * integrations/adapters/signing.adapter.ts
 *
 * Adapter de assinatura digital — selecciona MockSigningProvider (standalone)
 * ou AutentiqueSigningProvider (produção — GraphQL API via backend).
 *
 * REGRA: o frontend NUNCA chama a API Autentique directamente.
 * Em produção, todas as operações passam pelo backend (tokens server-side).
 * Webhooks de assinatura são processados exclusivamente no backend.
 *
 * Uso:
 *   import { signingAdapter } from "@/modules/integrations/adapters/signing.adapter";
 *   const doc = await signingAdapter.createDocument({ title, document, signers });
 */

import type { ISigningProvider } from "@/modules/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockSigningProvider } from "@/modules/integrations/providers";

function resolveSigningProvider(): ISigningProvider {
  if (MOCK_MODE) return mockSigningProvider;

  // PRODUÇÃO: AutentiqueSigningProvider via backend:
  //   POST /api/signing/documents           → backend cria documento no Autentique
  //   GET  /api/signing/documents/:id       → backend consulta estado
  //   POST /api/signing/documents/:id/cancel → backend cancela
  //   Webhook POST /webhooks/autentique     → backend processa; frontend subscreve via polling
  // import { BackendSigningProvider } from "@/modules/integrations/providers/backend/backend-signing.provider";
  // return new BackendSigningProvider();
  return mockSigningProvider;
}

export const signingAdapter: ISigningProvider = resolveSigningProvider();
