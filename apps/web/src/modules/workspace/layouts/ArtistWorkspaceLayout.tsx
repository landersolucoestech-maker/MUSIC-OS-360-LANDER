import { useMemo } from 'react';
import { Link, Outlet, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useWorkspace } from '../hooks/useWorkspace';
import { WorkspaceProvider } from '../providers/WorkspaceContext';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'releases', label: 'Releases' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'financial', label: 'Financial' },
  { id: 'team', label: 'Team' },
  { id: 'activity', label: 'Activity' },
] as const;

export default function ArtistWorkspaceLayout() {
  const { artistId } = useParams();
  const location = useLocation();

  if (!artistId) {
    return <div className="p-6 text-sm text-destructive">Artist workspace requires an ID.</div>;
  }

  const value = useWorkspace('artist', artistId);

  const activeTab = useMemo(() => {
    const matched = tabs.find((tab) => location.pathname.endsWith(`/${tab.id}`));
    return matched?.id ?? 'overview';
  }, [location.pathname]);

  return (
    <WorkspaceProvider value={value}>
      <div className="space-y-6 p-4 lg:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.5fr,0.8fr]">
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{value.entity?.name ?? 'Artista'}</CardTitle>
                <CardDescription>
                  {value.entity?.description ?? 'Centro operacional do artista para trabalho, lançamentos e histórico.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">ID</div>
                  <div className="font-semibold">{value.workspaceId}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Status</div>
                  <div className="font-semibold">Active</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Activities</div>
                  <div className="font-semibold">{value.activities.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Workspace Console</CardTitle>
              <CardDescription>Visão inicial do cliente operacional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm">Editar artista</Button>
                <Button variant="ghost" size="sm">Ver histórico de contratos</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Tabs</CardTitle>
            <CardDescription>Conteúdo contextual com navegação interna.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  to={tab.id}
                  onClick={() => value.setCurrentTab(tab.id)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    activeTab === tab.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Outlet />
      </div>
    </WorkspaceProvider>
  );
}
