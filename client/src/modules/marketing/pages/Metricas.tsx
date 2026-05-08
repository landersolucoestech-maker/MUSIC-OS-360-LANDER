import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Eye, Heart, Users, TrendingUp, Download,
  BarChart2, DollarSign, MousePointer, Music2,
  ArrowUpRight, ArrowDownRight, ChevronDown,
  LayoutGrid, FileDown, FileSpreadsheet, FileText,
  Play, ThumbsUp, MessageCircle, Share2, Zap,
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

// ─── Types ─────────────────────────────────────────────────────────────────────
type PlatformId = "overview" | "youtube" | "tiktok" | "instagram" | "meta" | "google";

// ─── SVG Area chart ────────────────────────────────────────────────────────────
function AreaChart({ data, stroke, gradId }: { data: MonthlyPoint[]; stroke: string; gradId: string }) {
  const W = 560;
  const H = 180;
  const PL = 44;
  const PR = 16;
  const PT = 16;
  const PB = 28;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: PL + (i / (data.length - 1)) * innerW,
    y: PT + (1 - d.value / max) * innerH,
    mes: d.mes,
    value: d.value,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(H - PB).toFixed(1)} L${PL},${(H - PB).toFixed(1)} Z`;
  const yLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yLines.map((f, i) => {
        const y = PT + (1 - f) * innerH;
        const val = Math.round(max * f);
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            {f > 0 && (
              <text x={PL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.4">
                {fmtNum(val)}
              </text>
            )}
          </g>
        );
      })}

      {/* Area + line */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={stroke} strokeWidth="2" stroke="var(--background, #101826)" />
      ))}

      {/* X labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45">
          {p.mes}
        </text>
      ))}
    </svg>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
interface KpiProps {
  label: string;
  value: string;
  trend?: string;
  up?: boolean;
}
function KpiCard({ label, value, trend, up }: KpiProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-border/60 bg-card hover:border-border transition-colors">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-2xl font-bold font-mono text-foreground leading-none">{value}</span>
      {trend && (
        <span className={cn("text-xs font-medium flex items-center gap-0.5 leading-none", up ? "text-success" : "text-destructive")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {trend}
        </span>
      )}
    </div>
  );
}

// ─── Platform switcher ────────────────────────────────────────────────────────
const PLATFORMS: { id: PlatformId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",  label: "Visão Geral", icon: BarChart2   },
  { id: "youtube",   label: "YouTube",     icon: SiYoutube   },
  { id: "tiktok",    label: "TikTok",      icon: SiTiktok    },
  { id: "instagram", label: "Instagram",   icon: SiInstagram },
  { id: "meta",      label: "Meta Ads",    icon: SiMeta      },
  { id: "google",    label: "Google Ads",  icon: SiGoogleads },
];

const CHART_COLOR: Record<PlatformId, string> = {
  overview:  "hsl(217,91%,60%)",
  youtube:   "#FF0000",
  tiktok:    "hsl(271,91%,65%)",
  instagram: "#E1306C",
  meta:      "#0082FB",
  google:    "#34A853",
};

function getEvolution(id: PlatformId, ytSel: number, ttSel: number, igSel: number): MonthlyPoint[] {
  if (id === "youtube")   return YOUTUBE_MOCK[ytSel]?.evolution ?? [];
  if (id === "tiktok")    return TIKTOK_MOCK[ttSel]?.evolution ?? [];
  if (id === "instagram") return INSTAGRAM_MOCK[igSel]?.evolution ?? [];
  if (id === "meta")      return META_ADS_MOCK.evolution;
  if (id === "google")    return GOOGLE_ADS_MOCK.evolution;
  // overview: aggregate yt + tt views
  return YOUTUBE_MOCK[ytSel]?.evolution.map((p, i) => ({
    mes: p.mes,
    value: p.value + (TIKTOK_MOCK[ttSel]?.evolution[i]?.value ?? 0),
  })) ?? [];
}

// ─── Sidebar analytics content ────────────────────────────────────────────────
function SidebarMetrics({
  platform, ytSel, ttSel, igSel, setYtSel, setTtSel, setIgSel,
}: {
  platform: PlatformId;
  ytSel: number; ttSel: number; igSel: number;
  setYtSel: (i: number) => void; setTtSel: (i: number) => void; setIgSel: (i: number) => void;
}) {
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold font-mono text-foreground">{value}</span>
    </div>
  );

  const ArtistPills = ({ items, sel, setSel, color }: {
    items: { nome: string; artistaId: string }[]; sel: number; setSel: (i: number) => void; color: string;
  }) => (
    <div className="flex gap-1.5 flex-wrap mb-3">
      {items.map((a, i) => (
        <button
          key={a.artistaId}
          onClick={() => setSel(i)}
          className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
            sel === i
              ? `border-current/30 text-[${color}] bg-current/5`
              : "border-border text-muted-foreground hover:text-foreground"
          )}
          style={sel === i ? { color, backgroundColor: `${color}10`, borderColor: `${color}30` } : {}}
        >
          {a.nome}
        </button>
      ))}
    </div>
  );

  if (platform === "overview") return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">Resumo Consolidado</p>
      <Row label="Views YouTube/mês" value={fmtNum(YOUTUBE_TOTALS.totalViewsMes)} />
      <Row label="Inscritos YouTube"  value={fmtNum(YOUTUBE_TOTALS.totalSubscribers)} />
      <Row label="Views TikTok/mês"   value={fmtNum(TIKTOK_TOTALS.totalViewsMes)} />
      <Row label="Seguidores TikTok"  value={fmtNum(TIKTOK_TOTALS.totalFollowers)} />
      <Row label="Alcance Instagram"  value={fmtNum(INSTAGRAM_TOTALS.totalAlcanceMes)} />
      <Row label="Impressões Meta"    value={fmtNum(META_ADS_MOCK.mes.impressoes)} />
      <Row label="Impressões Google"  value={fmtNum(GOOGLE_ADS_MOCK.mes.impressoes)} />
    </div>
  );

  if (platform === "youtube") return (
    <div className="space-y-1">
      <ArtistPills items={YOUTUBE_MOCK} sel={ytSel} setSel={setYtSel} color="#FF0000" />
      <Row label="Inscritos"     value={fmtNum(YOUTUBE_MOCK[ytSel].subscribers)} />
      <Row label="Views/mês"     value={fmtNum(YOUTUBE_MOCK[ytSel].viewsMes)} />
      <Row label="Watch hours"   value={fmtNum(YOUTUBE_MOCK[ytSel].watchHoursMes)} />
      <Row label="Vídeos publicados" value={String(YOUTUBE_MOCK[ytSel].videosPublicados)} />
      <Row label="Melhor vídeo"  value={YOUTUBE_MOCK[ytSel].topVideos[0]?.titulo.slice(0, 22) + "…"} />
    </div>
  );

  if (platform === "tiktok") return (
    <div className="space-y-1">
      <ArtistPills items={TIKTOK_MOCK} sel={ttSel} setSel={setTtSel} color="hsl(271,91%,65%)" />
      <Row label="Seguidores"    value={fmtNum(TIKTOK_MOCK[ttSel].followers)} />
      <Row label="Views/mês"     value={fmtNum(TIKTOK_MOCK[ttSel].viewsMes)} />
      <Row label="Vídeos/mês"    value={String(TIKTOK_MOCK[ttSel].videosMes)} />
      <Row label="Engajamento"   value={`${TIKTOK_MOCK[ttSel].engagementRate}%`} />
      <Row label="Melhor vídeo"  value={TIKTOK_MOCK[ttSel].topVideos[0]?.descricao.slice(0, 22) + "…"} />
    </div>
  );

  if (platform === "instagram") return (
    <div className="space-y-1">
      <ArtistPills items={INSTAGRAM_MOCK} sel={igSel} setSel={setIgSel} color="#E1306C" />
      <Row label="Seguidores"   value={fmtNum(INSTAGRAM_MOCK[igSel].followers)} />
      <Row label="Alcance/mês"  value={fmtNum(INSTAGRAM_MOCK[igSel].alcanceMes)} />
      <Row label="Reels/mês"    value={String(INSTAGRAM_MOCK[igSel].reelsMes)} />
      <Row label="Engajamento"  value={`${INSTAGRAM_MOCK[igSel].engagementRate}%`} />
    </div>
  );

  if (platform === "meta") return (
    <div className="space-y-1">
      <Row label="Impressões"   value={fmtNum(META_ADS_MOCK.mes.impressoes)} />
      <Row label="Alcance"      value={fmtNum(META_ADS_MOCK.mes.alcance)} />
      <Row label="Cliques"      value={fmtNum(META_ADS_MOCK.mes.cliques)} />
      <Row label="CTR"          value={`${META_ADS_MOCK.mes.ctr}%`} />
      <Row label="Investimento" value={formatCurrency(META_ADS_MOCK.mes.spend)} />
      <Row label="Conversões"   value={fmtNum(META_ADS_MOCK.mes.conversoes)} />
    </div>
  );

  if (platform === "google") return (
    <div className="space-y-1">
      <Row label="Impressões"  value={fmtNum(GOOGLE_ADS_MOCK.mes.impressoes)} />
      <Row label="Cliques"     value={fmtNum(GOOGLE_ADS_MOCK.mes.cliques)} />
      <Row label="CTR"         value={`${GOOGLE_ADS_MOCK.mes.ctr}%`} />
      <Row label="Conversões"  value={fmtNum(GOOGLE_ADS_MOCK.mes.conversoes)} />
      <Row label="Investimento" value={formatCurrency(GOOGLE_ADS_MOCK.mes.spend)} />
      <Row label="Custo/conv." value={formatCurrency(GOOGLE_ADS_MOCK.mes.spend / Math.max(1, GOOGLE_ADS_MOCK.mes.conversoes))} />
    </div>
  );

  return null;
}

// ─── Performance analítica ────────────────────────────────────────────────────
function PerformanceAnalitica() {
  const [platform, setPlatform] = useState<PlatformId>("overview");
  const [ytSel, setYtSel] = useState(0);
  const [ttSel, setTtSel] = useState(0);
  const [igSel, setIgSel] = useState(0);

  const evolution = getEvolution(platform, ytSel, ttSel, igSel);
  const stroke = CHART_COLOR[platform];
  const gradId = `grad-${platform}`;

  const chartLabel: Record<PlatformId, string> = {
    overview:  "Views + Alcance consolidado — últimos 6 meses",
    youtube:   "Views mensais — últimos 6 meses",
    tiktok:    "Views mensais — últimos 6 meses",
    instagram: "Crescimento de seguidores — últimos 6 meses",
    meta:      "Impressões mensais — últimos 6 meses",
    google:    "Impressões mensais — últimos 6 meses",
  };

  return (
    <div className="space-y-4">
      {/* Platform switcher */}
      <div className="flex gap-1 flex-wrap">
        {PLATFORMS.map(pl => {
          const Icon = pl.icon;
          const active = platform === pl.id;
          return (
            <button
              key={pl.id}
              onClick={() => setPlatform(pl.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                active
                  ? "bg-foreground/8 text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              data-testid={`btn-platform-${pl.id}`}
            >
              <Icon className="h-3.5 w-3.5" /> {pl.label}
            </button>
          );
        })}
      </div>

      {/* Aviso */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/8 border border-warning/20 text-warning text-xs">
        <Zap className="h-3.5 w-3.5 shrink-0" />
        Dados simulados. Conecte as plataformas em <strong className="mx-0.5">Configurações → Integrações</strong> para ver dados reais.
      </div>

      {/* Chart + sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-4">{chartLabel[platform]}</p>
            {evolution.length > 0
              ? <AreaChart data={evolution} stroke={stroke} gradId={gradId} />
              : <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">Sem dados disponíveis</div>
            }
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <SidebarMetrics
              platform={platform}
              ytSel={ytSel} ttSel={ttSel} igSel={igSel}
              setYtSel={setYtSel} setTtSel={setTtSel} setIgSel={setIgSel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Top conteúdos ─────────────────────────────────────────────────────────────
function TopConteudos() {
  type Filter = "todos" | "youtube" | "tiktok";
  const [filter, setFilter] = useState<Filter>("todos");

  const ytItems = YOUTUBE_MOCK.flatMap(a =>
    a.topVideos.slice(0, 3).map(v => ({
      titulo: v.titulo, artista: a.nome, plataforma: "YouTube" as const, views: v.views,
      icon: SiYoutube, color: "#FF0000", eng: "—",
    }))
  );
  const ttItems = TIKTOK_MOCK.flatMap(a =>
    a.topVideos.slice(0, 3).map(v => ({
      titulo: v.descricao, artista: a.nome, plataforma: "TikTok" as const, views: v.views,
      icon: SiTiktok, color: "hsl(271,91%,65%)", eng: `${((v.curtidas / v.views) * 100).toFixed(1)}%`,
    }))
  );

  const all = [...ytItems, ...ttItems].sort((a, b) => b.views - a.views);
  const rows = filter === "youtube" ? ytItems : filter === "tiktok" ? ttItems : all;

  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-base font-semibold text-foreground">Top Conteúdos</p>
            <p className="text-sm text-muted-foreground mt-0.5">Melhores desempenhos consolidados por plataforma</p>
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            {(["todos", "youtube", "tiktok"] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all capitalize",
                  filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "todos" ? "Todos" : f === "youtube" ? "YouTube" : "TikTok"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[32px_1fr_100px_80px_80px] gap-3 px-3 py-1.5">
            <span />
            <span className="text-xs text-muted-foreground font-medium">Conteúdo</span>
            <span className="text-xs text-muted-foreground font-medium text-right">Views</span>
            <span className="text-xs text-muted-foreground font-medium text-right">Eng.</span>
            <span className="text-xs text-muted-foreground font-medium text-right">Plataforma</span>
          </div>

          {rows.slice(0, 8).map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="grid grid-cols-[32px_1fr_100px_80px_80px] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm text-muted-foreground font-mono text-center">{i + 1}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}18` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.artista}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold font-mono text-foreground text-right">{fmtNum(item.views)}</span>
                <span className="text-sm text-muted-foreground text-right">{item.eng}</span>
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60">{item.plataforma}</span>
                </div>
              </div>
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
  const engMedio = ((TIKTOK_TOTALS.avgEngagement + INSTAGRAM_TOTALS.avgEngagement) / 2).toFixed(1);

  const KPIS: KpiProps[] = [
    { label: "Alcance Total",  value: fmtNum(alcanceTotal),                           trend: "+12.4%", up: true  },
    { label: "Engajamento",    value: `${engMedio}%`,                                  trend: "+3.1%",  up: true  },
    { label: "Seguidores",     value: fmtNum(seguidoresTotal),                         trend: "+8.7%",  up: true  },
    { label: "Streams",        value: "—" },
    { label: "ROI Médio",      value: "0%" },
    { label: "Conversões",     value: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes),          trend: "+5.2%",  up: true  },
  ];

  const ExportButton = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-sm gap-1.5" data-testid="button-exportar">
          <Download className="h-3.5 w-3.5" /> Exportar <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem className="gap-2 text-sm" data-testid="export-pdf"><FileText className="h-3.5 w-3.5" /> Exportar PDF</DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-sm" data-testid="export-xlsx"><FileSpreadsheet className="h-3.5 w-3.5" /> Exportar XLSX</DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-sm" data-testid="export-csv"><FileDown className="h-3.5 w-3.5" /> Exportar CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MainLayout
      title="Métricas & Performance"
      description="Monitoramento consolidado de plataformas, campanhas e audiência digital"
      actions={<ExportButton />}
    >
      <div className="space-y-8">

        {/* 1 — KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {KPIS.map(k => <KpiCard key={k.label} {...k} />)}
        </section>

        {/* 2 — Performance analítica */}
        <section className="space-y-2">
          <div>
            <p className="text-base font-semibold text-foreground">Performance Analítica</p>
            <p className="text-sm text-muted-foreground">Evolução mensal por plataforma</p>
          </div>
          <PerformanceAnalitica />
        </section>

        {/* 3 — Top conteúdos */}
        <section>
          <TopConteudos />
        </section>

        {/* 4 — Campanhas */}
        <section>
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="mb-5">
                <p className="text-base font-semibold text-foreground">Performance de Campanhas</p>
                <p className="text-sm text-muted-foreground mt-0.5">Resultados das campanhas publicitárias</p>
              </div>
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhuma campanha registrada</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Conecte Meta Ads ou Google Ads em <strong>Configurações → Integrações</strong> para importar campanhas automaticamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </MainLayout>
  );
}
