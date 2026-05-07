import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Users, DollarSign, TrendingUp, Percent, Target, FileEdit,
  CheckSquare, Sparkles, AlertTriangle, ChevronRight, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCampanhas } from "@/modules/marketing/hooks/useCampanhas";
import { useBriefings } from "@/modules/marketing/hooks/useBriefings";
import { useTarefasMarketing } from "@/modules/marketing/hooks/useTarefasMarketing";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { MetricCard } from "@/shared/components/MetricCard";

export default function MarketingVisaoGeral() {
  const { campanhas, isLoading: loadingCampanhas } = useCampanhas();
  const { briefings, isLoading: loadingBriefings } = useBriefings();
  const { tarefas, isLoading: loadingTarefas } = useTarefasMarketing();
  const { clientes, isLoading: loadingClientes } = useClientes();

  const isLoading = loadingCampanhas || loadingBriefings || loadingTarefas || loadingClientes;

  const leads = clientes.filter((c: any) => c.status === "lead").length;
  const campanhasAtivas = campanhas.filter((c: any) => c.status === "ativa").length;
  const tarefasPendentes = tarefas.filter((t: any) => t.status === "pendente").length;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const channels = [
    { name: "Instagram", followers: "0 seguidores", growth: "+0,0%" },
    { name: "YouTube",   followers: "0 seguidores", growth: "+0,0%" },
    { name: "TikTok",    followers: "0 seguidores", growth: "+0,0%" },
    { name: "Spotify",   followers: "0 ouvintes",   growth: "+0,0%" },
  ];

  const funnelStages = [
    { stage: "Awareness",     value: "0 impressões", pct: "100%" },
    { stage: "Interesse",     value: "0 cliques",    pct: "75%"  },
    { stage: "Consideração",  value: "0 alcance",    pct: "50%"  },
    { stage: "Conversão",     value: `${leads} leads`, pct: "25%" },
  ];

  const quickLinks = [
    { href: "/marketing/campanhas", icon: Target,      label: "Criar Campanha" },
    { href: "/marketing/briefing",  icon: FileEdit,    label: "Novo Briefing"  },
    { href: "/marketing/tarefas",   icon: CheckSquare, label: "Nova Tarefa"    },
    { href: "/marketing/ia-criativa", icon: Sparkles,  label: "IA Criativa"    },
  ];

  return (
    <MainLayout title="Visão Geral" description="Cockpit estratégico de marketing">
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Leads"
            value={leads}
            description="+12% vs mês anterior"
            icon={Users}
            accent="primary"
          />
          <MetricCard
            title="CPL"
            value="R$ 0,00"
            description="custo por lead"
            icon={DollarSign}
            accent="success"
          />
          <MetricCard
            title="ROI"
            value="0,0x"
            description="+15% retorno"
            icon={TrendingUp}
            accent="success"
          />
          <MetricCard
            title="Conversão"
            value="0,0%"
            description="taxa média"
            icon={Percent}
            accent="primary"
          />
        </div>

        {/* ── Main Grid ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left — Performance + Funil + Campanhas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance por Canal */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Performance por Canal</CardTitle>
                <CardDescription className="text-xs mt-0.5">Engajamento e alcance por plataforma</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border/60">
                  {channels.map((ch) => (
                    <div key={ch.name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium">{ch.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground font-mono">{ch.followers}</span>
                        <span className="text-xs font-mono text-success">{ch.growth}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Funil de Marketing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Funil de Marketing</CardTitle>
                <CardDescription className="text-xs mt-0.5">Jornada do lead até conversão</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {funnelStages.map((s) => (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{s.stage}</span>
                      <span className="text-xs font-mono text-muted-foreground">{s.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: s.pct }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Campanhas Ativas */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Campanhas Ativas</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{campanhasAtivas} campanhas em execução</CardDescription>
                  </div>
                  <Link to="/marketing/campanhas">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                      Ver todas <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              {campanhasAtivas === 0 && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha ativa</p>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right — Alerts + Performance + Quick Actions */}
          <div className="space-y-6">
            {/* Alertas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {tarefasPendentes > 0 ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-semibold text-warning">{tarefasPendentes}</span>
                    <span className="text-muted-foreground">tarefas pendentes</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
                )}
              </CardContent>
            </Card>

            {/* Melhor Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Melhor Performance</CardTitle>
                <CardDescription className="text-xs mt-0.5">Campanhas com maior ROI</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">Sem dados de performance ainda</p>
              </CardContent>
            </Card>

            {/* Atalhos Rápidos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Atalhos Rápidos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {quickLinks.map(({ href, icon: Icon, label }) => (
                  <Link to={href} key={href}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 h-8 text-xs"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Atividades */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Atividades</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">{briefings.length}</span>
                  {" "}briefings cadastrados
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
