import { type ReactNode } from 'react';
import { Lock, Zap }      from 'lucide-react';
import { Button }         from '@/shared/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/shared/ui/card';
import { usePlanFeatures, type PlanFeatures } from '@/shared/hooks/usePlanFeatures';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature:      keyof PlanFeatures;
  children:     ReactNode;
  fallback?:    ReactNode;
  featureName?: string;
  requiredPlan?: 'professional' | 'enterprise';
}

export function FeatureGate({
  feature,
  children,
  fallback,
  featureName  = 'Este módulo',
  requiredPlan = 'professional',
}: FeatureGateProps) {
  const { features, isLoading } = usePlanFeatures();
  const navigate = useNavigate();

  if (isLoading) return null;
  if (features[feature]) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{featureName} não disponível</CardTitle>
          <CardDescription>
            Disponível a partir do plano{' '}
            <span className="font-semibold capitalize">{requiredPlan}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button className="w-full gap-2" onClick={() => navigate('/settings/billing')}>
            <Zap className="h-4 w-4" />
            Ver planos e fazer upgrade
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function FeatureRequired({
  feature,
  children,
}: {
  feature: keyof PlanFeatures;
  children: ReactNode;
}) {
  const { features } = usePlanFeatures();
  if (!features[feature]) return null;
  return <>{children}</>;
}
