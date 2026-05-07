import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Activity, Users, FileText, Music, DollarSign, UserCheck, Radio, Shield } from 'lucide-react';
import { useWsEvent } from '@/shared/hooks/useWsEvent';
import { cn } from '@/shared/lib/utils';

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  timestamp: Date;
}

const MAX_ITEMS = 20;

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return date.toLocaleDateString('pt-BR');
}

/**
 * Realtime activity feed.
 *
 * - In WS mode: subscribes to all domain events via useWsEvent.
 * - In mock mode: listens to musicos360:* CustomEvents dispatched by the
 *   frontend domain-events bus so actions in the UI still appear in the feed.
 *
 * Keeps the last MAX_ITEMS entries, newest first.
 */
export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [tick, setTick] = useState(0);

  const push = useCallback((item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    setItems((prev) =>
      [{ id: crypto.randomUUID(), timestamp: new Date(), ...item }, ...prev].slice(0, MAX_ITEMS),
    );
  }, []);

  // ── Update relative timestamps every 30s ───────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── WS mode subscriptions ─────────────────────────────────────────────────
  useWsEvent('artist.created', (d) =>
    push({ icon: <Users className="h-3.5 w-3.5" />, label: 'Artista cadastrado', description: d.id, badge: 'Artista', badgeVariant: 'default' }),
  );
  useWsEvent('artist.updated', (d) =>
    push({ icon: <Users className="h-3.5 w-3.5" />, label: 'Artista atualizado', description: d.id, badge: 'Artista', badgeVariant: 'secondary' }),
  );
  useWsEvent('artist.deleted', (d) =>
    push({ icon: <Users className="h-3.5 w-3.5" />, label: 'Artista removido', description: d.id, badge: 'Artista', badgeVariant: 'outline' }),
  );
  useWsEvent('catalog.music.registered', (d) =>
    push({ icon: <Music className="h-3.5 w-3.5" />, label: 'Música registrada', description: (d as { titulo?: string }).titulo ?? d.id, badge: 'Catálogo', badgeVariant: 'default' }),
  );
  useWsEvent('catalog.phonogram.registered', (d) =>
    push({ icon: <Music className="h-3.5 w-3.5" />, label: 'Fonograma registrado', description: d.id, badge: 'Catálogo', badgeVariant: 'secondary' }),
  );
  useWsEvent('contract.created', () =>
    push({ icon: <FileText className="h-3.5 w-3.5" />, label: 'Contrato criado', description: 'Novo contrato adicionado', badge: 'Contrato', badgeVariant: 'default' }),
  );
  useWsEvent('contract.updated', () =>
    push({ icon: <FileText className="h-3.5 w-3.5" />, label: 'Contrato atualizado', description: 'Alterações salvas', badge: 'Contrato', badgeVariant: 'secondary' }),
  );
  useWsEvent('contract.signed', () =>
    push({ icon: <FileText className="h-3.5 w-3.5" />, label: 'Contrato assinado', description: 'Assinatura registrada', badge: 'Contrato', badgeVariant: 'default' }),
  );
  useWsEvent('crm.lead.captured', (d) =>
    push({ icon: <UserCheck className="h-3.5 w-3.5" />, label: 'Lead capturado', description: (d as { nome?: string }).nome ?? d.id, badge: 'CRM', badgeVariant: 'default' }),
  );
  useWsEvent('crm.lead.converted', () =>
    push({ icon: <UserCheck className="h-3.5 w-3.5" />, label: 'Lead convertido', description: 'Lead virou artista/cliente', badge: 'CRM', badgeVariant: 'default' }),
  );
  useWsEvent('finance.transaction.created', (d) =>
    push({ icon: <DollarSign className="h-3.5 w-3.5" />, label: 'Transação registrada', description: `${(d as { tipo?: string }).tipo ?? 'transação'}`, badge: 'Financeiro', badgeVariant: 'default' }),
  );
  useWsEvent('finance.transaction.updated', () =>
    push({ icon: <DollarSign className="h-3.5 w-3.5" />, label: 'Transação atualizada', description: 'Alterações salvas', badge: 'Financeiro', badgeVariant: 'secondary' }),
  );
  useWsEvent('finance.calculated', () =>
    push({ icon: <DollarSign className="h-3.5 w-3.5" />, label: 'Apuração concluída', description: 'Financeiro recalculado', badge: 'Financeiro', badgeVariant: 'default' }),
  );
  useWsEvent('audit.entry.created', (d) =>
    push({ icon: <Shield className="h-3.5 w-3.5" />, label: `Auditoria: ${d.action}`, description: d.entity, badge: 'Sistema', badgeVariant: 'outline' }),
  );

  // ── Mock mode: window CustomEvents from the domain-events bus ────────────
  const pushRef = useRef(push);
  pushRef.current = push;

  useEffect(() => {
    const handlers: { event: string; fn: EventListener }[] = [
      {
        event: 'musicos360:ARTIST_CREATED',
        fn: (e) => {
          const d = (e as CustomEvent).detail as { nome_artistico?: string };
          pushRef.current({ icon: <Users className="h-3.5 w-3.5" />, label: 'Artista cadastrado', description: d.nome_artistico ?? '–', badge: 'Artista', badgeVariant: 'default' });
        },
      },
      {
        event: 'musicos360:ARTIST_UPDATED',
        fn: () => pushRef.current({ icon: <Users className="h-3.5 w-3.5" />, label: 'Artista atualizado', description: 'Dados alterados', badge: 'Artista', badgeVariant: 'secondary' }),
      },
      {
        event: 'musicos360:ARTIST_DELETED',
        fn: () => pushRef.current({ icon: <Users className="h-3.5 w-3.5" />, label: 'Artista removido', description: '–', badge: 'Artista', badgeVariant: 'outline' }),
      },
      {
        event: 'musicos360:MUSIC_REGISTERED',
        fn: (e) => {
          const d = (e as CustomEvent).detail as { titulo?: string };
          pushRef.current({ icon: <Music className="h-3.5 w-3.5" />, label: 'Música registrada', description: d.titulo ?? '–', badge: 'Catálogo', badgeVariant: 'default' });
        },
      },
      {
        event: 'musicos360:CONTRACT_CREATED',
        fn: () => pushRef.current({ icon: <FileText className="h-3.5 w-3.5" />, label: 'Contrato criado', description: 'Novo contrato adicionado', badge: 'Contrato', badgeVariant: 'default' }),
      },
      {
        event: 'musicos360:CONTRACT_UPDATED',
        fn: () => pushRef.current({ icon: <FileText className="h-3.5 w-3.5" />, label: 'Contrato atualizado', description: 'Alterações salvas', badge: 'Contrato', badgeVariant: 'secondary' }),
      },
      {
        event: 'musicos360:CONTRACT_SIGNED',
        fn: () => pushRef.current({ icon: <FileText className="h-3.5 w-3.5" />, label: 'Contrato assinado', description: 'Assinatura registrada', badge: 'Contrato', badgeVariant: 'default' }),
      },
      {
        event: 'musicos360:LEAD_CAPTURED',
        fn: (e) => {
          const d = (e as CustomEvent).detail as { nome?: string };
          pushRef.current({ icon: <UserCheck className="h-3.5 w-3.5" />, label: 'Lead capturado', description: d.nome ?? '–', badge: 'CRM', badgeVariant: 'default' });
        },
      },
      {
        event: 'musicos360:LEAD_CONVERTED',
        fn: () => pushRef.current({ icon: <UserCheck className="h-3.5 w-3.5" />, label: 'Lead convertido', description: 'Lead virou artista/cliente', badge: 'CRM', badgeVariant: 'default' }),
      },
      {
        event: 'musicos360:TRANSACTION_CREATED',
        fn: (e) => {
          const d = (e as CustomEvent).detail as { tipo?: string };
          pushRef.current({ icon: <DollarSign className="h-3.5 w-3.5" />, label: 'Transação registrada', description: d.tipo ?? 'transação', badge: 'Financeiro', badgeVariant: 'default' });
        },
      },
      {
        event: 'musicos360:TRANSACTION_UPDATED',
        fn: () => pushRef.current({ icon: <DollarSign className="h-3.5 w-3.5" />, label: 'Transação atualizada', description: 'Alterações salvas', badge: 'Financeiro', badgeVariant: 'secondary' }),
      },
      {
        event: 'musicos360:FINANCE_CALCULATED',
        fn: () => pushRef.current({ icon: <Radio className="h-3.5 w-3.5" />, label: 'Apuração concluída', description: 'Financeiro recalculado', badge: 'Financeiro', badgeVariant: 'default' }),
      },
    ];

    handlers.forEach(({ event, fn }) => window.addEventListener(event, fn));
    return () => handlers.forEach(({ event, fn }) => window.removeEventListener(event, fn));
  }, []);

  void tick;

  return (
    <Card className="flex flex-col" data-testid="card-activity-feed">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Feed de Atividades
        </CardTitle>
        {items.length > 0 && (
          <Badge variant="secondary" className="font-mono text-xs">
            {items.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[280px] px-6 pb-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Aguardando atividade…</p>
              <p className="text-xs mt-1 opacity-60">Ações como criar artistas ou registrar músicas aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-border/50">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 py-3 transition-colors',
                    idx === 0 && 'animate-in slide-in-from-top-1 duration-300',
                  )}
                  data-testid={`activity-item-${item.id}`}
                >
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge variant={item.badgeVariant ?? 'secondary'} className="text-xs px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
