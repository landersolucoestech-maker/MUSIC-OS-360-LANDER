/**
 * integrations/adapters/email.adapter.ts
 *
 * Adapter de e-mail transaccional — selecciona MockEmailProvider (standalone)
 * ou ResendEmailProvider (produção — via backend proxy).
 *
 * REGRA: o frontend NUNCA chama Resend directamente.
 * Em produção, chama POST /api/email/send no backend.
 *
 * Uso:
 *   import { emailAdapter } from "@/integrations/adapters/email.adapter";
 *   await emailAdapter.send({ to: { email }, subject, template_id: "user-invite", template_vars });
 */

import type { IEmailProvider } from "@/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockEmailProvider } from "@/integrations/providers";

function resolveEmailProvider(): IEmailProvider {
  if (MOCK_MODE) return mockEmailProvider;

  // PRODUÇÃO: ResendEmailProvider que chama o backend:
  //   POST /api/email/send  →  backend chama Resend API com a API key server-side
  // import { BackendEmailProvider } from "@/integrations/providers/backend/backend-email.provider";
  // return new BackendEmailProvider();
  return mockEmailProvider;
}

export const emailAdapter: IEmailProvider = resolveEmailProvider();
