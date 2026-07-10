/**
 * integrations/adapters/error-monitor.adapter.ts
 *
 * Adapter de monitoramento de erros — implementação REAL via @sentry/react.
 * O init acontece em main.tsx (VITE_SENTRY_DSN, DSN público de browser);
 * sem DSN configurado, o SDK descarta os eventos — nunca há dados simulados.
 *
 * REGRA: componentes NUNCA importam @sentry/react directamente.
 * Usam hooks/serviços que delegam para este adapter.
 *
 * Uso:
 *   import { errorMonitorAdapter } from "@/modules/integrations/adapters/error-monitor.adapter";
 *   errorMonitorAdapter.captureError(error, { module: "accounting", action: "create" });
 */

import * as Sentry from "@sentry/react";
import type { IErrorMonitorProvider, PerformanceTransaction } from "@/modules/integrations/dto";

export const errorMonitorAdapter: IErrorMonitorProvider = {
  captureError(error, context, severity) {
    return Sentry.captureException(error, {
      level: severity,
      extra: context as Record<string, unknown> | undefined,
    });
  },
  captureMessage(message, severity, context) {
    return Sentry.captureMessage(message, {
      level: severity,
      extra: context as Record<string, unknown> | undefined,
    });
  },
  setUser(user) {
    Sentry.setUser(user ? { id: user.id, email: user.email } : null);
    if (user?.tenant_id) Sentry.setTag("tenant_id", user.tenant_id);
  },
  addBreadcrumb(entry) {
    Sentry.addBreadcrumb({
      category: entry.category,
      message: entry.message,
      level: entry.level,
      data: entry.data,
    });
  },
  startTransaction(name, op): PerformanceTransaction {
    const span = Sentry.startInactiveSpan({ name, op });
    return {
      name,
      op,
      finish: () => span?.end(),
      setTag: (key, value) => span?.setAttribute(key, value),
      setData: (key, value) => span?.setAttribute(key, value as string | number | boolean),
    };
  },
  setTag(key, value) {
    Sentry.setTag(key, value);
  },
  setContext(key, context) {
    Sentry.setContext(key, context);
  },
};
