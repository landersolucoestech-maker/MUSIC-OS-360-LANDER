import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { useWorkspaceContext } from '../providers/WorkspaceContext';

export default function ArtistReleases() {
  const { entity } = useWorkspaceContext();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <CardDescription>Todos os lançamentos vinculados a este artista.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui serão exibidos os lançamentos ativos, pré-lançamentos e o histórico de distribuição.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Artista</p>
              <p className="font-semibold">{entity?.name ?? 'Carregando...'}</p>
              <p className="mt-2 text-sm text-muted-foreground">Lançamentos recentes ainda não carregados.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Lançamentos</p>
              <p className="font-semibold">0</p>
              <p className="mt-2 text-sm text-muted-foreground">Você poderá ver lançamentos filtrados por status aqui.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


