import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { useWorkspaceContext } from '../providers/WorkspaceContext';

export default function ArtistTeam() {
  const { entity } = useWorkspaceContext();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Conecte-se com colaboradores, técnicos e parceiros do artista.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Neste espaço você pode gerenciar contatos, direitos e atribuições do time.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Artista</p>
              <p className="font-semibold">{entity?.name ?? 'Carregando...'}</p>
              <p className="mt-2 text-sm text-muted-foreground">Nenhum membro cadastrado para este artista.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs  text-muted-foreground">Parceiros</p>
              <p className="font-semibold">0</p>
              <p className="mt-2 text-sm text-muted-foreground">Adicione gerentes, advogados e produtores.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


