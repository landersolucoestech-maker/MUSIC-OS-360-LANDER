/**
 * integrations/providers/mock/mock-error-monitor.provider.ts
 *
 * Implementação mock de IErrorMonitorProvider (Sentry).
 * Em modo standalone: usa console.error/warn em DEV, silencia em PROD.
 *
 * MIGRAÇÃO FUTURA: substituir por SentryErrorMonitorProvider (@sentry/react via backend DSN).
 */

import type {
  IErrorMonitorProvider,
  ErrorContext,
  ErrorSeverity,
  BreadcrumbEntry,
  PerformanceTransaction,
} from "@/modules/integrations/dto";
import { IS_DEV } from "@/shared/lib/env";

class MockTransaction implements PerformanceTransaction {
  constructor(public name: string, public op: string) {
    if (IS_DEV) console.info(`[MockSentry] startTransaction → ${op}:${name}`);
  }
  finish(): void {
    if (IS_DEV) console.info(`[MockSentry] finishTransaction → ${this.op}:${this.name}`);
  }
  setTag(_key: string, _value: string): void { /* no-op */ }
  setData(_key: string, _value: unknown): void { /* no-op */ }
}

export class MockErrorMonitorProvider implements IErrorMonitorProvider {
  captureError(error: Error, context?: ErrorContext, severity?: ErrorSeverity): string {
    const id = `mock_event_${Date.now()}`;
    const lvl = severity ?? "error";
    if (IS_DEV) {
      console.error(`[MockSentry] captureError [${lvl}] ${error.message}`, {
        error,
        context,
      });
    }
    return id;
  }

  captureMessage(
    message: string,
    severity?: ErrorSeverity,
    context?: ErrorContext
  ): string {
    const id  = `mock_event_${Date.now()}`;
    const lvl = severity ?? "info";
    if (IS_DEV) {
      console.warn(`[MockSentry] captureMessage [${lvl}] ${message}`, context ?? {});
    }
    return id;
  }

  setUser(
    user: { id: string; email?: string; tenant_id?: string } | null
  ): void {
    if (IS_DEV) console.info(`[MockSentry] setUser →`, user);
  }

  addBreadcrumb(entry: BreadcrumbEntry): void {
    if (IS_DEV) {
      console.debug(`[MockSentry] breadcrumb [${entry.category}] ${entry.message}`);
    }
  }

  startTransaction(name: string, op: string): PerformanceTransaction {
    return new MockTransaction(name, op);
  }

  setTag(_key: string, _value: string): void { /* no-op */ }
  setContext(_key: string, _context: Record<string, unknown>): void { /* no-op */ }
}

export const mockErrorMonitorProvider = new MockErrorMonitorProvider();
