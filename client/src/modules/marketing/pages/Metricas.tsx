import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Eye, Heart, Users, TrendingUp, Download,
  BarChart2, DollarSign, MousePointer, Play, ThumbsUp, MessageCircle, Share2, Zap,
  ArrowUpRight, ArrowDownRight, Music2, FileDown, FileSpreadsheet, FileText,
  Radio, LayoutGrid,
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

// ─── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: MonthlyPoint[]; color: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-[3px] h-8">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={cn("w-full rounded-[2px]", color)}
            style={{ height: `${Math.max(3, (d.value / max) * 32)}px` }}
          />
          <span className="text-[8px] text-muted-foreground">{d.mes}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Simulated notice ──────────────────────────────────────────────────────────
function SimulatedNotice() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0" />
      Dados simulados para demonstração. Conecte as plataformas em{" "}
      <strong>Configurações → Integrações</strong> para ver métricas reais.
    </div>
  );
}

// ─── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ value, positive = true }: { value: string; positive?: boolean }) {
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium",
      positive ? "text-success" : "text-destructive"
    )}>
      <Icon className="h-3 w-3" />{value}
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  accentBg: string;
}
function KpiCard({ label, value, trend, trendPositive = true, sub, icon: Icon, accent, accentBg }: KpiCardProps) {
  return (
    <Card className="border-border hover:border-border/80 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", accentBg)}>
            <Icon className={cn("h-3.5 w-3.5", accent)} />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-foreground leading-none">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5">
            <TrendBadge value={trend} positive={trendPositive} />
            <span className="text-[10px] text-muted-foreground">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Platform definitions ──────────────────────────────────────────────────────
type PlatformId = "overview" | "youtube" | "tiktok" | "instagram" | "meta" | "google";

const PLATFORMS = [
  { id: "overview"  as PlatformId, label: "Visão Geral", icon: BarChart2,   accentCls: "text-primary",            bgCls: "bg-primary/10" },
  { id: "youtube"   as PlatformId, label: "YouTube",     icon: SiYoutube,   accentCls: "text-[#FF0000]",          bgCls: "bg-[#FF0000]/10",              brandGrad: "from-[#c4302b] to-[#8b1c19]" },
  { id: "tiktok"    as PlatformId, label: "TikTok",      icon: SiTiktok,    accentCls: "text-[hsl(271,91%,65%)]", bgCls: "bg-[hsl(271,91%,65%)]/10",     brandGrad: "from-[hsl(271,91%,50%)] to-[hsl(271,91%,35%)]" },
  { id: "instagram" as PlatformId, label: "Instagram",   icon: SiInstagram, accentCls: "text-[#E1306C]",          bgCls: "bg-[#E1306C]/10",              brandGrad: "from-[#f09433] to-[#e1306c]" },
  { id: "meta"      as PlatformId, label: "Meta Ads",    icon: SiMeta,      accentCls: "text-[#0082FB]",          bgCls: "bg-[#0082FB]/10",              brandGrad: "from-[#0082fb] to-[#005ab5]" },
  { id: "google"    as PlatformId, label: "Google Ads",  icon: SiGoogleads, accentCls: "text-success",            bgCls: "bg-success/10",                brandGrad: "from-[#34a853] to-[#1e6e31]" },
];

// ─── Platform performance section ─────────────────────────────────────────────
function PlatformPerformance() {
  const [platform, setPlatform] = useState<PlatformId>("overview");
  const [ytSel, setYtSel] = useState(0);
  const [ttSel, setTtSel] = useState(0);
  const [igSel, setIgSel] = useState(0);

  const p = PLATFORMS.find(x => x.id === platform)!;

  return (
    <div className="space-y-4">
      {/* Platform pills */}
      <div className="flex gap-1.5 flex-wrap">
        {PLATFORMS.map(pl => {
          const Icon = pl.icon;
          const active = platform === pl.id;
          return (
            <button
              key={pl.id}
              onClick={() => setPlatform(pl.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                active ? `${pl.bgCls} ${pl.accentCls} shadow-sm ring-1 ring-inset ring-current/20` : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              data-testid={`btn-platform-${pl.id}`}
            >
              <Icon className="h-3.5 w-3.5" /> {pl.label}
            </button>
          );
        })}
      </div>

      <SimulatedNotice />

      {/* Overview */}
      {platform === "overview" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {[
            { pl: PLATFORMS[1], metrics: [{ l: "Views/mês", v: fmtNum(YOUTUBE_TOTALS.totalViewsMes) }, { l: "Inscritos", v: fmtNum(YOUTUBE_TOTALS.totalSubscribers) }, { l: "Watch hrs", v: fmtNum(YOUTUBE_TOTALS.totalWatchHoursMes) }] },
            { pl: PLATFORMS[2], metrics: [{ l: "Seguidores", v: fmtNum(TIKTOK_TOTALS.totalFollowers) }, { l: "Views/mês", v: fmtNum(TIKTOK_TOTALS.totalViewsMes) }, { l: "Eng.", v: `${TIKTOK_TOTALS.avgEngagement}%` }] },
            { pl: PLATFORMS[3], metrics: [{ l: "Seguidores", v: fmtNum(INSTAGRAM_TOTALS.totalFollowers) }, { l: "Alcance/mês", v: fmtNum(INSTAGRAM_TOTALS.totalAlcanceMes) }, { l: "Eng.", v: `${INSTAGRAM_TOTALS.avgEngagement}%` }] },
            { pl: PLATFORMS[4], metrics: [{ l: "Impressões", v: fmtNum(META_ADS_MOCK.mes.impressoes) }, { l: "Cliques", v: fmtNum(META_ADS_MOCK.mes.cliques) }, { l: "CTR", v: `${META_ADS_MOCK.mes.ctr}%` }] },
            { pl: PLATFORMS[5], metrics: [{ l: "Impressões", v: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes) }, { l: "Cliques", v: fmtNum(GOOGLE_ADS_MOCK.mes.cliques) }, { l: "Conversões", v: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes) }] },
          ].map(({ pl, metrics }) => {
            const Icon = pl.icon;
            return (
              <Card key={pl.id} className="border-border overflow-hidden">
                <div className={cn("px-4 py-2.5 flex items-center justify-between bg-gradient-to-r", pl.brandGrad ?? "from-primary/80 to-primary/60")}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                    <span className="text-xs font-semibold text-white">{pl.label}</span>
                  </div>
                  <Badge className="text-[9px] px-1.5 py-0 bg-black/25 text-white border-white/20">Simulado</Badge>
                </div>
                <CardContent className="px-4 py-3 grid grid-cols-3 gap-3">
                  {metrics.map(m => (
                    <div key={m.l}>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.l}</p>
                      <p className="text-sm font-bold font-mono text-foreground">{m.v}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* YouTube */}
      {platform === "youtube" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {YOUTUBE_MOCK.map((a, i) => (
                <button key={a.artistaId} onClick={() => setYtSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", ytSel === i ? "bg-[#FF0000]/12 text-[#FF0000] border border-[#FF0000]/25" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[{ l: "Inscritos", v: fmtNum(YOUTUBE_MOCK[ytSel].subscribers), i: Users }, { l: "Views/Mês", v: fmtNum(YOUTUBE_MOCK[ytSel].viewsMes), i: Eye }, { l: "Watch Hrs", v: fmtNum(YOUTUBE_MOCK[ytSel].watchHoursMes), i: Play }, { l: "Vídeos", v: String(YOUTUBE_MOCK[ytSel].videosPublicados), i: Radio }].map(k => (
                <Card key={k.l} className="border-border"><CardContent className="p-3">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><k.i className="h-3 w-3" />{k.l}</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{k.v}</p>
                </CardContent></Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Views Mensais — 6 meses</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><MiniBarChart data={YOUTUBE_MOCK[ytSel].evolution} color="bg-[#FF0000]/50" /></CardContent>
            </Card>
          </div>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {YOUTUBE_MOCK[ytSel].topVideos.map((v, i) => {
                const max = YOUTUBE_MOCK[ytSel].topVideos[0].views;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                        <span className="text-xs font-medium truncate">{v.titulo}</span>
                      </div>
                      <span className="text-xs font-mono text-[#FF0000] shrink-0">{fmtNum(v.views)}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden ml-5">
                      <div className="h-full bg-[#FF0000]/40 rounded-full" style={{ width: `${(v.views / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TikTok */}
      {platform === "tiktok" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {TIKTOK_MOCK.map((a, i) => (
                <button key={a.artistaId} onClick={() => setTtSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", ttSel === i ? "bg-foreground/10 text-foreground border border-foreground/20" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[{ l: "Seguidores", v: fmtNum(TIKTOK_MOCK[ttSel].followers), i: Users }, { l: "Views/Mês", v: fmtNum(TIKTOK_MOCK[ttSel].viewsMes), i: Eye }, { l: "Vídeos/Mês", v: String(TIKTOK_MOCK[ttSel].videosMes), i: Play }, { l: "Engajamento", v: `${TIKTOK_MOCK[ttSel].engagementRate}%`, i: TrendingUp }].map(k => (
                <Card key={k.l} className="border-border"><CardContent className="p-3">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><k.i className="h-3 w-3" />{k.l}</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{k.v}</p>
                </CardContent></Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Views Mensais — 6 meses</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><MiniBarChart data={TIKTOK_MOCK[ttSel].evolution} color="bg-foreground/40" /></CardContent>
            </Card>
          </div>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {TIKTOK_MOCK[ttSel].topVideos.map((v, i) => {
                const max = TIKTOK_MOCK[ttSel].topVideos[0].views;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                        <span className="text-xs font-medium truncate">{v.descricao}</span>
                      </div>
                      <span className="text-xs font-mono text-foreground shrink-0">{fmtNum(v.views)}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden ml-5">
                      <div className="h-full bg-foreground/35 rounded-full" style={{ width: `${(v.views / max) * 100}%` }} />
                    </div>
                    <div className="flex gap-3 ml-5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{fmtNum(v.curtidas)}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{fmtNum(v.comentarios)}</span>
                      <span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />{fmtNum(v.compartilhamentos)}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instagram */}
      {platform === "instagram" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {INSTAGRAM_MOCK.map((a, i) => (
                <button key={a.artistaId} onClick={() => setIgSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", igSel === i ? "bg-[#E1306C]/12 text-[#E1306C] border border-[#E1306C]/25" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[{ l: "Seguidores", v: fmtNum(INSTAGRAM_MOCK[igSel].followers), i: Users }, { l: "Alcance/Mês", v: fmtNum(INSTAGRAM_MOCK[igSel].alcanceMes), i: Eye }, { l: "Reels/Mês", v: String(INSTAGRAM_MOCK[igSel].reelsMes), i: Play }, { l: "Engajamento", v: `${INSTAGRAM_MOCK[igSel].engagementRate}%`, i: Heart }].map(k => (
                <Card key={k.l} className="border-border"><CardContent className="p-3">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><k.i className="h-3 w-3" />{k.l}</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{k.v}</p>
                </CardContent></Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Crescimento de Seguidores — 6 meses</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><MiniBarChart data={INSTAGRAM_MOCK[igSel].evolution} color="bg-[#E1306C]/50" /></CardContent>
            </Card>
          </div>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Resumo do Perfil</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { l: "Seguidores totais", v: fmtNum(INSTAGRAM_TOTALS.totalFollowers) },
                { l: "Alcance médio/mês", v: fmtNum(INSTAGRAM_TOTALS.totalAlcanceMes) },
                { l: "Engajamento médio", v: `${INSTAGRAM_TOTALS.avgEngagement}%` },
              ].map(row => (
                <div key={row.l} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{row.l}</span>
                  <span className="text-xs font-bold font-mono text-foreground">{row.v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Meta Ads */}
      {platform === "meta" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[{ l: "Impressões", v: fmtNum(META_ADS_MOCK.mes.impressoes), i: Eye }, { l: "Alcance", v: fmtNum(META_ADS_MOCK.mes.alcance), i: Users }, { l: "Cliques", v: fmtNum(META_ADS_MOCK.mes.cliques), i: MousePointer }, { l: "Investimento", v: formatCurrency(META_ADS_MOCK.mes.spend), i: DollarSign }].map(k => (
                <Card key={k.l} className="border-border"><CardContent className="p-3">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><k.i className="h-3 w-3" />{k.l}</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{k.v}</p>
                </CardContent></Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><MiniBarChart data={META_ADS_MOCK.evolution} color="bg-[#0082FB]/50" /></CardContent>
            </Card>
          </div>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Indicadores</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { l: "CTR",          v: `${META_ADS_MOCK.mes.ctr}%` },
                { l: "CPC médio",    v: formatCurrency(META_ADS_MOCK.mes.spend / META_ADS_MOCK.mes.cliques) },
                { l: "Conversões",   v: fmtNum(META_ADS_MOCK.mes.conversoes) },
                { l: "Custo/conv.",  v: formatCurrency(META_ADS_MOCK.mes.spend / Math.max(1, META_ADS_MOCK.mes.conversoes)) },
              ].map(row => (
                <div key={row.l} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{row.l}</span>
                  <span className="text-xs font-bold font-mono text-foreground">{row.v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Google Ads */}
      {platform === "google" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[{ l: "Impressões", v: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes), i: Eye }, { l: "Cliques", v: fmtNum(GOOGLE_ADS_MOCK.mes.cliques), i: MousePointer }, { l: "Conversões", v: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes), i: TrendingUp }, { l: "Investimento", v: formatCurrency(GOOGLE_ADS_MOCK.mes.spend), i: DollarSign }].map(k => (
                <Card key={k.l} className="border-border"><CardContent className="p-3">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><k.i className="h-3 w-3" />{k.l}</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">{k.v}</p>
                </CardContent></Card>
              ))}
            </div>
            <Card className="border-border">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><MiniBarChart data={GOOGLE_ADS_MOCK.evolution} color="bg-success/50" /></CardContent>
            </Card>
          </div>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Indicadores</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { l: "CTR",          v: `${GOOGLE_ADS_MOCK.mes.ctr}%` },
                { l: "CPC médio",    v: formatCurrency(GOOGLE_ADS_MOCK.mes.spend / GOOGLE_ADS_MOCK.mes.cliques) },
                { l: "Taxa conv.",   v: `${((GOOGLE_ADS_MOCK.mes.conversoes / GOOGLE_ADS_MOCK.mes.cliques) * 100).toFixed(2)}%` },
                { l: "Custo/conv.",  v: formatCurrency(GOOGLE_ADS_MOCK.mes.spend / Math.max(1, GOOGLE_ADS_MOCK.mes.conversoes)) },
              ].map(row => (
                <div key={row.l} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{row.l}</span>
                  <span className="text-xs font-bold font-mono text-foreground">{row.v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Top conteúdos ─────────────────────────────────────────────────────────────
function TopConteudos() {
  type Filter = "todos" | "youtube" | "tiktok";
  const [filter, setFilter] = useState<Filter>("todos");

  const ytItems = YOUTUBE_MOCK.flatMap(a =>
    a.topVideos.slice(0, 2).map(v => ({
      titulo: v.titulo,
      artista: a.nome,
      plataforma: "YouTube" as const,
      views: v.views,
      icon: SiYoutube,
      color: "text-[#FF0000]",
      bg: "bg-[#FF0000]/10",
    }))
  );

  const ttItems = TIKTOK_MOCK.flatMap(a =>
    a.topVideos.slice(0, 2).map(v => ({
      titulo: v.descricao,
      artista: a.nome,
      plataforma: "TikTok" as const,
      views: v.views,
      icon: SiTiktok,
      color: "text-[hsl(271,91%,65%)]",
      bg: "bg-[hsl(271,91%,65%)]/10",
    }))
  );

  const all = [...ytItems, ...ttItems].sort((a, b) => b.views - a.views);
  const items = filter === "youtube" ? ytItems.sort((a, b) => b.views - a.views) : filter === "tiktok" ? ttItems.sort((a, b) => b.views - a.views) : all;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-sm">Top Conteúdos</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Conteúdos com melhor desempenho consolidado</p>
          </div>
          <div className="flex gap-1">
            {(["todos", "youtube", "tiktok"] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn("px-2.5 py-1 rounded text-[10px] font-medium capitalize transition-all",
                  filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {f === "todos" ? "Todos" : f === "youtube" ? "YouTube" : "TikTok"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          {items.slice(0, 8).map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 py-2.5 hover:bg-muted/20 transition-colors rounded-sm px-1">
                <span className="text-[11px] font-mono text-muted-foreground w-5 shrink-0 text-right">{i + 1}</span>
                <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", item.bg)}>
                  <Icon className={cn("h-3 w-3", item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">{item.artista} · {item.plataforma}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold font-mono text-foreground">{fmtNum(item.views)}</p>
                  <p className="text-[10px] text-muted-foreground">views</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Performance de campanhas ──────────────────────────────────────────────────
function CampanhasSection() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Performance de Campanhas</CardTitle>
        <p className="text-[11px] text-muted-foreground">Resultados das campanhas publicitárias por plataforma</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhuma campanha registrada</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Conecte Meta Ads ou Google Ads em <strong>Configurações → Integrações</strong> para importar campanhas automaticamente.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Exportação ────────────────────────────────────────────────────────────────
function ExportacaoSection() {
  const actions = [
    { label: "Exportar PDF",   icon: FileText,        hint: "Relatório consolidado" },
    { label: "Exportar XLSX",  icon: FileSpreadsheet, hint: "Planilha detalhada" },
    { label: "Exportar CSV",   icon: FileDown,        hint: "Dados brutos" },
    { label: "Relatório Geral", icon: Music2,          hint: "Todas as plataformas" },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Exportação & Relatórios</CardTitle>
        <p className="text-[11px] text-muted-foreground">Gere relatórios consolidados das métricas e campanhas</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2 flex-wrap">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Button key={a.label} variant="outline" size="sm" className="h-8 text-xs gap-1.5" data-testid={`btn-export-${a.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Icon className="h-3.5 w-3.5" /> {a.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function MarketingMetricas() {
  const alcanceTotal = YOUTUBE_TOTALS.totalViewsMes + TIKTOK_TOTALS.totalViewsMes + INSTAGRAM_TOTALS.totalAlcanceMes;
  const seguidoresTotal = YOUTUBE_TOTALS.totalSubscribers + TIKTOK_TOTALS.totalFollowers + INSTAGRAM_TOTALS.totalFollowers;
  const engMedio = ((TIKTOK_TOTALS.avgEngagement + INSTAGRAM_TOTALS.avgEngagement) / 2).toFixed(2);

  const KPIS: KpiCardProps[] = [
    { label: "Alcance Total",  value: fmtNum(alcanceTotal),  trend: "+12.4%", trendPositive: true,  sub: "views + alcance este mês",        icon: Eye,         accent: "text-primary",     accentBg: "bg-primary/10" },
    { label: "Engajamento",    value: `${engMedio}%`,        trend: "+3.1%",  trendPositive: true,  sub: "média TikTok + Instagram",        icon: Heart,       accent: "text-success",     accentBg: "bg-success/10" },
    { label: "Seguidores",     value: fmtNum(seguidoresTotal), trend: "+8.7%", trendPositive: true, sub: "todas as plataformas",             icon: Users,       accent: "text-primary",     accentBg: "bg-primary/10" },
    { label: "Streams",        value: "—",                   sub: "conecte Spotify para ver",        icon: Music2,      accent: "text-muted-foreground", accentBg: "bg-muted" },
    { label: "ROI Médio",      value: "0%",                  sub: "retorno sobre investimento",      icon: TrendingUp,  accent: "text-success",     accentBg: "bg-success/10" },
    { label: "Conversões",     value: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes), trend: "+5.2%", trendPositive: true, sub: "Google + Meta Ads", icon: MousePointer, accent: "text-primary", accentBg: "bg-primary/10" },
  ];

  return (
    <MainLayout
      title="Métricas & Performance"
      description="Visão consolidada de plataformas, campanhas e desempenho digital"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground" data-testid="button-exportar-relatorio">
          <Download className="h-3.5 w-3.5" /> Exportar Relatório
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 1 — KPIs */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KPIS.map(k => <KpiCard key={k.label} {...k} />)}
        </section>

        {/* 2 — Performance por plataforma */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Performance por Plataforma</h2>
              <p className="text-[11px] text-muted-foreground">Métricas detalhadas por canal digital</p>
            </div>
          </div>
          <PlatformPerformance />
        </section>

        {/* 3 — Top conteúdos */}
        <section>
          <TopConteudos />
        </section>

        {/* 4 — Campanhas */}
        <section>
          <CampanhasSection />
        </section>

        {/* 5 — Exportação */}
        <section>
          <ExportacaoSection />
        </section>
      </div>
    </MainLayout>
  );
}
