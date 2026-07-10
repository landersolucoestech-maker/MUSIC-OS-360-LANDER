/**
 * integrations/adapters/analytics.adapter.ts
 *
 * Adapter de analytics de produto — implementação REAL via posthog-js.
 * O init acontece em main.tsx (VITE_POSTHOG_KEY, chave publishable);
 * antes do init ou sem chave configurada, os eventos são descartados
 * pelo próprio posthog-js — nunca há dados simulados.
 *
 * REGRA: componentes NUNCA chamam posthog-js directamente.
 * Usam hooks/serviços que delegam para este adapter.
 *
 * Uso:
 *   import { analyticsAdapter } from "@/modules/integrations/adapters/analytics.adapter";
 *   analyticsAdapter.track("contrato.created", { tenant_id, user_id });
 */

import posthog from "posthog-js";
import type { IAnalyticsProvider } from "@/modules/integrations/dto";

export const analyticsAdapter: IAnalyticsProvider = {
  identify(userId, properties) {
    if (!posthog.__loaded) return;
    posthog.identify(userId, properties as Record<string, unknown> | undefined);
  },
  track(event, properties) {
    if (!posthog.__loaded) return;
    posthog.capture(event, properties as Record<string, unknown> | undefined);
  },
  page(name, properties) {
    if (!posthog.__loaded) return;
    posthog.capture("$pageview", { page_name: name, ...(properties as Record<string, unknown> | undefined) });
  },
  async isFeatureEnabled(flagKey, _context) {
    if (!posthog.__loaded) return false;
    return posthog.isFeatureEnabled(flagKey) ?? false;
  },
  async getFeatureFlagPayload(flagKey, _context) {
    if (!posthog.__loaded) return null;
    const payload = posthog.getFeatureFlagPayload(flagKey);
    return payload == null ? null : typeof payload === "string" ? payload : JSON.stringify(payload);
  },
  reset() {
    if (!posthog.__loaded) return;
    posthog.reset();
  },
};
