import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { stripeClient } from '@/modules/integrations/clients/stripe.client';
import { MOCK_MODE, DEV_AUTH_BYPASS } from '@/shared/lib/env';

export interface PlanFeatures {
  moduleArtists:     boolean;
  moduleCatalog:     boolean;
  moduleContracts:   boolean;
  moduleCrm:         boolean;
  moduleMarketing:   boolean;
  moduleAccounting:  boolean;
  moduleMonitoring:  boolean;
  moduleRh:          boolean;
  moduleEvents:      boolean;
  moduleInventory:   boolean;
  moduleLicensing:   boolean;
  aiFeatures:        boolean;
  multiTenantAdmin:  boolean;
  analyticsAdvanced: boolean;
  whitelabel:        boolean;
}

const STARTER_FEATURES: PlanFeatures = {
  moduleArtists:     true,
  moduleCatalog:     true,
  moduleContracts:   true,
  moduleCrm:         true,
  moduleMarketing:   false,
  moduleAccounting:  false,
  moduleMonitoring:  false,
  moduleRh:          false,
  moduleEvents:      false,
  moduleInventory:   false,
  moduleLicensing:   false,
  aiFeatures:        false,
  multiTenantAdmin:  false,
  analyticsAdvanced: false,
  whitelabel:        false,
};

const ALL_ENABLED = Object.fromEntries(
  Object.keys(STARTER_FEATURES).map((k) => [k, true]),
) as unknown as PlanFeatures;

export function usePlanFeatures() {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn:  () => (MOCK_MODE ? Promise.resolve(null) : stripeClient.getSubscription()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    };
    window.addEventListener('billing:plan_upgraded', handler);
    return () => window.removeEventListener('billing:plan_upgraded', handler);
  }, [queryClient]);

  if (MOCK_MODE || DEV_AUTH_BYPASS) {
    return { features: ALL_ENABLED, plan: 'enterprise' as const, status: 'active', isLoading: false, isTrialing: false, isCancelled: false };
  }

  const rawFeatures = (subscription as any)?.features ?? {};
  const features: PlanFeatures = { ...STARTER_FEATURES, ...rawFeatures };

  return {
    features,
    plan:        (subscription?.plan ?? 'starter') as string,
    status:      subscription?.status ?? 'trial',
    isLoading,
    isTrialing:  subscription?.status === 'trial',
    isCancelled: subscription?.status === 'cancelled',
  };
}
