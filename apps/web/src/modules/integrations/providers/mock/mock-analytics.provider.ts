/**
 * integrations/providers/mock/mock-analytics.provider.ts
 *
 * Implementação mock de IAnalyticsProvider (PostHog).
 * Em modo standalone: loga em consola em DEV, silencia em PROD.
 *
 * MIGRAÇÃO FUTURA: substituir por PostHogAnalyticsProvider (posthog-js via backend proxy).
 */

import type {
  IAnalyticsProvider,
  AnalyticsEventName,
  AnalyticsEventProperties,
  FeatureFlagContext,
} from "@/modules/integrations/dto";
import { IS_DEV } from "@/shared/lib/env";

export class MockAnalyticsProvider implements IAnalyticsProvider {
  identify(userId: string, properties?: AnalyticsEventProperties): void {
    if (IS_DEV) {
      console.info(`[MockAnalytics] identify → ${userId}`, properties ?? {});
    }
  }

  track(event: AnalyticsEventName, properties?: AnalyticsEventProperties): void {
    if (IS_DEV) {
      console.info(`[MockAnalytics] track → ${event}`, properties ?? {});
    }
  }

  page(name: string, properties?: AnalyticsEventProperties): void {
    if (IS_DEV) {
      console.info(`[MockAnalytics] page → ${name}`, properties ?? {});
    }
  }

  async isFeatureEnabled(
    _flagKey: string,
    _context: FeatureFlagContext
  ): Promise<boolean> {
    // standalone: todas as flags activas
    return true;
  }

  async getFeatureFlagPayload(
    _flagKey: string,
    _context: FeatureFlagContext
  ): Promise<string | null> {
    return null;
  }

  reset(): void {
    if (IS_DEV) {
      console.info("[MockAnalytics] reset");
    }
  }
}

export const mockAnalyticsProvider = new MockAnalyticsProvider();

