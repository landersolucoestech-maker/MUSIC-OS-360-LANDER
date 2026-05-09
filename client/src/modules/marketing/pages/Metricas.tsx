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
  ChevronDown,
  LayoutGrid, FileDown, FileSpreadsheet, FileText,
  Play, ThumbsUp, MessageCircle, Share2, Zap,
} from "lucide-react";
import { SiYoutube, SiGoogleads, SiInstagram, SiTiktok, SiSpotify } from "react-icons/si";
import { cn } from "@/shared/lib/utils";
import {
  YOUTUBE_MOCK, YOUTUBE_TOTALS,
  GOOGLE_ADS_MOCK,
  INSTAGRAM_MOCK, INSTAGRAM_TOTALS,
  TIKTOK_MOCK, TIKTOK_TOTALS,
  SPOTIFY_ADS_MOCK,
  fmtNum, type MonthlyPoint,
} from "@/modules/analytics/data/mockAnalytics";
import { formatCurrency } from "@/shared/lib/format-utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
type PlatformId = "overview" | "youtube" | "tiktok" | "instagram" | "google" | "spotify";

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

// ─── Platform switcher ────────────────────────────────────────────────────────
const PLATFORMS: { id: PlatformId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",  label: "Visão Geral", icon: BarChart2   },
  { id: "youtube",   label: "YouTube",     icon: SiYoutube   },
  { id: "tiktok",    label: "TikTok",      icon: SiTiktok    },
  { id: "instagram", label: "Instagram",   icon: SiInstagram },
  { id: "google",    label: "Google Ads",  icon: SiGoogleads },
  { id: "spotify",   label: "Spotify Ads", icon: SiSpotify   },
];

const CHART_COLOR: Record<PlatformId, string> = {
  overview:  "hsl(217,91%,60%)",
  youtube:   "#FF0000",
  tiktok:    "hsl(271,91%,65%)",
  instagram: "#E1306C",
  google:    "#34A853",
  spotify:   "#1DB954",
};

function getEvolution(id: PlatformId, ytSel: number, ttSel: number, igSel: number): MonthlyPoint[] {
  if (id === "youtube")   return YOUTUBE_MOCK[ytSel]?.evolution ?? [];
  if (id === "tiktok")    return TIKTOK_MOCK[ttSel]?.evolution ?? [];
  if (id === "instagram") return INSTAGRAM_MOCK[igSel]?.evolution ?? [];
  if (id === "google")    return GOOGLE_ADS_MOCK.evolution;
  if (id === "spotify")   return SPOTIFY_ADS_MOCK.evolution;
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

  if (platform === "overview") {
    const audienciaTotal     = YOUTUBE_TOTALS.totalSubscribers + TIKTOK_TOTALS.totalFollowers + INSTAGRAM_TOTALS.totalFollowers;
    const viewsTotaisMes     = YOUTUBE_TOTALS.totalViewsMes + TIKTOK_TOTALS.totalViewsMes;
    const engMedio           = ((TIKTOK_TOTALS.avgEngagement + INSTAGRAM_TOTALS.avgEngagement) / 2).toFixed(1);
    const alcanceTotal       = YOUTUBE_TOTALS.totalViewsMes + TIKTOK_TOTALS.totalViewsMes + INSTAGRAM_TOTALS.totalAlcanceMes;
    const impressoesTotais   = GOOGLE_ADS_MOCK.mes.impressoes + SPOTIFY_ADS_MOCK.mes.impressoes;
    const cliquesTotais      = GOOGLE_ADS_MOCK.mes.cliques + SPOTIFY_ADS_MOCK.mes.cliques;
    const ctrMedio           = ((GOOGLE_ADS_MOCK.mes.ctr + SPOTIFY_ADS_MOCK.mes.ctr) / 2).toFixed(2);
    const conversaosTotal    = GOOGLE_ADS_MOCK.mes.conversoes || 0;
    const investimentoTotal  = GOOGLE_ADS_MOCK.mes.spend + SPOTIFY_ADS_MOCK.mes.spend;

    const allContent = [
      ...YOUTUBE_MOCK.flatMap(a => a.topVideos.map(v => ({ titulo: v.titulo, views: v.views }))),
      ...TIKTOK_MOCK.flatMap(a => a.topVideos.map(v => ({ titulo: v.descricao, views: v.views }))),
    ];
    const melhorConteudo = allContent.sort((a, b) => b.views - a.views)[0]?.titulo ?? "—";

    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">Resumo Consolidado</p>
        <Row label="Audiência Total"         value={fmtNum(audienciaTotal)} />
        <Row label="Views Totais/Mês"        value={fmtNum(viewsTotaisMes)} />
        <Row label="Engajamento Médio"       value={`${engMedio}%`} />
        <Row label="Alcance Total"           value={fmtNum(alcanceTotal)} />
        <Row label="Impressões Totais Ads"   value={fmtNum(impressoesTotais)} />
        <Row label="Cliques Totais"          value={fmtNum(cliquesTotais)} />
        <Row label="CTR Médio"               value={`${ctrMedio}%`} />
        <Row label="Conversões Totais"       value={fmtNum(conversaosTotal)} />
        <Row label="Investimento Total"      value={formatCurrency(investimentoTotal)} />
        <Row label="Melhor Conteúdo"         value={melhorConteudo.length > 20 ? melhorConteudo.slice(0, 20) + "…" : melhorConteudo} />
      </div>
    );
  }

  if (platform === "youtube") return (
    <div className="space-y-1">
      <ArtistPills items={YOUTUBE_MOCK} sel={ytSel} setSel={setYtSel} color="#FF0000" />
      <Row label="Inscritos"        value={fmtNum(YOUTUBE_MOCK[ytSel].subscribers)} />
      <Row label="Views/mês"        value={fmtNum(YOUTUBE_MOCK[ytSel].viewsMes)} />
      <Row label="Watch hours"      value={fmtNum(YOUTUBE_MOCK[ytSel].watchHoursMes)} />
      <Row label="Vídeos publicados" value={String(YOUTUBE_MOCK[ytSel].videosPublicados)} />
      <Row label="Impressões"       value={fmtNum(YOUTUBE_MOCK[ytSel].impressoesMes)} />
      <Row label="Cliques"          value={fmtNum(YOUTUBE_MOCK[ytSel].cliquesMes)} />
      <Row label="CTR"              value={`${YOUTUBE_MOCK[ytSel].ctr}%`} />
      <Row label="VTR"              value={`${YOUTUBE_MOCK[ytSel].vtr}%`} />
      <Row label="Melhor vídeo"     value={YOUTUBE_MOCK[ytSel].topVideos[0]?.titulo.slice(0, 22) + "…"} />
      <Row label="Investimento"     value={formatCurrency(YOUTUBE_MOCK[ytSel].investimentoMes)} />
    </div>
  );

  if (platform === "tiktok") return (
    <div className="space-y-1">
      <ArtistPills items={TIKTOK_MOCK} sel={ttSel} setSel={setTtSel} color="hsl(271,91%,65%)" />
      <Row label="Seguidores"    value={fmtNum(TIKTOK_MOCK[ttSel].followers)} />
      <Row label="Views/mês"     value={fmtNum(TIKTOK_MOCK[ttSel].viewsMes)} />
      <Row label="Vídeos/mês"    value={String(TIKTOK_MOCK[ttSel].videosMes)} />
      <Row label="Engajamento"   value={`${TIKTOK_MOCK[ttSel].engagementRate}%`} />
      <Row label="Impressões"    value={fmtNum(TIKTOK_MOCK[ttSel].impressoesMes)} />
      <Row label="Cliques"       value={fmtNum(TIKTOK_MOCK[ttSel].cliquesMes)} />
      <Row label="CTR"           value={`${TIKTOK_MOCK[ttSel].ctr}%`} />
      <Row label="Plays"         value={fmtNum(TIKTOK_MOCK[ttSel].playsMes)} />
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
      <Row label="Impressões"   value={fmtNum(INSTAGRAM_MOCK[igSel].impressoesMes)} />
      <Row label="Alcance"      value={fmtNum(INSTAGRAM_MOCK[igSel].alcanceMes)} />
      <Row label="Cliques"      value={fmtNum(INSTAGRAM_MOCK[igSel].cliquesMes)} />
      <Row label="CTR"          value={`${INSTAGRAM_MOCK[igSel].ctr}%`} />
      <Row label="Investimento" value={formatCurrency(INSTAGRAM_MOCK[igSel].investimentoMes)} />
      <Row label="Conversões"   value={fmtNum(INSTAGRAM_MOCK[igSel].conversoesMes)} />
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

  if (platform === "spotify") return (
    <div className="space-y-1">
      <Row label="Impressões"    value={fmtNum(SPOTIFY_ADS_MOCK.mes.impressoes)} />
      <Row label="Cliques"       value={fmtNum(SPOTIFY_ADS_MOCK.mes.cliques)} />
      <Row label="CTR"           value={`${SPOTIFY_ADS_MOCK.mes.ctr}%`} />
      <Row label="Streams"       value={fmtNum(SPOTIFY_ADS_MOCK.mes.streams)} />
      <Row label="Investimento"  value={formatCurrency(SPOTIFY_ADS_MOCK.mes.spend)} />
      <Row label="Custo/stream"  value={formatCurrency(SPOTIFY_ADS_MOCK.mes.spend / Math.max(1, SPOTIFY_ADS_MOCK.mes.streams))} />
    </div>
  );

  return null;
}

// ─── Performance analítica ────────────────────────────────────────────────────
function PerformanceAnalitica({
  platform, setPlatform,
}: {
  platform: PlatformId;
  setPlatform: (p: PlatformId) => void;
}) {
  const [ytSel, setYtSel] = useState(0);
  const [ttSel, setTtSel] = useState(0);
  const [igSel, setIgSel] = useState(0);

  const evolution = getEvolution(platform, ytSel, ttSel, igSel);
  const stroke = CHART_COLOR[platform];
  const gradId = `grad-${platform}`;

  const chartLabel: Record<PlatformId, string> = {
    overview:     "Views + Alcance consolidado — últimos 6 meses",
    youtube:      "Views mensais — últimos 6 meses",
    youtubeads:   "Impressões YouTube Ads — últimos 6 meses",
    tiktok:       "Views mensais — últimos 6 meses",
    tiktokads:    "Impressões TikTok Ads — últimos 6 meses",
    instagram:    "Crescimento de seguidores — últimos 6 meses",
    instagramads: "Impressões Instagram Ads — últimos 6 meses",
    facebookads:  "Impressões Facebook Ads — últimos 6 meses",
    google:       "Impressões Google Ads — últimos 6 meses",
    spotify:      "Impressões Spotify Ads — últimos 6 meses",
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
type ContentFilter = "todos" | "youtube" | "tiktok" | "instagram" | "google" | "spotify";

interface ContentItem {
  titulo: string;
  artista: string;
  plataforma: string;
  metric: number;
  metricLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

const FILTER_OPTIONS: { id: ContentFilter; label: string }[] = [
  { id: "todos",     label: "Todos"      },
  { id: "youtube",   label: "YouTube"    },
  { id: "tiktok",    label: "TikTok"     },
  { id: "instagram", label: "Instagram"  },
  { id: "google",    label: "Google Ads" },
  { id: "spotify",   label: "Spotify Ads"},
];

function buildContentItems(): Record<ContentFilter, ContentItem[]> {
  const yt: ContentItem[] = YOUTUBE_MOCK.flatMap(a =>
    a.topVideos.slice(0, 3).map(v => ({
      titulo: v.titulo, artista: a.nome, plataforma: "YouTube",
      metric: v.views, metricLabel: "views",
      icon: SiYoutube, color: "#FF0000",
    }))
  );

  const tt: ContentItem[] = TIKTOK_MOCK.flatMap(a =>
    a.topVideos.slice(0, 3).map(v => ({
      titulo: v.descricao, artista: a.nome, plataforma: "TikTok",
      metric: v.views, metricLabel: "views",
      icon: SiTiktok, color: "hsl(271,91%,65%)",
    }))
  );

  const ig: ContentItem[] = INSTAGRAM_MOCK.flatMap(a =>
    a.topPosts.slice(0, 2).map(p => ({
      titulo: p.descricao, artista: a.nome, plataforma: "Instagram",
      metric: p.alcance, metricLabel: "alcance",
      icon: SiInstagram, color: "#E1306C",
    }))
  );

  const google: ContentItem[] = GOOGLE_ADS_MOCK.campanhas.slice(0, 3).map(c => ({
    titulo: c.nome, artista: "Google Ads", plataforma: "Google Ads",
    metric: c.cliques, metricLabel: "cliques",
    icon: SiGoogleads, color: "#34A853",
  }));

  const spotify: ContentItem[] = SPOTIFY_ADS_MOCK.campanhas.slice(0, 3).map(c => ({
    titulo: c.nome, artista: "Spotify Ads", plataforma: "Spotify Ads",
    metric: c.streams, metricLabel: "streams",
    icon: SiSpotify, color: "#1DB954",
  }));

  // Visão Geral: top 2 de cada plataforma para garantir representação de todas
  const all = [
    ...yt.slice(0, 2),
    ...tt.slice(0, 2),
    ...ig.slice(0, 2),
    ...google.slice(0, 2),
    ...spotify.slice(0, 2),
  ];

  return { todos: all, youtube: yt, tiktok: tt, instagram: ig, google, spotify };
}

const PLATFORM_TO_CONTENT: Record<PlatformId, ContentFilter> = {
  overview:  "todos",
  youtube:   "youtube",
  tiktok:    "tiktok",
  instagram: "instagram",
  google:    "google",
  spotify:   "spotify",
};

function TopConteudos({ platform }: { platform: PlatformId }) {
  const filter: ContentFilter = PLATFORM_TO_CONTENT[platform] ?? "todos";
  const allItems = buildContentItems();
  const rows = (allItems[filter] ?? []).slice(0, 10);

  const platformLabel = FILTER_OPTIONS.find(f => f.id === filter)?.label ?? "Todos";
  const subtitle = filter === "todos"
    ? "Melhores desempenhos consolidados — todas as plataformas"
    : `Melhores desempenhos — ${platformLabel}`;

  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="mb-5">
          <p className="text-base font-semibold text-foreground">Top Conteúdos</p>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[28px_1fr_100px_90px] gap-3 px-3 py-1">
            <span />
            <span className="text-xs text-muted-foreground font-medium">Conteúdo</span>
            <span className="text-xs text-muted-foreground font-medium text-right">Resultado</span>
            <span className="text-xs text-muted-foreground font-medium text-right">Plataforma</span>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum conteúdo encontrado</p>
          ) : rows.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="grid grid-cols-[28px_1fr_100px_90px] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm text-muted-foreground font-mono text-center">{i + 1}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}18` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">{item.artista}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold font-mono text-foreground">{fmtNum(item.metric)}</p>
                  <p className="text-[10px] text-muted-foreground">{item.metricLabel}</p>
                </div>
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60 whitespace-nowrap">{item.plataforma}</span>
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
  const [platform, setPlatform] = useState<PlatformId>("overview");

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

        {/* 1 — Performance analítica */}
        <section className="space-y-2">
          <div>
            <p className="text-base font-semibold text-foreground">Performance Analítica</p>
            <p className="text-sm text-muted-foreground">Evolução mensal por plataforma</p>
          </div>
          <PerformanceAnalitica platform={platform} setPlatform={setPlatform} />
        </section>

        {/* 3 — Top conteúdos */}
        <section>
          <TopConteudos platform={platform} />
        </section>


      </div>
    </MainLayout>
  );
}
