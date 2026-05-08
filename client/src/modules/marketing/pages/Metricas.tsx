import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Eye, Heart, Users, TrendingUp, Download, Link2, BarChart3,
  BarChart2, DollarSign, MousePointer, Play, ThumbsUp, MessageCircle, Share2, Zap,
} from "lucide-react";
import { SiYoutube, SiMeta, SiGoogleads, SiInstagram, SiTiktok } from "react-icons/si";
import { cn } from "@/shared/lib/utils";
import {
  YOUTUBE_MOCK, YOUTUBE_TOTALS,
  META_ADS_MOCK, GOOGLE_ADS_MOCK,
  INSTAGRAM_MOCK, INSTAGRAM_TOTALS,
  TIKTOK_MOCK, TIKTOK_TOTALS,
  fmtNum, type MonthlyPoint,
} from "@/modules/analytics/data/mockAnalytics";
import { formatCurrency } from "@/shared/lib/format-utils";

// ─── Shared helpers ────────────────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: MonthlyPoint[]; color: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={cn("w-full rounded-sm transition-all", color)}
            style={{ height: `${Math.max(4, (d.value / max) * 40)}px` }}
          />
          <span className="text-[9px] text-muted-foreground">{d.mes}</span>
        </div>
      ))}
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-xl font-bold text-foreground font-mono">{value}</p>
    </div>
  );
}

function SimulatedNotice() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0" />
      <span>
        Dados simulados para demonstração. Conecte as plataformas em{" "}
        <strong>Configurações → Integrações</strong> para ver métricas reais.
      </span>
    </div>
  );
}

// ─── Analytics Social ──────────────────────────────────────────────────────────
type PlatformId = "overview" | "youtube" | "tiktok" | "instagram" | "meta" | "google";

interface Platform {
  id: PlatformId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  brandStyle?: React.CSSProperties;
}

const PLATFORMS: Platform[] = [
  { id: "overview",  label: "Visão Geral", icon: BarChart2,   color: "text-primary",            bg: "bg-primary/10" },
  { id: "youtube",   label: "YouTube",     icon: SiYoutube,   color: "text-primary",            bg: "bg-primary/10",  brandStyle: { background: "linear-gradient(135deg, hsl(217 91% 52%) 0%, hsl(217 91% 40%) 100%)" } },
  { id: "tiktok",    label: "TikTok",      icon: SiTiktok,    color: "text-[hsl(271,91%,65%)]", bg: "bg-[hsl(271,91%,65%)]/10", brandStyle: { background: "linear-gradient(135deg, hsl(271 91% 55%) 0%, hsl(271 91% 40%) 100%)" } },
  { id: "instagram", label: "Instagram",   icon: SiInstagram, color: "text-warning",            bg: "bg-warning/10",  brandStyle: { background: "linear-gradient(135deg, hsl(38 92% 44%) 0%, hsl(25 95% 46%) 100%)" } },
  { id: "meta",      label: "Meta Ads",    icon: SiMeta,      color: "text-primary",            bg: "bg-primary/10",  brandStyle: { background: "linear-gradient(135deg, hsl(222 47% 28%) 0%, hsl(217 91% 35%) 100%)" } },
  { id: "google",    label: "Google Ads",  icon: SiGoogleads, color: "text-success",            bg: "bg-success/10",  brandStyle: { background: "linear-gradient(135deg, hsl(142 76% 30%) 0%, hsl(142 76% 22%) 100%)" } },
];

function AnalyticsSocialContent() {
  const [platform, setPlatform] = useState<PlatformId>("overview");
  const [ytSel, setYtSel] = useState(0);
  const [ttSel, setTtSel] = useState(0);
  const [igSel, setIgSel] = useState(0);

  return (
    <div className="space-y-5">
      {/* Platform selector */}
      <div className="flex gap-1 flex-wrap">
        {PLATFORMS.map(p => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                platform === p.id
                  ? `${p.bg} ${p.color} shadow-sm`
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              data-testid={`tab-platform-${p.id}`}
            >
              <Icon className="h-3.5 w-3.5" /> {p.label}
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {platform === "overview" && (
        <div className="space-y-4">
          <SimulatedNotice />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {[
              { p: PLATFORMS[1], metrics: [{ label: "Views/mês", value: fmtNum(YOUTUBE_TOTALS.totalViewsMes) }, { label: "Inscritos", value: fmtNum(YOUTUBE_TOTALS.totalSubscribers) }, { label: "Watch hrs", value: fmtNum(YOUTUBE_TOTALS.totalWatchHoursMes) }] },
              { p: PLATFORMS[2], metrics: [{ label: "Seguidores", value: fmtNum(TIKTOK_TOTALS.totalFollowers) }, { label: "Views/mês", value: fmtNum(TIKTOK_TOTALS.totalViewsMes) }, { label: "Eng.", value: `${TIKTOK_TOTALS.avgEngagement}%` }] },
              { p: PLATFORMS[3], metrics: [{ label: "Seguidores", value: fmtNum(INSTAGRAM_TOTALS.totalFollowers) }, { label: "Alcance/mês", value: fmtNum(INSTAGRAM_TOTALS.totalAlcanceMes) }, { label: "Eng.", value: `${INSTAGRAM_TOTALS.avgEngagement}%` }] },
              { p: PLATFORMS[4], metrics: [{ label: "Impressões", value: fmtNum(META_ADS_MOCK.mes.impressoes) }, { label: "Cliques", value: fmtNum(META_ADS_MOCK.mes.cliques) }, { label: "CTR", value: `${META_ADS_MOCK.mes.ctr}%` }] },
              { p: PLATFORMS[5], metrics: [{ label: "Impressões", value: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes) }, { label: "Cliques", value: fmtNum(GOOGLE_ADS_MOCK.mes.cliques) }, { label: "Conversões", value: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes) }] },
            ].map(({ p, metrics }) => {
              const Icon = p.icon;
              return (
                <Card key={p.id} className="border-border overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between gap-2" style={p.brandStyle ?? { background: "hsl(var(--primary)/0.15)" }}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-white drop-shadow-sm" />
                      <CardTitle className="text-sm font-semibold text-white drop-shadow-sm">{p.label}</CardTitle>
                    </div>
                    <Badge className="text-[9px] px-1.5 py-0 bg-black/20 text-white border-white/20 border">Simulado</Badge>
                  </div>
                  <CardContent className="px-4 pb-4 pt-3 grid grid-cols-3 gap-3">
                    {metrics.map(m => (
                      <div key={m.label}>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                        <p className="text-sm font-bold font-mono text-foreground">{m.value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* YouTube */}
      {platform === "youtube" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="flex gap-2 flex-wrap">
            {YOUTUBE_MOCK.map((a, i) => (
              <button key={a.artistaId} onClick={() => setYtSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", ytSel === i ? "bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Inscritos", v: fmtNum(YOUTUBE_MOCK[ytSel].subscribers), i: Users }, { l: "Views/Mês", v: fmtNum(YOUTUBE_MOCK[ytSel].viewsMes), i: Eye }, { l: "Watch Hrs", v: fmtNum(YOUTUBE_MOCK[ytSel].watchHoursMes), i: Play }, { l: "Vídeos", v: String(YOUTUBE_MOCK[ytSel].videosPublicados), i: Play }].map(k => (
              <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {YOUTUBE_MOCK[ytSel].topVideos.map((v, i) => {
                  const max = YOUTUBE_MOCK[ytSel].topVideos[0].views;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                          <span className="text-xs font-medium truncate max-w-[160px]">{v.titulo}</span>
                        </div>
                        <span className="text-xs font-mono text-[#FF0000] shrink-0">{fmtNum(v.views)}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden ml-6">
                        <div className="h-full bg-[#FF0000]/50 rounded-full" style={{ width: `${(v.views / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Views Mensais — 6 meses</CardTitle></CardHeader>
              <CardContent className="pt-0"><MiniBarChart data={YOUTUBE_MOCK[ytSel].evolution} color="bg-[#FF0000]/60" /></CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TikTok */}
      {platform === "tiktok" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="flex gap-2 flex-wrap">
            {TIKTOK_MOCK.map((a, i) => (
              <button key={a.artistaId} onClick={() => setTtSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", ttSel === i ? "bg-foreground/10 text-foreground border border-foreground/20" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Seguidores", v: fmtNum(TIKTOK_MOCK[ttSel].followers), i: Users }, { l: "Views/Mês", v: fmtNum(TIKTOK_MOCK[ttSel].viewsMes), i: Eye }, { l: "Vídeos/Mês", v: String(TIKTOK_MOCK[ttSel].videosMes), i: Play }, { l: "Engajamento", v: `${TIKTOK_MOCK[ttSel].engagementRate}%`, i: TrendingUp }].map(k => (
              <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-3">
                {TIKTOK_MOCK[ttSel].topVideos.map((v, i) => {
                  const max = TIKTOK_MOCK[ttSel].topVideos[0].views;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                          <span className="text-xs font-medium truncate">{v.descricao}</span>
                        </div>
                        <span className="text-xs font-mono text-foreground shrink-0">{fmtNum(v.views)}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden ml-6">
                        <div className="h-full bg-foreground/40 rounded-full" style={{ width: `${(v.views / max) * 100}%` }} />
                      </div>
                      <div className="flex gap-3 ml-6 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{fmtNum(v.curtidas)}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{fmtNum(v.comentarios)}</span>
                        <span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />{fmtNum(v.compartilhamentos)}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Views Mensais — 6 meses</CardTitle></CardHeader>
              <CardContent className="pt-0"><MiniBarChart data={TIKTOK_MOCK[ttSel].evolution} color="bg-foreground/50" /></CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Instagram */}
      {platform === "instagram" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="flex gap-2 flex-wrap">
            {INSTAGRAM_MOCK.map((a, i) => (
              <button key={a.artistaId} onClick={() => setIgSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", igSel === i ? "bg-[#E1306C]/15 text-[#E1306C] border border-[#E1306C]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Seguidores", v: fmtNum(INSTAGRAM_MOCK[igSel].followers), i: Users }, { l: "Alcance/Mês", v: fmtNum(INSTAGRAM_MOCK[igSel].alcanceMes), i: Eye }, { l: "Reels/Mês", v: String(INSTAGRAM_MOCK[igSel].reelsMes), i: Play }, { l: "Engajamento", v: `${INSTAGRAM_MOCK[igSel].engagementRate}%`, i: Heart }].map(k => (
              <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Crescimento de Seguidores — 6 meses</CardTitle></CardHeader>
            <CardContent className="pt-0"><MiniBarChart data={INSTAGRAM_MOCK[igSel].evolution} color="bg-[#E1306C]/60" /></CardContent>
          </Card>
        </div>
      )}

      {/* Meta Ads */}
      {platform === "meta" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Impressões", v: fmtNum(META_ADS_MOCK.mes.impressoes), i: Eye }, { l: "Alcance", v: fmtNum(META_ADS_MOCK.mes.alcance), i: Users }, { l: "Cliques", v: fmtNum(META_ADS_MOCK.mes.cliques), i: MousePointer }, { l: "Investimento", v: formatCurrency(META_ADS_MOCK.mes.spend), i: DollarSign }].map(k => (
              <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader>
            <CardContent className="pt-0"><MiniBarChart data={META_ADS_MOCK.evolution} color="bg-[#0082FB]/60" /></CardContent>
          </Card>
        </div>
      )}

      {/* Google Ads */}
      {platform === "google" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Impressões", v: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes), i: Eye }, { l: "Cliques", v: fmtNum(GOOGLE_ADS_MOCK.mes.cliques), i: MousePointer }, { l: "Conversões", v: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes), i: TrendingUp }, { l: "Investimento", v: formatCurrency(GOOGLE_ADS_MOCK.mes.spend), i: DollarSign }].map(k => (
              <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader>
            <CardContent className="pt-0"><MiniBarChart data={GOOGLE_ADS_MOCK.evolution} color="bg-success/60" /></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketingMetricas() {
  const headerActions = (
    <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" data-testid="button-exportar-relatorio">
      <Download className="mr-2 h-4 w-4" />
      Exportar Relatório
    </Button>
  );

  return (
    <MainLayout title="Métricas e Resultados" description="Análise detalhada do desempenho das campanhas e redes sociais" actions={headerActions}>
      <div className="space-y-6">
        <Tabs defaultValue="metricas">
          <TabsList>
            <TabsTrigger value="metricas" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="avancado" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Marketing Avançado
            </TabsTrigger>
            </TabsList>

          {/* ── Métricas ── */}
          <TabsContent value="metricas" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-t-2 border-t-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Alcance Total</span>
                    <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">—</p>
                  <p className="text-xs text-muted-foreground mt-1">impressões este mês</p>
                </CardContent>
              </Card>

              <Card className="border-t-2 border-t-success">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Engajamento</span>
                    <div className="w-7 h-7 rounded-md bg-success/10 border border-success/20 flex items-center justify-center">
                      <Heart className="h-3.5 w-3.5 text-success" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">—</p>
                  <p className="text-xs text-muted-foreground mt-1">taxa de interação</p>
                </CardContent>
              </Card>

              <Card className="border-t-2 border-t-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Seguidores</span>
                    <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">—</p>
                  <p className="text-xs text-muted-foreground mt-1">em todas as plataformas</p>
                </CardContent>
              </Card>

              <Card className="border-t-2 border-t-success">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">ROI Médio</span>
                    <div className="w-7 h-7 rounded-md bg-success/10 border border-success/20 flex items-center justify-center">
                      <TrendingUp className="h-3.5 w-3.5 text-success" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">0%</p>
                  <p className="text-xs text-muted-foreground mt-1">retorno sobre investimento</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Performance por Plataforma</CardTitle>
                  <CardDescription>Comparativo de desempenho entre as redes sociais</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Carregando métricas...
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultados das Campanhas</CardTitle>
                  <CardDescription>Performance detalhada das campanhas publicitárias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Nenhuma campanha encontrada
                  </div>
                </CardContent>
              </Card>
            </div>

            <AnalyticsSocialContent />
          </TabsContent>

          {/* ── Marketing Avançado ── */}
          <TabsContent value="avancado" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Métricas avançadas de marketing em desenvolvimento.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
