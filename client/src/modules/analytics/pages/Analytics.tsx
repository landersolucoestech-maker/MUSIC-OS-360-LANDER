import React, { useState } from "react";
import { SiYoutube, SiMeta, SiGoogleads, SiInstagram, SiTiktok } from "react-icons/si";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { Users, Eye, TrendingUp, Play, Heart, MousePointer, BarChart2, Zap, Share2, ThumbsUp, MessageCircle } from "lucide-react";
import {
  YOUTUBE_MOCK, YOUTUBE_TOTALS,
  META_ADS_MOCK,
  GOOGLE_ADS_MOCK,
  INSTAGRAM_MOCK, INSTAGRAM_TOTALS,
  TIKTOK_MOCK, TIKTOK_TOTALS,
  fmtNum,
  type MonthlyPoint,
} from "@/modules/analytics/data/mockAnalytics";
import { formatCurrency } from "@/shared/lib/format-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  {
    id: "youtube",   label: "YouTube",     icon: SiYoutube,   color: "text-primary",            bg: "bg-primary/10",
    brandStyle: { background: "linear-gradient(135deg, hsl(217 91% 52%) 0%, hsl(217 91% 40%) 100%)" },
  },
  {
    id: "tiktok",    label: "TikTok",      icon: SiTiktok,    color: "text-[hsl(271,91%,65%)]", bg: "bg-[hsl(271,91%,65%)]/10",
    brandStyle: { background: "linear-gradient(135deg, hsl(271 91% 55%) 0%, hsl(271 91% 40%) 100%)" },
  },
  {
    id: "instagram", label: "Instagram",   icon: SiInstagram, color: "text-warning",            bg: "bg-warning/10",
    brandStyle: { background: "linear-gradient(135deg, hsl(38 92% 44%) 0%, hsl(25 95% 46%) 100%)" },
  },
  {
    id: "meta",      label: "Meta Ads",    icon: SiMeta,      color: "text-primary",            bg: "bg-primary/10",
    brandStyle: { background: "linear-gradient(135deg, hsl(222 47% 28%) 0%, hsl(217 91% 35%) 100%)" },
  },
  {
    id: "google",    label: "Google Ads",  icon: SiGoogleads, color: "text-success",            bg: "bg-success/10",
    brandStyle: { background: "linear-gradient(135deg, hsl(142 76% 30%) 0%, hsl(142 76% 22%) 100%)" },
  },
];

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBarChart({ data, color }: { data: MonthlyPoint[]; color: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className={cn("w-full rounded-sm transition-all", color)} style={{ height: `${Math.max(4, (d.value / max) * 40)}px` }} />
          <span className="text-[9px] text-muted-foreground">{d.mes}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KPI({ label, value, icon: Icon, sub }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }>; sub?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-xl font-bold text-foreground font-mono">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Simulated notice ─────────────────────────────────────────────────────────

function SimulatedNotice() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0" />
      <span>Dados simulados para demonstração. Conecte as plataformas em <strong>Configurações → Integrações</strong> para ver métricas reais.</span>
    </div>
  );
}

// ─── Platform tab button ──────────────────────────────────────────────────────

function PlatformTab({ p, active, onClick }: { p: Platform; active: boolean; onClick: () => void }) {
  const Icon = p.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap shrink-0",
        active ? `${p.bg} ${p.color} shadow-sm` : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
      data-testid={`tab-platform-${p.id}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {p.label}
    </button>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewPanel() {
  const summaries = [
    {
      p: PLATFORMS[1], // youtube
      metrics: [
        { label: "Views/mês",    value: fmtNum(YOUTUBE_TOTALS.totalViewsMes) },
        { label: "Inscritos",    value: fmtNum(YOUTUBE_TOTALS.totalSubscribers) },
        { label: "Watch hrs/mês",value: fmtNum(YOUTUBE_TOTALS.totalWatchHoursMes) },
      ],
    },
    {
      p: PLATFORMS[2], // tiktok
      metrics: [
        { label: "Seguidores",   value: fmtNum(TIKTOK_TOTALS.totalFollowers) },
        { label: "Views/mês",    value: fmtNum(TIKTOK_TOTALS.totalViewsMes) },
        { label: "Eng. médio",   value: `${TIKTOK_TOTALS.avgEngagement}%` },
      ],
    },
    {
      p: PLATFORMS[3], // instagram
      metrics: [
        { label: "Seguidores",   value: fmtNum(INSTAGRAM_TOTALS.totalFollowers) },
        { label: "Alcance/mês",  value: fmtNum(INSTAGRAM_TOTALS.totalAlcanceMes) },
        { label: "Eng. médio",   value: `${INSTAGRAM_TOTALS.avgEngagement}%` },
      ],
    },
    {
      p: PLATFORMS[4], // meta
      metrics: [
        { label: "Impressões",   value: fmtNum(META_ADS_MOCK.mes.impressoes) },
        { label: "Cliques",      value: fmtNum(META_ADS_MOCK.mes.cliques) },
        { label: "CTR",          value: `${META_ADS_MOCK.mes.ctr}%` },
      ],
    },
    {
      p: PLATFORMS[5], // google
      metrics: [
        { label: "Impressões",   value: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes) },
        { label: "Cliques",      value: fmtNum(GOOGLE_ADS_MOCK.mes.cliques) },
        { label: "Conversões",   value: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes) },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <SimulatedNotice />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {summaries.map(({ p, metrics }) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="border-border overflow-hidden">
              {/* Brand color header */}
              <div
                className="px-4 py-3 flex items-center justify-between gap-2"
                style={p.brandStyle ?? { background: "hsl(var(--primary)/0.15)" }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-white drop-shadow-sm" />
                  <CardTitle className="text-sm font-semibold text-white drop-shadow-sm">{p.label}</CardTitle>
                </div>
                <Badge className="text-[9px] px-1.5 py-0 bg-black/20 text-white border-white/20 border">
                  Simulado
                </Badge>
              </div>
              {/* Metrics */}
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
  );
}

// ─── YouTube Panel ───────────────────────────────────────────────────────────

function YouTubePanel() {
  const [selected, setSelected] = useState(0);
  const artista = YOUTUBE_MOCK[selected];
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      <div className="flex gap-2 flex-wrap">
        {YOUTUBE_MOCK.map((a, i) => (
          <button key={a.artistaId} onClick={() => setSelected(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", selected === i ? "bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><KPI label="Inscritos" value={fmtNum(artista.subscribers)} icon={Users} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Views/Mês" value={fmtNum(artista.viewsMes)} icon={Eye} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Watch Hrs/Mês" value={fmtNum(artista.watchHoursMes)} icon={Play} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Vídeos" value={String(artista.videosPublicados)} icon={Play} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {artista.topVideos.map((v, i) => {
              const max = artista.topVideos[0].views;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-xs font-medium truncate max-w-[160px]">{v.titulo}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{v.duracao}</span>
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
          <CardContent className="pt-0">
            <MiniBarChart data={artista.evolution} color="bg-[#FF0000]/60" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(artista.evolution[0].value)}</span>
              <span className="text-[#FF0000] font-semibold">{fmtNum(artista.evolution[artista.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── TikTok Panel ─────────────────────────────────────────────────────────────

function TikTokPanel() {
  const [selected, setSelected] = useState(0);
  const artista = TIKTOK_MOCK[selected];
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      <div className="flex gap-2 flex-wrap">
        {TIKTOK_MOCK.map((a, i) => (
          <button key={a.artistaId} onClick={() => setSelected(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", selected === i ? "bg-foreground/10 text-foreground border border-foreground/20" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><KPI label="Seguidores" value={fmtNum(artista.followers)} icon={Users} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Views/Mês" value={fmtNum(artista.viewsMes)} icon={Eye} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Vídeos/Mês" value={String(artista.videosMes)} icon={Play} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Engajamento" value={`${artista.engagementRate}%`} icon={TrendingUp} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {artista.topVideos.map((v, i) => {
              const max = artista.topVideos[0].views;
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
          <CardContent className="pt-0">
            <MiniBarChart data={artista.evolution} color="bg-foreground/50" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(artista.evolution[0].value)}</span>
              <span className="text-foreground font-semibold">{fmtNum(artista.evolution[artista.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Instagram Panel ──────────────────────────────────────────────────────────

function InstagramPanel() {
  const [selected, setSelected] = useState(0);
  const artista = INSTAGRAM_MOCK[selected];
  const TIPO_ICON: Record<string, string> = { foto: "📷", reel: "🎬", carrossel: "🖼️" };
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      <div className="flex gap-2 flex-wrap">
        {INSTAGRAM_MOCK.map((a, i) => (
          <button key={a.artistaId} onClick={() => setSelected(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", selected === i ? "bg-[#E1306C]/15 text-[#E1306C] border border-[#E1306C]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><KPI label="Seguidores" value={fmtNum(artista.followers)} icon={Users} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Alcance/Mês" value={fmtNum(artista.alcanceMes)} icon={Eye} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Reels/Mês" value={String(artista.reelsMes)} icon={Play} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Engajamento" value={`${artista.engagementRate}%`} icon={Heart} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Posts</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {artista.topPosts.map((post, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                <span className="text-base">{TIPO_ICON[post.tipo]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{post.descricao}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5 text-[#E1306C]" />{fmtNum(post.curtidas)}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{fmtNum(post.comentarios)}</span>
                    <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{fmtNum(post.alcance)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{post.tipo}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Crescimento de Seguidores — 6 meses</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={artista.evolution} color="bg-[#E1306C]/60" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(artista.evolution[0].value)}</span>
              <span className="text-[#E1306C] font-semibold">{fmtNum(artista.evolution[artista.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Meta Ads Panel ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ativa: "bg-success/15 text-success border-success/30",
  encerrada: "bg-muted text-muted-foreground border-border",
  pausada: "bg-warning/15 text-warning border-warning/30",
};

function MetaAdsPanel() {
  const d = META_ADS_MOCK;
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><KPI label="Impressões" value={fmtNum(d.mes.impressoes)} icon={Eye} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Alcance" value={fmtNum(d.mes.alcance)} icon={Users} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Cliques" value={fmtNum(d.mes.cliques)} icon={MousePointer} sub={`CTR ${d.mes.ctr}%`} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Investimento" value={formatCurrency(d.mes.spend)} sub={`CPM R$ ${d.mes.cpm}`} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Campanhas Ativas</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {d.campanhas.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-2 py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{c.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{c.artista} · {c.objetivo}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{fmtNum(c.impressoes)} impressões</span>
                    <span>CTR {c.ctr}%</span>
                    <span className="text-success">{fmtNum(c.resultados)} resultados</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-semibold">{formatCurrency(c.spend)}</p>
                  <Badge className={cn("text-[9px] mt-1 border", STATUS_COLORS[c.status])}>{c.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={d.evolution} color="bg-[#0082FB]/60" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(d.evolution[0].value)}</span>
              <span className="text-[#0082FB] font-semibold">{fmtNum(d.evolution[d.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Google Ads Panel ─────────────────────────────────────────────────────────

function GoogleAdsPanel() {
  const d = GOOGLE_ADS_MOCK;
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><KPI label="Impressões" value={fmtNum(d.mes.impressoes)} icon={Eye} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Cliques" value={fmtNum(d.mes.cliques)} icon={MousePointer} sub={`CTR ${d.mes.ctr}%`} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Conversões" value={fmtNum(d.mes.conversoes)} icon={TrendingUp} sub={`Custo R$ ${d.mes.custoConversao}`} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Investimento" value={formatCurrency(d.mes.spend)} sub={`CPC R$ ${d.mes.cpc}`} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Campanhas</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {d.campanhas.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-2 py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{c.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{c.tipo}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{fmtNum(c.impressoes)} impressões</span>
                    <span>CTR {c.ctr}%</span>
                    <span className="text-success">{fmtNum(c.conversoes)} conv.</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-semibold">{formatCurrency(c.spend)}</p>
                  <Badge className={cn("text-[9px] mt-1 border", STATUS_COLORS[c.status])}>{c.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={d.evolution} color="bg-[#4285F4]/60" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(d.evolution[0].value)}</span>
              <span className="text-[#4285F4] font-semibold">{fmtNum(d.evolution[d.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [active, setActive] = useState<PlatformId>("overview");

  return (
    <MainLayout
      title="Analytics"
      description="Desempenho dos perfis da empresa no YouTube, TikTok, Instagram, Meta Ads e Google Ads"
    >
      <div className="space-y-6">
        {/* Platform tabs */}
        <div className="flex gap-1.5 flex-wrap border-b border-border pb-3 overflow-x-auto">
          {PLATFORMS.map(p => (
            <PlatformTab key={p.id} p={p} active={active === p.id} onClick={() => setActive(p.id)} />
          ))}
        </div>

        {/* Panels */}
        {active === "overview"   && <OverviewPanel />}
        {active === "youtube"    && <YouTubePanel />}
        {active === "tiktok"     && <TikTokPanel />}
        {active === "instagram"  && <InstagramPanel />}
        {active === "meta"       && <MetaAdsPanel />}
        {active === "google"     && <GoogleAdsPanel />}
      </div>
    </MainLayout>
  );
}
