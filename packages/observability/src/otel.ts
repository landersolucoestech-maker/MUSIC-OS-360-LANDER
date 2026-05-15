// ─── OpenTelemetry helpers ────────────────────────────────────────────────────
// Instrumentação mínima; o SDK completo é configurado no apps/api.

export interface SpanAttributes {
  tenantId?: string;
  userId?: string;
  module?: string;
  operation?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Cria um span manual simples (browser).
 * Em produção, substituído pelo SDK OTel via apps/api.
 */
export function createSpan(
  name: string,
  _attributes?: SpanAttributes,
): { end: () => void; setStatus: (status: "ok" | "error") => void } {
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      if (typeof window !== "undefined" && duration > 1000) {
        console.debug(`[otel] span "${name}" took ${duration.toFixed(1)}ms`);
      }
    },
    setStatus: (_status: "ok" | "error") => {},
  };
}

/**
 * Decorador de função para rastreamento automático.
 */
export function traced<T extends (...args: unknown[]) => Promise<unknown>>(
  name: string,
  fn: T,
): T {
  return (async (...args: unknown[]) => {
    const span = createSpan(name);
    try {
      const result = await fn(...args);
      span.setStatus("ok");
      return result;
    } catch (err) {
      span.setStatus("error");
      throw err;
    } finally {
      span.end();
    }
  }) as T;
}
