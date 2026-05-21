import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useWorkspaceContext } from '../providers/WorkspaceContext';
import { ActivityTimeline } from '../components/ActivityTimeline';

export default function ArtistOverview() {
  const { entity, activities, isLoadingActivities } = useWorkspaceContext();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Artist</CardTitle>
            <CardDescription>Informações principais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Nome</p>
              <p className="font-semibold">{entity?.name ?? 'Carregando...'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Entity ID</p>
              <p className="font-semibold break-all">{entity?.id ?? '...'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Descrição</p>
              <p className="text-sm text-muted-foreground">{entity?.description ?? 'Sem descrição adicional.'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Atalhos rápidos</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="secondary" size="sm">Ver detalhes</Button>
            <Button variant="outline" size="sm">Abrir relatórios</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overview Metrics</CardTitle>
            <CardDescription>Resumo inicial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lançamentos</span>
              <span className="font-semibold">8</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Campanhas</span>
              <span className="font-semibold">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Atividades</span>
              <span className="font-semibold">{activities.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ActivityTimeline activities={activities} isLoading={isLoadingActivities} />
    </div>
  );
}
