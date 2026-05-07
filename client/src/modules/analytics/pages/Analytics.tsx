import React, { useState } from "react";
import { SiSpotify, SiYoutube, SiApplemusic, SiMeta, SiGoogleads, SiInstagram } from "react-icons/si";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { Users, Eye, TrendingUp, Music, Music2, Play, Heart, MousePointer, BarChart2, MapPin, Zap } from "lucide-react";
import {
  SPOTIFY_MOCK, SPOTIFY_TOTALS,
  YOUTUBE_MOCK, YOUTUBE_TOTALS,
  DEEZER_MOCK, DEEZER_TOTALS,
  APPLE_MOCK, APPLE_TOTALS,
  META_ADS_MOCK,
  GOOGLE_ADS_MOCK,
  INSTAGRAM_MOCK, INSTAGRAM_TOTALS,
  fmtNum,
  type MonthlyPoint,
} from "@/modules/analytics/data/mockAnalytics";
import { formatCurrency } from "@/shared/lib/format-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlatformId = "overview" | "spotify" | "youtube" | "deezer" | "apple" | "meta" | "google" | "instagram";

interface Platform {
  id: PlatformId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
}

const PLATFORMS: Platform[] = [
  { id: "overview",   label: "Visão Geral",  icon: BarChart2,    color: "text-primary",    bg: "bg-primary/10" },
  { id: "spotify",    label: "Spotify",      icon: SiSpotify,    color: "text-[#1DB954]",  bg: "bg-[#1DB954]/10" },
  { id: "youtube",    label: "YouTube",      icon: SiYoutube,    color: "text-[#FF0000]",  bg: "bg-[#FF0000]/10" },
  { id: "deezer",     label: "Deezer",       icon: Music2,       color: "text-[#EF5466]",  bg: "bg-[#EF5466]/10" },
  { id: "apple",      label: "Apple Music",  icon: SiApplemusic, color: "text-[#FC3C44]",  bg: "bg-[#FC3C44]/10" },
  { id: "meta",       label: "Meta Ads",     icon: SiMeta,       color: "text-[#0082FB]",  bg: "bg-[#0082FB]/10" },
  { id: "google",     label: "Google Ads",   icon: SiGoogleads,  color: "text-[#4285F4]",  bg: "bg-[#4285F4]/10" },
  { id: "instagram",  label: "Instagram",    icon: SiInstagram,  color: "text-[#E1306C]",  bg: "bg-[#E1306C]/10" },
];

// ─── Mini bar chart ───────────────────────────────────────────────────────────

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
        active
          ? `${p.bg} ${p.color} shadow-sm`
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
      p: PLATFORMS[1], // spotify
      metrics: [
        { label: "Ouvintes/mês", value: fmtNum(SPOTIFY_TOTALS.totalMonthlyListeners) },
        { label: "Streams/mês",  value: fmtNum(SPOTIFY_TOTALS.totalStreamsMes) },
        { label: "Seguidores",   value: fmtNum(SPOTIFY_TOTALS.totalFollowers) },
      ],
    },
    {
      p: PLATFORMS[2], // youtube
      metrics: [
        { label: "Views/mês",    value: fmtNum(YOUTUBE_TOTALS.totalViewsMes) },
        { label: "Inscritos",    value: fmtNum(YOUTUBE_TOTALS.totalSubscribers) },
        { label: "Watch hrs/mês",value: fmtNum(YOUTUBE_TOTALS.totalWatchHoursMes) },
      ],
    },
    {
      p: PLATFORMS[3], // deezer
      metrics: [
        { label: "Fãs",          value: fmtNum(DEEZER_TOTALS.totalFans) },
        { label: "Streams/mês",  value: fmtNum(DEEZER_TOTALS.totalStreamsMes) },
        { label: "Artistas",     value: String(DEEZER_TOTALS.artistasAtivos) },
      ],
    },
    {
      p: PLATFORMS[4], // apple
      metrics: [
        { label: "Ouv. mensais", value: fmtNum(APPLE_TOTALS.totalListeners) },
        { label: "Shazams",      value: fmtNum(APPLE_TOTALS.totalShazams) },
        { label: "Artistas",     value: String(APPLE_TOTALS.artistasAtivos) },
      ],
    },
    {
      p: PLATFORMS[5], // meta
      metrics: [
        { label: "Impressões",   value: fmtNum(META_ADS_MOCK.mes.impressoes) },
        { label: "Cliques",      value: fmtNum(META_ADS_MOCK.mes.cliques) },
        { label: "CTR",          value: `${META_ADS_MOCK.mes.ctr}%` },
      ],
    },
    {
      p: PLATFORMS[6], // google
      metrics: [
        { label: "Impressões",   value: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes) },
        { label: "Cliques",      value: fmtNum(GOOGLE_ADS_MOCK.mes.cliques) },
        { label: "Conversões",   value: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes) },
      ],
    },
    {
      p: PLATFORMS[7], // instagram
      metrics: [
        { label: "Seguidores",   value: fmtNum(INSTAGRAM_TOTALS.totalFollowers) },
        { label: "Alcance/mês",  value: fmtNum(INSTAGRAM_TOTALS.totalAlcanceMes) },
        { label: "Eng. médio",   value: `${INSTAGRAM_TOTALS.avgEngagement}%` },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <SimulatedNotice />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {summaries.map(({ p, metrics }) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="border-border">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", p.bg)}>
                    <Icon className={cn("h-4 w-4", p.color)} />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{p.label}</CardTitle>
                    <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0">Simulado</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 grid grid-cols-3 gap-3">
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

// ─── Spotify Panel ───────────────────────────────────────────────────────────

function SpotifyPanel() {
  const [selected, setSelected] = useState(0);
  const artista = SPOTIFY_MOCK[selected];
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      {/* Artist selector */}
      <div className="flex gap-2 flex-wrap">
        {SPOTIFY_MOCK.map((a, i) => (
          <button
            key={a.artistaId}
            onClick={() => setSelected(i)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              selected === i ? "bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {a.nome}
          </button>
        ))}
      </div>
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><KPI label="Seguidores" value={fmtNum(artista.followers)} icon={Users} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Ouvintes/Mês" value={fmtNum(artista.monthlyListeners)} icon={Music} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Streams/Mês" value={fmtNum(artista.streamsMes)} icon={Play} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Popularidade" value={`${artista.popularityScore}/100`} icon={TrendingUp} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top tracks */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Tracks</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {artista.topTracks.map((t, i) => {
              const max = artista.topTracks[0].streams;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-xs font-medium truncate max-w-[160px]">{t.titulo}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{t.album}</span>
                    </div>
                    <span className="text-xs font-mono text-[#1DB954] shrink-0">{fmtNum(t.streams)}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden ml-6">
                    <div className="h-full bg-[#1DB954]/60 rounded-full" style={{ width: `${(t.streams / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        {/* Evolution */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ouvintes Mensais — 6 meses</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={artista.evolution} color="bg-[#1DB954]/70" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(artista.evolution[0].value)}</span>
              <span className="text-[#1DB954] font-semibold">{fmtNum(artista.evolution[artista.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
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
        <Card><CardContent className="p-4"><KPI label="Vídeos" value={String(artista.videosPublicados)} icon={Music} /></CardContent></Card>
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

// ─── Deezer Panel ─────────────────────────────────────────────────────────────

function DeezerPanel() {
  const [selected, setSelected] = useState(0);
  const artista = DEEZER_MOCK[selected];
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      <div className="flex gap-2 flex-wrap">
        {DEEZER_MOCK.map((a, i) => (
          <button key={a.artistaId} onClick={() => setSelected(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", selected === i ? "bg-[#EF5466]/15 text-[#EF5466] border border-[#EF5466]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><KPI label="Fãs" value={fmtNum(artista.fans)} icon={Heart} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Streams/Mês" value={fmtNum(artista.streamsMes)} icon={Play} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Álbuns" value={String(artista.albums)} icon={Music} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Álbuns</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {artista.topAlbums.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-xs font-medium">{a.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">{a.ano}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-semibold text-[#EF5466]">{fmtNum(a.fans)}</p>
                  <p className="text-[9px] text-muted-foreground">fãs</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Crescimento de Fãs — 6 meses</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={artista.evolution} color="bg-[#EF5466]/60" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(artista.evolution[0].value)}</span>
              <span className="text-[#EF5466] font-semibold">{fmtNum(artista.evolution[artista.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Apple Music Panel ────────────────────────────────────────────────────────

function AppleMusicPanel() {
  const [selected, setSelected] = useState(0);
  const artista = APPLE_MOCK[selected];
  return (
    <div className="space-y-5">
      <SimulatedNotice />
      <div className="flex gap-2 flex-wrap">
        {APPLE_MOCK.map((a, i) => (
          <button key={a.artistaId} onClick={() => setSelected(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", selected === i ? "bg-[#FC3C44]/15 text-[#FC3C44] border border-[#FC3C44]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><KPI label="Ouv. Mensais" value={fmtNum(artista.monthlyListeners)} icon={Users} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Shazams" value={fmtNum(artista.shazams)} icon={Zap} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Top Tracks" value={String(artista.topTracks.filter(t => t.posicaoChart).length)} sub="no chart" icon={TrendingUp} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Cidades</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {artista.topCidades.map((c, i) => {
              const max = artista.topCidades[0].ouvintes;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{c.cidade}</span>
                      <span className="text-[10px] text-muted-foreground">{c.pais}</span>
                    </div>
                    <span className="text-xs font-mono text-[#FC3C44]">{fmtNum(c.ouvintes)}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#FC3C44]/50 rounded-full" style={{ width: `${(c.ouvintes / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ouvintes Mensais — 6 meses</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={artista.evolution} color="bg-[#FC3C44]/60" />
            <div className="mt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{fmtNum(artista.evolution[0].value)}</span>
              <span className="text-[#FC3C44] font-semibold">{fmtNum(artista.evolution[artista.evolution.length - 1].value)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Top Tracks com chart position */}
      {artista.topTracks.some(t => t.posicaoChart) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Tracks em Charts</CardTitle></CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-3">
            {artista.topTracks.filter(t => t.posicaoChart).map((t, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#FC3C44]/20 bg-[#FC3C44]/5">
                <span className="text-lg font-black text-[#FC3C44] font-mono">#{t.posicaoChart}</span>
                <span className="text-xs font-medium">{t.titulo}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Meta Ads Panel ───────────────────────────────────────────────────────────

const STATUS_COLORS = {
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
        <Card><CardContent className="p-4"><KPI label="Investimento" value={formatCurrency(d.mes.spend)} icon={TrendingUp} sub={`CPM R$ ${d.mes.cpm.toFixed(2)}`} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Campanhas Ativas</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {d.campanhas.map((c, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-semibold leading-tight">{c.nome}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.artista} · {c.objetivo}</p>
                  </div>
                  <Badge className={cn("text-[9px] shrink-0 border", STATUS_COLORS[c.status])} variant="outline">{c.status}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div><p className="text-muted-foreground">Impressões</p><p className="font-mono font-semibold">{fmtNum(c.impressoes)}</p></div>
                  <div><p className="text-muted-foreground">Cliques</p><p className="font-mono font-semibold">{fmtNum(c.cliques)}</p></div>
                  <div><p className="text-muted-foreground">CTR</p><p className="font-mono font-semibold">{c.ctr}%</p></div>
                  <div><p className="text-muted-foreground">Invest.</p><p className="font-mono font-semibold">{formatCurrency(c.spend)}</p></div>
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
        <Card><CardContent className="p-4"><KPI label="Conversões" value={fmtNum(d.mes.conversoes)} icon={TrendingUp} sub={`Custo ${formatCurrency(d.mes.custoConversao)}`} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Investimento" value={formatCurrency(d.mes.spend)} icon={BarChart2} sub={`CPC R$ ${d.mes.cpc.toFixed(2)}`} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Campanhas</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {d.campanhas.map((c, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-semibold leading-tight">{c.nome}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.tipo}</p>
                  </div>
                  <Badge className={cn("text-[9px] shrink-0 border", STATUS_COLORS[c.status])} variant="outline">{c.status}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div><p className="text-muted-foreground">Impressões</p><p className="font-mono font-semibold">{fmtNum(c.impressoes)}</p></div>
                  <div><p className="text-muted-foreground">Cliques</p><p className="font-mono font-semibold">{fmtNum(c.cliques)}</p></div>
                  <div><p className="text-muted-foreground">Conversões</p><p className="font-mono font-semibold">{fmtNum(c.conversoes)}</p></div>
                  <div><p className="text-muted-foreground">Invest.</p><p className="font-mono font-semibold">{formatCurrency(c.spend)}</p></div>
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

// ─── Instagram Panel ──────────────────────────────────────────────────────────

const TIPO_LABELS = { foto: "Foto", reel: "Reel", carrossel: "Carrossel" };

function InstagramPanel() {
  const [selected, setSelected] = useState(0);
  const artista = INSTAGRAM_MOCK[selected];
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
        <Card><CardContent className="p-4"><KPI label="Impressões/Mês" value={fmtNum(artista.impressoesMes)} icon={TrendingUp} /></CardContent></Card>
        <Card><CardContent className="p-4"><KPI label="Engajamento" value={`${artista.engagementRate}%`} icon={Heart} sub={`${artista.reelsMes} Reels/mês`} /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Posts do Mês</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {artista.topPosts.map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium leading-tight flex-1">{p.descricao}</p>
                  <Badge variant="outline" className="text-[9px] shrink-0">{TIPO_LABELS[p.tipo]}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div><p className="text-muted-foreground">Curtidas</p><p className="font-mono font-semibold text-[#E1306C]">{fmtNum(p.curtidas)}</p></div>
                  <div><p className="text-muted-foreground">Comentários</p><p className="font-mono font-semibold">{fmtNum(p.comentarios)}</p></div>
                  <div><p className="text-muted-foreground">Alcance</p><p className="font-mono font-semibold">{fmtNum(p.alcance)}</p></div>
                </div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const PANELS: Record<PlatformId, () => React.ReactElement> = {
  overview:  OverviewPanel,
  spotify:   SpotifyPanel,
  youtube:   YouTubePanel,
  deezer:    DeezerPanel,
  apple:     AppleMusicPanel,
  meta:      MetaAdsPanel,
  google:    GoogleAdsPanel,
  instagram: InstagramPanel,
};

export default function Analytics() {
  const [active, setActive] = useState<PlatformId>("overview");
  const Panel = PANELS[active];

  return (
    <MainLayout
      title="Analytics"
      description="Métricas de streaming e campanhas digitais — leitura de dados externos"
      actions={
        <Badge variant="outline" className="text-[10px] px-2 py-1 text-muted-foreground border-muted">
          Somente leitura
        </Badge>
      }
    >
      <div className="space-y-5">
        {/* Platform tabs */}
        <div className="flex gap-1 flex-wrap border-b border-border pb-3">
          {PLATFORMS.map(p => (
            <PlatformTab key={p.id} p={p} active={active === p.id} onClick={() => setActive(p.id)} />
          ))}
        </div>

        {/* Active panel */}
        <Panel />
      </div>
    </MainLayout>
  );
}
