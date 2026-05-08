import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  BarChart2, RefreshCw, TrendingUp, TrendingDown, Music,
  Globe, Users, Heart, ListMusic, ArrowUpRight, ArrowDownRight,
  Headphones, DollarSign
} from "lucide-react";
import {
  MOCK_DSP_STREAMS,
  MOCK_DSP_REVENUE,
  MOCK_PLATFORM_ANALYTICS,
  MOCK_PLAYLISTS,
  MOCK_TIKTOK_ANALYTICS,
  MOCK_AUDIENCE,
} from "../services/mock-data";
import type { DSPPlatform } from "../types";

type Tab = "streaming" | "playlists" | "tiktok" | "audience" | "revenue" | "territories";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

const PLATFORM_LABEL: Record<DSPPlatform, { label: string; color: string }> = {
  spotify:      { label: "Spotify",      color: "bg-green-500/15 text-green-600 border-green-400/30" },
  apple_music:  { label: "Apple Music",  color: "bg-rose-500/15 text-rose-600 border-rose-400/30" },
  youtube_music:{ label: "YouTube Music",color: "bg-red-500/15 text-red-600 border-red-400/30" },
  tidal:        { label: "TIDAL",        color: "bg-blue-500/15 text-blue-600 border-blue-400/30" },
  deezer:       { label: "Deezer",       color: "bg-purple-500/15 text-purple-600 border-purple-400/30" },
  beatport:     { label: "Beatport",     color: "bg-orange-500/15 text-orange-600 border-orange-400/30" },
  amazon_music: { label: "Amazon Music", color: "bg-yellow-500/15 text-yellow-600 border-yellow-400/30" },
  tiktok:       { label: "TikTok",       color: "bg-pink-500/15 text-pink-600 border-pink-400/30" },
};

const REVENUE_STATUS: Record<string, string> = {
  pago:         "bg-success/15 text-success border-success/30",
  pendente:     "bg-warning/15 text-warning border-warning/30",
  processando:  "bg-primary/15 text-primary border-primary/30",
};

const totalStreams  = MOCK_DSP_STREAMS.reduce((s, d) => s + d.streams, 0);
const totalRevUSD   = MOCK_DSP_REVENUE.reduce((s, d) => s + d.revenue_usd, 0);
const totalListeners = MOCK_PLATFORM_ANALYTICS.reduce((s, p) => s + p.monthly_listeners, 0);
const totalSaves    = MOCK_PLATFORM_ANALYTICS.reduce((s, p) => s + p.saves, 0);
const playlistReach = MOCK_PLATFORM_ANALYTICS.reduce((s, p) => s + p.playlist_reach, 0);
const avgGrowth     = MOCK_PLATFORM_ANALYTICS.reduce((s, p) => s + p.growth_pct, 0) / MOCK_PLATFORM_ANALYTICS.length;

export default function DSPAnalytics() {
  const [activeTab, setActiveTab] = useState<Tab>("streaming");

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "streaming",   label: "Streaming",         icon: <Headphones className="h-4 w-4" /> },
    { key: "playlists",   label: "Playlists",          icon: <ListMusic className="h-4 w-4" /> },
    { key: "tiktok",      label: "TikTok Analytics",  icon: <TrendingUp className="h-4 w-4" /> },
    { key: "audience",    label: "Audience",           icon: <Users className="h-4 w-4" /> },
    { key: "revenue",     label: "Revenue",            icon: <DollarSign className="h-4 w-4" /> },
    { key: "territories", label: "Territories",        icon: <Globe className="h-4 w-4" /> },
  ];

  return (
    <MainLayout title="DSP Analytics" description="Streams, receita e audiência em plataformas digitais de música">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">DSP Analytics</h1>
              <p className="text-xs text-muted-foreground">Spotify · Apple Music · YouTube Music · TIDAL · Deezer · Beatport</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />Sincronizar
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Streams",          value: fmtNum(totalStreams),   sub: "este mês",         icon: <Headphones className="h-4 w-4" />, trend: +14.2 },
            { label: "Revenue",          value: fmtUSD(totalRevUSD),    sub: "total DSPs",       icon: <DollarSign className="h-4 w-4" />, trend: +9.8 },
            { label: "Monthly Listeners",value: fmtNum(totalListeners), sub: "ouvintes únicos",  icon: <Users className="h-4 w-4" />,     trend: +7.1 },
            { label: "Saves",            value: fmtNum(totalSaves),     sub: "saves totais",     icon: <Heart className="h-4 w-4" />,     trend: +11.4 },
            { label: "Playlist Reach",   value: fmtNum(playlistReach),  sub: "playlists ativas", icon: <ListMusic className="h-4 w-4" />, trend: +3.2 },
            { label: "Avg. Growth",      value: fmtPct(avgGrowth),      sub: "crescimento médio",icon: <TrendingUp className="h-4 w-4" />,trend: +2.6 },
          ].map(kpi => (
            <Card key={kpi.label} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground leading-tight uppercase tracking-wide">{kpi.label}</span>
                  <div className="p-1 bg-primary/10 rounded text-primary flex-shrink-0">{kpi.icon}</div>
                </div>
                <p className="text-xl font-bold tabular-nums leading-none">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                <div className={`flex items-center gap-1 text-xs font-medium mt-1.5 ${kpi.trend >= 0 ? "text-success" : "text-destructive"}`}>
                  {kpi.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {fmtPct(kpi.trend)} <span className="text-muted-foreground font-normal">vs. mês anterior</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform summary row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {MOCK_PLATFORM_ANALYTICS.map(p => {
            const cfg = PLATFORM_LABEL[p.plataforma];
            return (
              <Card key={p.plataforma} className="border-border/60">
                <CardContent className="p-3">
                  <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border mb-2 ${cfg.color}`}>{cfg.label}</span>
                  <p className="text-base font-bold tabular-nums">{fmtNum(p.streams_total)}</p>
                  <p className="text-xs text-muted-foreground">streams</p>
                  <div className={`flex items-center gap-0.5 text-xs font-medium mt-1 ${p.growth_pct >= 0 ? "text-success" : "text-destructive"}`}>
                    {p.growth_pct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {fmtPct(p.growth_pct)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap border-b border-border/60 -mb-5">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="pt-0">

          {/* ── Streaming ── */}
          {activeTab === "streaming" && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Streams por Música & Plataforma</CardTitle>
                <CardDescription className="text-xs">Performance de catálogo em DSPs — período atual</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Música / Artista</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plataforma</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Streams</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Saves</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Skip Rate</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Completion</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">País</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {MOCK_DSP_STREAMS.map(s => {
                        const cfg = PLATFORM_LABEL[s.plataforma];
                        return (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-semibold">{s.obra_titulo}</p>
                              <p className="text-xs text-muted-foreground">{s.artista}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border ${cfg.color}`}>{cfg.label}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium tabular-nums">{fmtNum(s.streams)}</td>
                            <td className="py-3 px-4 text-right tabular-nums text-muted-foreground hidden md:table-cell">{fmtNum(s.saves)}</td>
                            <td className="py-3 px-4 text-right text-muted-foreground hidden lg:table-cell">
                              <span className={s.skip_rate > 0.18 ? "text-destructive" : "text-success"}>{(s.skip_rate * 100).toFixed(0)}%</span>
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground hidden lg:table-cell">
                              <span className={s.completion_rate > 0.70 ? "text-success" : "text-warning"}>{(s.completion_rate * 100).toFixed(0)}%</span>
                            </td>
                            <td className="py-3 px-4 text-right text-xs text-muted-foreground hidden md:table-cell">{s.pais}</td>
                            <td className="py-3 px-4 text-right font-medium tabular-nums">{fmtUSD(s.revenue_usd)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Playlists ── */}
          {activeTab === "playlists" && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Playlists</CardTitle>
                <CardDescription className="text-xs">Playlists que incluem músicas do catálogo</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Playlist</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plataforma</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Seguidores</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Músicas</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Tipo</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Streams Gerados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {MOCK_PLAYLISTS.map(pl => {
                        const cfg = PLATFORM_LABEL[pl.plataforma];
                        return (
                          <tr key={pl.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-semibold">{pl.nome}</p>
                              <p className="text-xs text-muted-foreground">{pl.data_inclusao}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border ${cfg.color}`}>{cfg.label}</span>
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">{fmtNum(pl.seguidores)}</td>
                            <td className="py-3 px-4 hidden lg:table-cell text-xs text-muted-foreground">{pl.obras_incluidas.join(", ")}</td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <span className={`text-xs px-2 py-0.5 rounded border ${pl.editorial ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
                                {pl.editorial ? "Editorial" : "Usuário"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium tabular-nums">{fmtNum(pl.streams_gerados)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── TikTok ── */}
          {activeTab === "tiktok" && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">TikTok Analytics</CardTitle>
                <CardDescription className="text-xs">Performance de músicas em vídeos do TikTok</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Música / Artista</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vídeos</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Views</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Likes</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Shares</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Uso Comercial</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Crescimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {MOCK_TIKTOK_ANALYTICS.map(tt => (
                        <tr key={tt.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold">{tt.obra_titulo}</p>
                            <p className="text-xs text-muted-foreground">{tt.artista}</p>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">{fmtNum(tt.videos_criados)}</td>
                          <td className="py-3 px-4 text-right font-medium tabular-nums">{fmtNum(tt.views_total)}</td>
                          <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">{fmtNum(tt.likes_total)}</td>
                          <td className="py-3 px-4 text-right tabular-nums hidden lg:table-cell">{fmtNum(tt.shares_total)}</td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span className={`text-xs px-2 py-0.5 rounded border ${tt.uso_comercial ? "bg-warning/15 text-warning border-warning/30" : "bg-muted text-muted-foreground border-border"}`}>
                              {tt.uso_comercial ? "Comercial" : "Orgânico"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-success font-semibold flex items-center justify-end gap-0.5">
                              <ArrowUpRight className="h-3.5 w-3.5" />{fmtPct(tt.crescimento_semanal_pct)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Audience ── */}
          {activeTab === "audience" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {MOCK_AUDIENCE.map(a => {
                const cfg = PLATFORM_LABEL[a.plataforma];
                return (
                  <Card key={a.plataforma} className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${cfg.color}`}>{cfg.label}</span>
                        Audience
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Mercados</p>
                        <div className="space-y-2">
                          {a.paises.map(p => (
                            <div key={p.codigo} className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground w-6 flex-shrink-0">{p.codigo}</span>
                              <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
                                <div className="bg-primary rounded-full h-2" style={{ width: `${p.pct}%` }} />
                              </div>
                              <span className="text-xs font-medium w-10 text-right tabular-nums">{p.pct}%</span>
                              <span className="text-xs text-muted-foreground w-20 text-right tabular-nums hidden sm:block">{fmtNum(p.streams)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Faixa Etária</p>
                        <div className="space-y-1.5">
                          {a.faixa_etaria.map(f => (
                            <div key={f.faixa} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-12 flex-shrink-0">{f.faixa}</span>
                              <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
                                <div className="bg-primary/70 rounded-full h-2" style={{ width: `${f.pct}%` }} />
                              </div>
                              <span className="text-xs font-medium w-8 text-right tabular-nums">{f.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gênero</p>
                        <div className="flex items-center gap-3">
                          {[
                            { label: "Masculino", pct: a.genero.masculino, color: "bg-blue-500" },
                            { label: "Feminino", pct: a.genero.feminino, color: "bg-pink-500" },
                            { label: "Outro", pct: a.genero.outro, color: "bg-muted" },
                          ].map(g => (
                            <div key={g.label} className="flex items-center gap-1.5 text-xs">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${g.color}`} />
                              <span className="text-muted-foreground">{g.label}</span>
                              <span className="font-semibold">{g.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Revenue ── */}
          {activeTab === "revenue" && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Revenue por Plataforma</CardTitle>
                <CardDescription className="text-xs">Royalties de streaming — histórico e status de pagamento</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plataforma</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Período</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Streams</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue USD</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Revenue BRL</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Taxa / Stream</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {MOCK_DSP_REVENUE.map(r => {
                        const cfg = PLATFORM_LABEL[r.plataforma];
                        return (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border ${cfg.color}`}>{cfg.label}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">{r.periodo}</td>
                            <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">{fmtNum(r.streams)}</td>
                            <td className="py-3 px-4 text-right font-semibold tabular-nums">{fmtUSD(r.revenue_usd)}</td>
                            <td className="py-3 px-4 text-right tabular-nums hidden lg:table-cell">{fmtBRL(r.revenue_brl)}</td>
                            <td className="py-3 px-4 text-right text-xs font-mono text-muted-foreground hidden xl:table-cell">${r.royalty_rate.toFixed(4)}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md border ${REVENUE_STATUS[r.status] ?? ""}`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Territories ── */}
          {activeTab === "territories" && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Top Mercados por Plataforma</CardTitle>
                <CardDescription className="text-xs">Distribuição geográfica de streams por DSP</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MOCK_PLATFORM_ANALYTICS.map(p => {
                    const cfg = PLATFORM_LABEL[p.plataforma];
                    return (
                      <div key={p.plataforma} className="border border-border/60 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{fmtNum(p.streams_total)} streams</span>
                        </div>
                        <div className="space-y-1.5">
                          {p.top_markets.map((m, i) => (
                            <div key={m} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4 flex-shrink-0 font-semibold">{i + 1}</span>
                              <span className="text-xs font-mono font-semibold bg-muted/50 px-1.5 py-0.5 rounded">{m}</span>
                              <div className="flex-1 bg-muted/40 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary/60 rounded-full h-1.5" style={{ width: `${100 - i * 25}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </MainLayout>
  );
}
