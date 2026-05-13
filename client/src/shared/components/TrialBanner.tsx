import { AlertCircle } from 'lucide-react';
import { Button }      from '@/shared/ui/button';
import { usePlanFeatures } from '@/shared/hooks/usePlanFeatures';
import { useNavigate }     from 'react-router-dom';
import { MOCK_MODE }       from '@/shared/lib/env';

export function TrialBanner() {
  const { isTrialing } = usePlanFeatures();
  const navigate = useNavigate();

  if (MOCK_MODE || !isTrialing) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Você está no período trial. Faça upgrade para acesso completo.</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-amber-800 border-amber-300 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-700"
          onClick={() => navigate('/settings/billing')}
        >
          Fazer upgrade
        </Button>
      </div>
    </div>
  );
}
