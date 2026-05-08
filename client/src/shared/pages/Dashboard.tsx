import { useState, useCallback, useEffect, useRef } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Users, FileText, DollarSign, Calendar, ArrowRight,
  Music, TrendingUp, BarChart3, AlertTriangle, Activity,
  UserCheck, Radio, Shield, Disc3, Clock, UserCog, Rocket,
  CheckCircle2, Package, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { parseISO, differenceInDays, isAfter } from "date-fns";
import { useMetrics } from "@/shared/hooks/useMetrics";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useContratos, type ContratoWithRelations } from "@/modules/contracts/hooks/useContratos";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { formatCurrency } from "@/shared/lib/format-utils";
import { DashboardSkeleton } from "@/shared/components/PageSkeletons";
import { FinanceChart } from "@/shared/components/FinanceChart";
import { ArtistaVisao360Modal } from "@/modules/artist/components/ArtistaVisao360Modal";
import { useWsEvent } from "@/shared/hooks/useWsEvent";
import { cn } from "@/shared/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  timestamp: Date;
}

const MAX_ITEMS = 30;

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return date.toLocaleDateString("pt-BR");
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning" | "destructive";
}

const accentIcon: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary:     "bg-primary/10 border-primary/20 text-primary",
  success:     "bg-success/10 border-success/20 text-success",
  warning:     "bg-warning/10 border-warning/20 text-warning",
  destructive: "bg-destructive/10 border-destructive/20 text-destructive",
};

function StatCard({ label, value, sub, icon: Icon, accent = "primary" }: StatCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none">
              {label}
            </p>
            <p className="text-2xl font-mono font-semibold tabular-nums tracking-tight mt-2.5 text-foreground leading-none">
              {value}
            </p>
          </div>
          <div className={cn("rounded-lg p-2.5 border shrink-0 mt-0.5", accentIcon[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {sub && (
          <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title, description, action
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <Link to={action.href}>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5">
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [visao360Modal, setVisao360Modal] = useState<{ open: boolean; artista?: any }>({ open: false });
  const { dashboardMetrics, artistasMetrics, isLoading } = useMetrics();
  const { eventos } = useEventos();
  const { contratos } = useContratos();
  const { lancamentos } = useLancamentos();
  const { artistas } = useArtistas();

  // ── Activity state ──────────────────────────────────────────────────────────
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [tick, setTick] = useState(0);

  const push = useCallback((item: Omit<ActivityItem, "id" | "timestamp">) => {
    setActivities((prev) =>
      [{ id: crypto.randomUUID(), timestamp: new Date(), ...item }, ...prev].slice(0, MAX_ITEMS),
    );
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // WS subscriptions
  useWsEvent("artist.created", (d) =>
    push({ icon: <Users className="h-3.5 w-3.5" />, label: "Artista cadastrado", description: d.id, badge: "Artista", badgeVariant: "default" }),
  );
  useWsEvent("artist.updated", (d) =>
    push({ icon: <Users className="h-3.5 w-3.5" />, label: "Artista atualizado", description: d.id, badge: "Artista", badgeVariant: "secondary" }),
  );
  useWsEvent("artist.deleted", (d) =>
    push({ icon: <Users className="h-3.5 w-3.5" />, label: "Artista removido", description: d.id, badge: "Artista", badgeVariant: "outline" }),
  );
  useWsEvent("catalog.music.registered", (d) =>
    push({ icon: <Music className="h-3.5 w-3.5" />, label: "Música registrada", description: (d as { titulo?: string }).titulo ?? d.id, badge: "Catálogo", badgeVariant: "default" }),
  );
  useWsEvent("catalog.phonogram.registered", (d) =>
    push({ icon: <Music className="h-3.5 w-3.5" />, label: "Fonograma registrado", description: d.id, badge: "Catálogo", badgeVariant: "secondary" }),
  );
  useWsEvent("contract.created", () =>
    push({ icon: <FileText className="h-3.5 w-3.5" />, label: "Contrato criado", description: "Novo contrato adicionado", badge: "Contrato", badgeVariant: "default" }),
  );
  useWsEvent("contract.updated", () =>
    push({ icon: <FileText className="h-3.5 w-3.5" />, label: "Contrato atualizado", description: "Alterações salvas", badge: "Contrato", badgeVariant: "secondary" }),
  );
  useWsEvent("contract.signed", () =>
    push({ icon: <FileText className="h-3.5 w-3.5" />, label: "Contrato assinado", description: "Assinatura registrada", badge: "Contrato", badgeVariant: "default" }),
  );
  useWsEvent("crm.lead.captured", (d) =>
    push({ icon: <UserCheck className="h-3.5 w-3.5" />, label: "Lead capturado", description: (d as { nome?: string }).nome ?? d.id, badge: "CRM", badgeVariant: "default" }),
  );
  useWsEvent("crm.lead.converted", () =>
    push({ icon: <UserCheck className="h-3.5 w-3.5" />, label: "Lead convertido", description: "Lead virou artista/cliente", badge: "CRM", badgeVariant: "default" }),
  );
  useWsEvent("finance.transaction.created", (d) =>
    push({ icon: <DollarSign className="h-3.5 w-3.5" />, label: "Transação registrada", description: `${(d as { tipo?: string }).tipo ?? "transação"}`, badge: "Accounting", badgeVariant: "default" }),
  );
  useWsEvent("finance.transaction.updated", () =>
    push({ icon: <DollarSign className="h-3.5 w-3.5" />, label: "Transação atualizada", description: "Alterações salvas", badge: "Accounting", badgeVariant: "secondary" }),
  );
  useWsEvent("finance.calculated", () =>
    push({ icon: <DollarSign className="h-3.5 w-3.5" />, label: "Apuração concluída", description: "Accounting recalculado", badge: "Accounting", badgeVariant: "default" }),
  );
  useWsEvent("audit.entry.created", (d) =>
    push({ icon: <Shield className="h-3.5 w-3.5" />, label: `Auditoria: ${d.action}`, description: d.entity, badge: "Sistema", badgeVariant: "outline" }),
  );

  // Mock mode: window CustomEvents
  const pushRef = useRef(push);
  pushRef.current = push;

  useEffect(() => {
    const handlers: { event: string; fn: EventListener }[] = [
      {
        event: "musicos360:ARTIST_CREATED",
        fn: (e) => {
          const d = (e as CustomEvent).detail as { nome_artistico?: string };
          pushRef.current({ icon: <Users className="h-3.5 w-3.5" />, label: "Artista cadastrado", description: d.nome_artistico ?? "–", badge: "Artista", badgeVariant: "default" });
        },
      },
      {
        event: "musicos360:ARTIST_UPDATED",
        fn: () => pushRef.current({ icon: <Users className="h-3.5 w-3.5" />, label: "Artista atualizado", description: "Dados alterados", badge: "Artista", badgeVariant: "secondary" }),
      },
      {
        event: "musicos360:ARTIST_DELETED",
        fn: () => pushRef.current({ icon: <Users className="h-3.5 w-3.5" />, label: "Artista removido", description: "–", badge: "Artista", badgeVariant: "outline" }),
      },
      {
        event: "musicos360:MUSIC_REGISTERED",
        fn: (e) => {
          const d = (e as CustomEvent).detail as { titulo?: string };
          pushRef.current({ icon: <Music className="h-3.5 w-3.5" />, label: "Música registrada", description: d.titulo ?? "–", badge: "Catálogo", badgeVariant: "default" });
        },
      },
      {
        event: "musicos360:CONTRACT_CREATED",
        fn: () => pushRef.current({ icon: <FileText className="h-3.5 w-3.5" />, label: "Contrato criado", description: "Novo contrato adicionado", badge: "Contrato", badgeVariant: "default" }),
      },
      {
        event: "musicos360:CONTRACT_UPDATED",
        fn: () => pushRef.current({ icon: <FileText className="h-3.5 w-3.5" />, label: "Contrato atualizado", description: "Alterações salvas", badge: "Contrato", badgeVariant: "secondary" }),
      },
      {
        event: "musicos360:CONTRACT_SIGNED",
        fn: () => pushRef.current({ icon: <FileText className="h-3.5 w-3.5" />, label: "Contrato assinado", description: "Assinatura registrada", badge: "Contrato", badgeVariant: "default" }),
      },
      {
        event: "musicos360:LEAD_CAPTURED",
        fn: (e) => {
          const d = (e as CustomEvent).detail as { nome?: string };
          pushRef.current({ icon: <UserCheck className="h-3.5 w-3.5" />, label: "Lead capturado", description: d.nome ?? "–", badge: "CRM", badgeVariant: "default" });
        },
      },
      {
        event: "musicos360:LEAD_CONVERTED",
        fn: () => pushRef.current({ icon: <UserCheck className="h-3.5 w-3.5" />, label: "Lead convertido", description: "Lead virou artista/cliente", badge: "CRM", badgeVariant: "default" }),
      },
      {
        event: "musicos360:TRANSACTION_CREATED",
        fn: (e) => {
          const d = (e as CustomEvent).detail as { tipo?: string; descricao?: string };
          pushRef.current({ icon: <DollarSign className="h-3.5 w-3.5" />, label: "Transação registrada", description: d.descricao ?? d.tipo ?? "transação", badge: "Accounting", badgeVariant: "default" });
        },
      },
      {
        event: "musicos360:TRANSACTION_UPDATED",
        fn: () => pushRef.current({ icon: <DollarSign className="h-3.5 w-3.5" />, label: "Transação atualizada", description: "Alterações salvas", badge: "Accounting", badgeVariant: "secondary" }),
      },
      {
        event: "musicos360:FINANCE_CALCULATED",
        fn: () => pushRef.current({ icon: <Radio className="h-3.5 w-3.5" />, label: "Apuração concluída", description: "Accounting recalculado", badge: "Accounting", badgeVariant: "default" }),
      },
    ];

    handlers.forEach(({ event, fn }) => window.addEventListener(event, fn));
    return () => handlers.forEach(({ event, fn }) => window.removeEventListener(event, fn));
  }, []);

  void tick;

  // ── Derived data ────────────────────────────────────────────────────────────

  const contratosPorArtista = (() => {
    const map = new Map<string, ContratoWithRelations[]>();
    for (const c of contratos) {
      if (!c.artista_id) continue;
      const arr = map.get(c.artista_id) ?? [];
      arr.push(c);
      map.set(c.artista_id, arr);
    }
    return map;
  })();

  const { totalArtistas, contratosAtivos, contratosVencendo, receitaMensal, eventosMes, artistasDestaque } =
    dashboardMetrics;

  const today = new Date().toISOString().split("T")[0];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const eventosHoje = eventos.filter((e) => e.data_inicio === today);

  const artistasComEventos = artistasDestaque.map((a) => ({
    id: a.id,
    nome: a.nome_artistico,
    genero: a.genero_musical || "Outro",
    shows: a.shows,
    receita: a.receita,
  }));

  if (isLoading) return <DashboardSkeleton />;

  return (
    <MainLayout title="Dashboard" description="Visão geral do seu negócio musical">
      <div className="space-y-8">

        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Artistas Cadastrados"
            value={totalArtistas}
            icon={Users}
            accent="primary"
            sub={
              <span>
                <span className="font-mono font-semibold text-success">{artistasMetrics.comContrato}</span>
                {" "}com contrato ativo
              </span>
            }
          />
          <StatCard
            label="Contratos Vigentes"
            value={contratosAtivos}
            icon={FileText}
            accent={contratosVencendo > 0 ? "warning" : "success"}
            sub={
              contratosVencendo > 0 ? (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  <span className="font-mono font-semibold text-warning">{contratosVencendo}</span>
                  {" "}vencendo em breve
                </span>
              ) : (
                <span className="text-success font-medium">Todos em dia</span>
              )
            }
          />
          <StatCard
            label="Receita Total"
            value={formatCurrency(receitaMensal)}
            icon={DollarSign}
            accent="success"
            sub={<span>receita atual consolidada</span>}
          />
          <StatCard
            label="Eventos do Mês"
            value={eventosMes}
            icon={Calendar}
            accent="primary"
            sub={<span>{eventosMes === 1 ? "evento" : "eventos"} no mês atual</span>}
          />
        </div>

        {/* ── Main Grid: Atividades Recentes + Agenda ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* Atividades Recentes — all system events */}
          <Card data-testid="card-activity-feed">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-primary/10 border border-primary/20 p-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Atividades Recentes</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Todas as ações realizadas no sistema
                    </CardDescription>
                  </div>
                </div>
                {activities.length > 0 && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {activities.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              <ScrollArea className="h-[320px] px-6 pb-4">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[280px] text-center">
                    <div className="rounded-xl bg-muted/60 border border-border p-4 mb-3">
                      <TrendingUp className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade ainda</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Ações como criar artistas, registrar músicas ou transações aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {activities.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 py-3 first:pt-0 last:pb-0 transition-colors",
                          idx === 0 && "animate-in slide-in-from-top-1 duration-300",
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
                              <Badge variant={item.badgeVariant ?? "secondary"} className="text-xs px-1.5 py-0">
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

          {/* Agenda de Hoje */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 border border-primary/20 p-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Agenda de Hoje</CardTitle>
                  <CardDescription className="text-xs mt-0">
                    {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              {eventosHoje.length > 0 ? (
                <div className="flex-1 divide-y divide-border/60">
                  {eventosHoje.map((evento) => (
                    <div key={evento.id} className="flex items-start gap-3 py-3 first:pt-0">
                      <div className="w-14 shrink-0 text-center">
                        <span className="text-xs font-mono font-semibold text-primary">
                          {evento.horario_inicio || "–"}
                        </span>
                      </div>
                      <div className="w-px self-stretch bg-primary/20" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{evento.titulo}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1.5 border-border text-muted-foreground">
                          {evento.tipo_evento}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-xl bg-muted/60 border border-border p-4 mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Sem eventos hoje</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Dia livre na agenda</p>
                </div>
              )}
              <Link to="/agenda" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                  Ver Agenda Completa
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ── Finance Chart ── */}
        <FinanceChart />

        {/* ── Artistas em Destaque ── */}
        <div>
          <SectionHeader
            title="Artistas em Destaque"
            description="Artistas com maior relevância no período"
            action={{ label: "Ver todos", href: "/artistas" }}
          />
          {artistasComEventos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {artistasComEventos.map((artista, index) => (
                <Card
                  key={artista.id}
                  className="group hover:shadow-md transition-shadow duration-200"
                  data-testid={`card-artista-destaque-${artista.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight truncate">{artista.nome}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{artista.genero}</p>
                      </div>
                      <span className={cn(
                        "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ml-2 shrink-0",
                        index === 0
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}>
                        #{index + 1}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BarChart3 className="h-3 w-3" />
                          Shows
                        </span>
                        <span className="text-xs font-mono font-semibold">{artista.shows}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          Receita
                        </span>
                        <span className="text-xs font-mono font-semibold">{formatCurrency(artista.receita)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Music className="h-3 w-3" />
                          Contratos
                        </span>
                        <span className="text-xs font-mono font-semibold">
                          {contratosPorArtista.get(artista.id)?.length ?? 0}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3 h-7 text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border"
                      onClick={() =>
                        setVisao360Modal({
                          open: true,
                          artista: artistasDestaque.find((a) => a.id === artista.id),
                        })
                      }
                      data-testid={`button-ver-perfil-${artista.id}`}
                    >
                      Ver perfil 360°
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-xl bg-muted/60 border border-border p-4 mb-4">
                  <Users className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Nenhum artista cadastrado</p>
                <p className="text-xs text-muted-foreground mb-4">Comece cadastrando seus artistas para ver os destaques aqui.</p>
                <Link to="/artistas">
                  <Button size="sm" className="h-8 text-xs">
                    Cadastrar Artista
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
      <ArtistaVisao360Modal
        open={visao360Modal.open}
        onOpenChange={(open) => setVisao360Modal({ ...visao360Modal, open })}
        artista={visao360Modal.artista}
      />
    </MainLayout>
  );
}
