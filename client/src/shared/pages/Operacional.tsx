import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { differenceInDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Users, FileText, DollarSign, Radio, ArrowRight,
  AlertTriangle, Clock, CheckCircle2, Music2, UserPlus,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import type { LancamentoWithRelations } from "@/modules/releases/types";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import type { ContratoWithRelations } from "@/modules/contracts/hooks/useContratos";
import { useObras } from "@/modules/catalog/hooks/useObras";
import type { ObraWithRelations } from "@/modules/catalog/hooks/useObras";
import { useMetrics } from "@/shared/hooks/useMetrics";
import { useTransacoes } from "@/modules/financeiro/hooks/useTransacoes";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatDate, formatCurrency } from "@/shared/lib/format-utils";
import { ArtistaFormModal } from "@/modules/artist/components/ArtistaFormModal";
import { LancamentoViewModal } from "@/modules/releases/components/LancamentoViewModal";
import { ContratoViewModal } from "@/modules/contracts/components/ContratoViewModal";
import { cn } from "@/shared/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ASSET_KEYS: Array<keyof NonNullable<LancamentoWithRelations["assets"]>> = [
  "audio_master_url", "capa_url", "video_clipe_url", "letra", "ficha_tecnica", "press_release",
];

function countAssets(l: LancamentoWithRelations): { filled: number; total: number } {
  const a = l.assets;
  if (!a) return { filled: 0, total: ASSET_KEYS.length };
  const filled = ASSET_KEYS.filter(k => !!a[k]).length;
  return { filled, total: ASSET_KEYS.length };
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return null;
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning" | "destructive";
  href?: string;
}

const accentMap = {
  primary:     { icon: "bg-primary/10 border-primary/20 text-primary",     border: "border-t-primary" },
  success:     { icon: "bg-success/10 border-success/20 text-success",     border: "border-t-success" },
  warning:     { icon: "bg-warning/10 border-warning/20 text-warning",     border: "border-t-warning" },
  destructive: { icon: "bg-destructive/10 border-destructive/20 text-destructive", border: "border-t-destructive" },
};

function KpiCard({ title, value, description, icon: Icon, accent = "primary", href }: KpiCardProps) {
  const colors = accentMap[accent];
  const inner = (
    <Card className={cn("relative overflow-hidden border-t-2 hover:shadow-md transition-shadow duration-200", colors.border)}
      data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none">{title}</p>
            <p className="text-3xl font-mono font-semibold tabular-nums tracking-tight mt-2.5 text-foreground leading-none">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
          </div>
          <div className={cn("rounded-lg p-2.5 border shrink-0 mt-0.5", colors.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link to={href} className="block">{inner}</Link>;
  return inner;
}

// ─── Widget Header ────────────────────────────────────────────────────────────

function WidgetHeader({ title, count, href, icon: Icon }: {
  title: string;
  count: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <CardHeader className="pb-3 pt-4 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">{count}</Badge>
        </div>
        <Link to={href}>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1" data-testid={`btn-ver-todos-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </CardHeader>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60">
      <Icon className="h-8 w-8 mb-2" />
      <p className="text-xs">{text}</p>
    </div>
  );
}

// ─── Alert Pill ───────────────────────────────────────────────────────────────

function AlertPill({ variant, label }: { variant: "red" | "amber"; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
      variant === "red"
        ? "bg-destructive/10 text-destructive border border-destructive/20"
        : "bg-warning/10 text-warning border border-warning/20",
    )}>
      <AlertTriangle className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ─── Widget: Pipeline de Lançamentos ─────────────────────────────────────────

function PipelineLancamentos({
  lancamentos,
  onOpen,
}: {
  lancamentos: LancamentoWithRelations[];
  onOpen: (l: LancamentoWithRelations) => void;
}) {
  const hoje = new Date();
  const upcoming = useMemo(() => {
    return lancamentos
      .filter(l => {
        const status = l.status ?? "";
        return status !== "publicado" && status !== "lançado" && status !== "cancelado";
      })
      .sort((a, b) => {
        const da = a.data_lancamento ? parseISO(a.data_lancamento).getTime() : Infinity;
        const db = b.data_lancamento ? parseISO(b.data_lancamento).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 5);
  }, [lancamentos]);

  return (
    <Card data-testid="widget-pipeline-lancamentos">
      <WidgetHeader title="Pipeline de Lançamentos" count={upcoming.length} href="/lancamentos" icon={Radio} />
      <CardContent className="px-4 pb-4 space-y-2">
        {upcoming.length === 0 ? (
          <EmptyState icon={Radio} text="Nenhum lançamento em pipeline" />
        ) : (
          upcoming.map(l => {
            const { filled, total } = countAssets(l);
            const pct = Math.round((filled / total) * 100);
            const days = daysUntil(l.data_lancamento);
            const isUrgent = days !== null && days < 14 && filled < total;
            const isVeryUrgent = days !== null && days < 7 && filled < total;
            const artista = l.artistas?.nome_artistico ?? "—";
            return (
              <button
                key={l.id}
                onClick={() => onOpen(l)}
                data-testid={`lancamento-row-${l.id}`}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/50 cursor-pointer",
                  isVeryUrgent ? "border-destructive/40 bg-destructive/5" : isUrgent ? "border-warning/40 bg-warning/5" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{l.titulo}</p>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{artista}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {l.data_lancamento && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {days !== null ? (
                            days < 0 ? "Atrasado" : days === 0 ? "Hoje!" : `${days}d`
                          ) : formatDate(l.data_lancamento)}
                        </span>
                      )}
                      {isVeryUrgent && <AlertPill variant="red" label="Urgente" />}
                      {isUrgent && !isVeryUrgent && <AlertPill variant="amber" label="Assets incompletos" />}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">{filled}/{total} assets</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Widget: Contratos Críticos ───────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(["assinado", "ativo", "vigente", "aguardando_assinatura"]);

function ContratosCriticos({
  contratos,
  onOpen,
}: {
  contratos: ContratoWithRelations[];
  onOpen: (c: ContratoWithRelations) => void;
}) {
  const criticos = useMemo(() => {
    return contratos.filter(c => {
      if (c.status === "aguardando_assinatura") return true;
      if (!ACTIVE_STATUSES.has(c.status ?? "")) return false;
      const days = daysUntil(c.data_fim);
      // Include vencidos (days < 0) AND expiring within 30 days
      return days !== null && days <= 30;
    }).sort((a, b) => {
      if (a.status === "aguardando_assinatura" && b.status !== "aguardando_assinatura") return 1;
      if (b.status === "aguardando_assinatura" && a.status !== "aguardando_assinatura") return -1;
      const da = a.data_fim ? parseISO(a.data_fim).getTime() : Infinity;
      const db = b.data_fim ? parseISO(b.data_fim).getTime() : Infinity;
      return da - db;
    });
  }, [contratos]);

  return (
    <Card data-testid="widget-contratos-criticos">
      <WidgetHeader title="Contratos Críticos" count={criticos.length} href="/contratos" icon={FileText} />
      <CardContent className="px-4 pb-4 space-y-2">
        {criticos.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Nenhum contrato crítico" />
        ) : (
          criticos.map(c => {
            const days = daysUntil(c.data_fim);
            const isAguardando = c.status === "aguardando_assinatura";
            const isVencido = days !== null && days < 0;
            const isExpiring7 = days !== null && days <= 7 && days >= 0;
            const artista = c.artistas?.nome_artistico ?? c.clientes?.nome ?? "—";
            return (
            <button
                key={c.id}
                onClick={() => onOpen(c)}
                data-testid={`contrato-row-${c.id}`}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/50 cursor-pointer",
                  isVencido || isExpiring7
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-warning/40 bg-warning/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{c.titulo}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{artista}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {isAguardando && <AlertPill variant="amber" label="Aguardando assinatura" />}
                      {!isAguardando && isVencido && <AlertPill variant="red" label={`Vencido há ${Math.abs(days!)}d`} />}
                      {!isAguardando && !isVencido && isExpiring7 && <AlertPill variant="red" label={`${days}d p/ vencer`} />}
                      {!isAguardando && !isVencido && !isExpiring7 && days !== null && (
                        <AlertPill variant="amber" label={`${days}d p/ vencer`} />
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {c.data_fim && (
                      <p className="text-[10px] text-muted-foreground">{formatDate(c.data_fim)}</p>
                    )}
                    {c.valor && (
                      <p className="text-xs font-mono font-medium text-foreground mt-0.5">{formatCurrency(c.valor)}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Widget: Onboarding Pendente ──────────────────────────────────────────────

function OnboardingPendente({
  artistas,
  onRevisar,
}: {
  artistas: Artista[];
  onRevisar: (a: Artista) => void;
}) {
  const onboarding = useMemo(() => {
    return artistas.filter(a => a.status === "onboarding" || a.status_cadastro === "onboarding");
  }, [artistas]);

  return (
    <Card data-testid="widget-onboarding-pendente">
      <WidgetHeader title="Onboarding Pendente" count={onboarding.length} href="/artistas" icon={UserPlus} />
      <CardContent className="px-4 pb-4 space-y-2">
        {onboarding.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Nenhum artista em onboarding" />
        ) : (
          onboarding.map(a => {
            const diasOnboarding = a.created_at ? daysUntil(a.created_at) : null;
            const semAcao7 = diasOnboarding !== null && Math.abs(diasOnboarding) > 7;
            return (
              <div
                key={a.id}
                data-testid={`onboarding-row-${a.id}`}
                className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-lg border",
                  semAcao7 ? "border-warning/40 bg-warning/5" : "border-border",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{a.nome_artistico}</p>
                    {semAcao7 && <AlertPill variant="amber" label="+7d sem ação" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {a.genero_musical && <span>{a.genero_musical}</span>}
                    {a.created_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(a.created_at)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => onRevisar(a)}
                  data-testid={`btn-revisar-${a.id}`}
                >
                  Revisar
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Widget: Catálogo Pendente ────────────────────────────────────────────────

function CatalogoPendente({ obras }: { obras: ObraWithRelations[] }) {
  const pendentes = useMemo(() => {
    return obras.filter(o => o.status === "pendente" || o.status === "analise").slice(0, 8);
  }, [obras]);

  return (
    <Card data-testid="widget-catalogo-pendente">
      <WidgetHeader title="Catálogo — Obras Pendentes" count={pendentes.length} href="/registro-musicas" icon={Music2} />
      <CardContent className="px-4 pb-4 space-y-2">
        {pendentes.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Nenhuma obra pendente" />
        ) : (
          pendentes.map(o => {
            const artista = o.artistas?.nome_artistico ?? o.compositor ?? "—";
            return (
              <div
                key={o.id}
                data-testid={`obra-row-${o.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{o.titulo}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{artista}</span>
                    {o.created_at && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDate(o.created_at)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {o.tipo && (
                    <Badge variant="outline" className="text-[10px] capitalize">{o.tipo}</Badge>
                  )}
                  <StatusBadge status={o.status} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function OperacionalSkeleton() {
  return (
    <MainLayout title="Dashboard Operacional" description="Visão operacional da gravadora">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    </MainLayout>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Operacional() {
  const { artistas, isLoading: loadingArtistas } = useArtistas();
  const { lancamentos, isLoading: loadingLancamentos } = useLancamentos();
  const { contratos, isLoading: loadingContratos } = useContratos();
  const { obras, isLoading: loadingObras } = useObras();
  const { financeiroMetrics, isLoading: loadingMetrics } = useMetrics();
  const { transacoes, isLoading: loadingTransacoes } = useTransacoes();

  const isLoading = loadingArtistas || loadingLancamentos || loadingContratos || loadingObras || loadingMetrics || loadingTransacoes;

  const [lancamentoModal, setLancamentoModal] = useState<{ open: boolean; lancamento?: LancamentoWithRelations }>({ open: false });
  const [contratoModal, setContratoModal] = useState<{ open: boolean; contrato?: ContratoWithRelations }>({ open: false });
  const [artistaModal, setArtistaModal] = useState<{ open: boolean; artista?: Artista }>({ open: false });

  // ── KPIs ──
  const artistasAtivos = useMemo(
    () => artistas.filter(a => a.status === "ativo" || a.status === "contratado").length,
    [artistas],
  );

  const lancamentosEsteMes = useMemo(() => {
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());
    return lancamentos.filter(l => {
      if (!l.data_lancamento) return false;
      try {
        const d = parseISO(l.data_lancamento);
        return d >= inicio && d <= fim;
      } catch {
        return false;
      }
    }).length;
  }, [lancamentos]);

  const contratosAtivos = useMemo(
    () => contratos.filter(c => ACTIVE_STATUSES.has(c.status ?? "")).length,
    [contratos],
  );

  const receitaDoMes = useMemo(() => {
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());
    return transacoes
      .filter(t => {
        if (t.tipo !== "receita" || t.status !== "pago") return false;
        if (!t.data) return false;
        try {
          const d = parseISO(t.data);
          return d >= inicio && d <= fim;
        } catch {
          return false;
        }
      })
      .reduce((acc, t) => acc + t.valor, 0);
  }, [transacoes]);

  const margemDoMes = useMemo(() => {
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());
    const despesas = transacoes
      .filter(t => {
        if (t.tipo !== "despesa" || t.status !== "pago") return false;
        if (!t.data) return false;
        try {
          const d = parseISO(t.data);
          return d >= inicio && d <= fim;
        } catch {
          return false;
        }
      })
      .reduce((acc, t) => acc + t.valor, 0);
    return receitaDoMes > 0 ? Math.round(((receitaDoMes - despesas) / receitaDoMes) * 100) : 0;
  }, [transacoes, receitaDoMes]);

  if (isLoading) return <OperacionalSkeleton />;

  return (
    <MainLayout
      title="Dashboard Operacional"
      description="Visão do dia a dia da gravadora"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => window.location.reload()} data-testid="btn-atualizar">
          <RefreshCw className="h-3 w-3" />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="kpi-grid">
          <KpiCard
            title="Artistas Ativos"
            value={artistasAtivos}
            description={`${artistas.length} cadastrados total`}
            icon={Users}
            accent="primary"
            href="/artistas"
          />
          <KpiCard
            title="Lançamentos este Mês"
            value={lancamentosEsteMes}
            description={`${lancamentos.length} lançamentos total`}
            icon={Radio}
            accent="success"
            href="/lancamentos"
          />
          <KpiCard
            title="Contratos Ativos"
            value={contratosAtivos}
            description={`${contratos.length} contratos total`}
            icon={FileText}
            accent="warning"
            href="/contratos"
          />
          <KpiCard
            title="Receita do Mês"
            value={formatCurrency(receitaDoMes)}
            description={`Margem ${margemDoMes}%`}
            icon={DollarSign}
            accent="success"
            href="/financeiro"
          />
        </div>

        {/* ── Widgets Grid ── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Row 1 */}
          <PipelineLancamentos
            lancamentos={lancamentos}
            onOpen={(l) => setLancamentoModal({ open: true, lancamento: l })}
          />
          <ContratosCriticos
            contratos={contratos}
            onOpen={(c) => setContratoModal({ open: true, contrato: c })}
          />

          {/* Row 2 */}
          <OnboardingPendente
            artistas={artistas}
            onRevisar={(a) => setArtistaModal({ open: true, artista: a })}
          />
          <CatalogoPendente obras={obras} />

        </div>

        {/* ── Alerts global summary ── */}
        {(() => {
          const urgentLancamentos = lancamentos.filter(l => {
            const days = daysUntil(l.data_lancamento);
            const { filled, total } = countAssets(l);
            return days !== null && days < 14 && filled < total && l.status !== "publicado";
          }).length;

          const vencidos = contratos.filter(c => {
            if (!ACTIVE_STATUSES.has(c.status ?? "")) return false;
            const days = daysUntil(c.data_fim);
            return days !== null && days < 0;
          }).length;

          if (urgentLancamentos === 0 && vencidos === 0) return null;
          return (
            <Card className="border-destructive/30 bg-destructive/5" data-testid="alert-summary">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-destructive">Atenção necessária</p>
                  {urgentLancamentos > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {urgentLancamentos} lançamento{urgentLancamentos > 1 ? "s" : ""} com assets incompletos e menos de 14 dias para lançar.
                    </p>
                  )}
                  {vencidos > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {vencidos} contrato{vencidos > 1 ? "s" : ""} vencido{vencidos > 1 ? "s" : ""} sem rescisão formal.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

      </div>

      {/* ── Modals ── */}
      <LancamentoViewModal
        open={lancamentoModal.open}
        onOpenChange={(open) => setLancamentoModal(s => ({ ...s, open }))}
        lancamento={lancamentoModal.lancamento}
      />
      <ContratoViewModal
        open={contratoModal.open}
        onOpenChange={(open) => setContratoModal(s => ({ ...s, open }))}
        contrato={contratoModal.contrato}
      />
      <ArtistaFormModal
        open={artistaModal.open}
        onOpenChange={(open) => setArtistaModal(s => ({ ...s, open }))}
        artista={artistaModal.artista ?? null}
      />
    </MainLayout>
  );
}
