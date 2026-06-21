import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { useWorkspaceContext } from '../providers/WorkspaceContext';

export default function ArtistFinancial() {
  const { entity } = useWorkspaceContext();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
          <CardDescription>Resumo financeiro e fluxo de receita para o artista.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Relatórios de receita, previsões e saldo de pagamentos aparecerão aqui.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Artista</p>
              <p className="font-semibold">{entity?.name ?? 'Carregando...'}</p>
              <p className="mt-2 text-sm text-muted-foreground">Resumo financeiro ainda não disponível.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Receita</p>
              <p className="font-semibold">R$ 0,00</p>
              <p className="mt-2 text-sm text-muted-foreground">Aguardando consolidação comercial e streams.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


