import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Users, FileText, DollarSign, Calendar, ArrowRight,
  Music, TrendingUp, BarChart3, AlertTriangle, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMetrics } from "@/shared/hooks/useMetrics";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useContratos, type ContratoWithRelations } from "@/modules/contracts/hooks/useContratos";
import { ContratoStatusBadge, getContratoSituacao } from "@/shared/components/ContratoStatusBadge";
import { formatCurrency } from "@/shared/lib/format-utils";
import { DashboardSkeleton } from "@/shared/components/PageSkeletons";
import { FinanceChart } from "@/shared/components/FinanceChart";
import { ActivityFeed } from "@/shared/components/ActivityFeed";
import { ArtistaVisao360Modal } from "@/modules/artist/components/ArtistaVisao360Modal";
import { cn } from "@/shared/lib/utils";

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
  const { transacoes } = useTransacoes();
  const { eventos } = useEventos();
  const { contratos } = useContratos();

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
          />
          <StatCard
            label="Eventos do Mês"
            value={eventosMes}
            icon={Calendar}
            accent="primary"
            sub={<span>{eventosMes === 1 ? "evento" : "eventos"} no mês atual</span>}
          />
        </div>

        {/* ── Main Grid: Atividades + Agenda ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* Transações Recentes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Atividades Recentes</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Últimas movimentações financeiras</CardDescription>
                </div>
                <Link to="/financeiro">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {transacoes.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {transacoes.slice(0, 6).map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border",
                        t.tipo === "receita"
                          ? "bg-success/10 border-success/20 text-success"
                          : "bg-destructive/10 border-destructive/20 text-destructive"
                      )}>
                        <DollarSign className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{t.descricao}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(t.data).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className={cn(
                        "text-sm font-mono font-medium shrink-0",
                        t.tipo === "receita" ? "text-success" : "text-destructive"
                      )}>
                        {t.tipo === "receita" ? "+" : "-"}{formatCurrency(t.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-xl bg-muted/60 border border-border p-4 mb-3">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">As movimentações aparecerão aqui</p>
                </div>
              )}
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

        {/* ── Activity Feed ── */}
        <ActivityFeed />

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
                    {/* Header row */}
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

                    {/* Stats */}
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

                    {/* CTA */}
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
