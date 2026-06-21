import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { useWorkspaceContext } from '../providers/WorkspaceContext';

export default function ArtistCampaigns() {
  const { entity } = useWorkspaceContext();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
          <CardDescription>Visão rápida das campanhas e ações de marketing em andamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use esta tela para planejar e acompanhar as campanhas de audiências, playlists e publicidade.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Marca</p>
              <p className="font-semibold">{entity?.name ?? 'Carregando...'}</p>
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma campanha ativa ainda.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Engajamento</p>
              <p className="font-semibold">0%</p>
              <p className="mt-2 text-sm text-muted-foreground">Meta de engajamento ainda não definida.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


