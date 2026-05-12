/**
 * integrations/adapters/analytics.adapter.ts
 *
 * Adapter de analytics de produto — selecciona MockAnalyticsProvider (standalone)
 * ou PostHogAnalyticsProvider (produção).
 *
 * REGRA: componentes NUNCA chamam posthog-js directamente.
 * Usam hooks que delegam para este adapter.
 *
 * Uso:
 *   import { analyticsAdapter } from "@/modules/integrations/adapters/analytics.adapter";
 *   analyticsAdapter.track("contrato.created", { tenant_id, user_id });
 */

import type { IAnalyticsProvider } from "@/modules/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockAnalyticsProvider } from "@/modules/integrations/providers";

function resolveAnalyticsProvider(): IAnalyticsProvider {
  if (MOCK_MODE) return mockAnalyticsProvider;

  // PRODUÇÃO: PostHogAnalyticsProvider
  //   import posthog from "posthog-js";
  //   posthog.init(import.meta.env.VITE_POSTHOG_KEY, { api_host: "https://app.posthog.com" });
  //   return new PostHogAnalyticsProvider(posthog);
  //
  // NOTA: a VITE_POSTHOG_KEY é pública (publishable). Tokens internos ficam no backend.
  return mockAnalyticsProvider;
}

export const analyticsAdapter: IAnalyticsProvider = resolveAnalyticsProvider();
