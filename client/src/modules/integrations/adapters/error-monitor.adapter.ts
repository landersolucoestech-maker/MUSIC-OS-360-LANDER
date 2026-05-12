/**
 * integrations/adapters/error-monitor.adapter.ts
 *
 * Adapter de monitoramento de erros — selecciona MockErrorMonitorProvider (standalone)
 * ou SentryErrorMonitorProvider (produção).
 *
 * REGRA: componentes NUNCA importam @sentry/react directamente.
 * Usam hooks que delegam para este adapter.
 *
 * Uso:
 *   import { errorMonitorAdapter } from "@/modules/integrations/adapters/error-monitor.adapter";
 *   errorMonitorAdapter.captureError(error, { module: "accounting", action: "create" });
 */

import type { IErrorMonitorProvider } from "@/modules/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockErrorMonitorProvider } from "@/modules/integrations/providers";

function resolveErrorMonitorProvider(): IErrorMonitorProvider {
  if (MOCK_MODE) return mockErrorMonitorProvider;

  // PRODUÇÃO: SentryErrorMonitorProvider
  //   import * as Sentry from "@sentry/react";
  //   Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, ... });
  //   return new SentryErrorMonitorProvider(Sentry);
  //
  // NOTA: VITE_SENTRY_DSN é público (DSN do browser). Auth tokens ficam no backend.
  return mockErrorMonitorProvider;
}

export const errorMonitorAdapter: IErrorMonitorProvider = resolveErrorMonitorProvider();
