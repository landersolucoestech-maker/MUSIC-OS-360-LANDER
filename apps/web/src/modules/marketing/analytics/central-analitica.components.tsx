/**
 * Central Analítica — presentational components.
 *
 * Pure UI: every piece receives data + callbacks and renders. Loading, empty
 * and error states are handled here so the page container stays declarative.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Layers, TrendingUp } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import {
  MarketingDataTable,
  MarketingKpiCard,
  MarketingSectionCard,
  type Column,
} from "../components";
import { formatCompact } from "../utils/marketing-format";
import { PLATFORM_META, formatMetric } from "./central-analitica.format";
import type {
  ArtistPerformance,
  BreakdownRow,
  CampaignPerformanceVM,
  ContentPerformance,
  MetricCardVM,
  MusicPerformance,
  PlatformBlock,
  PlatformId,
  TrendPoint,
} from "./central-analitica.types";

// ---------------------------------------------------------------------------
// Single data alert (no duplication anywhere else)
// ---------------------------------------------------------------------------

export function SimulatedDataAlert() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-xs leading-relaxed">
        <span className="font-semibold">Dados simulados.</span> As métricas desta página são
        demonstrativas. Os números reais (YouTube, TikTok, Instagram, Spotify, Google e
        distribuidoras) dependem das integrações. Configure-as em{" "}
        <Link to="/admin/configuracoes" className="font-medium underline underline-offset-2">
          Configurações → Integrações
        </Link>
        .
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented control (accessible — not colour-only)
// ---------------------------------------------------------------------------

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Executive KPIs
// ---------------------------------------------------------------------------

export function ExecutiveKpiGrid({ kpis, isLoading }: { kpis: MetricCardVM[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <MarketingKpiCard
          key={kpi.id}
          title={kpi.label}
          value={formatMetric(kpi.value, kpi.format)}
          icon={kpi.icon}
          accent={kpi.accent}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform indicator
// ---------------------------------------------------------------------------

export function PlatformBadge({ platform }: { platform: PlatformId }) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <Icon className={cn("h-3.5 w-3.5", meta.colorClass)} />
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Platform analytics panel
// ---------------------------------------------------------------------------

const LAYER_LABEL_CLASS: Record<string, string> = {
  paid: "text-amber-600",
  organic: "text-emerald-600",
};

export function PlatformAnalyticsPanel({
  platform,
  block,
  platforms,
  onSelectPlatform,
}: {
  platform: PlatformId;
  block: PlatformBlock | null;
  platforms: PlatformBlock[];
  onSelectPlatform: (id: PlatformId) => void;
}) {
  if (platform === "overview") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => {
          const headline = p.groups[0]?.metrics.slice(0, 3) ?? [];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlatform(p.id)}
              className="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlatformBadge platform={p.id} />
              <div className="mt-2 space-y-1">
                {headline.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-medium tabular-nums">{formatMetric(m.value, m.format)}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (!block) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Plataforma sem dados disponíveis.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{block.description}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {block.groups.map((group) => (
          <div key={group.id} className="rounded-lg border border-border p-3">
            <p className={cn("mb-2 text-[11px] font-semibold tracking-wide", LAYER_LABEL_CLASS[group.layer] ?? "text-muted-foreground")}>
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {group.metrics.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{m.label}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatMetric(m.value, m.format)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend chart (single metric per view → no incompatible scales)
// ---------------------------------------------------------------------------

type TrendMetric = "reach" | "engagement" | "conversions" | "streams";

const TREND_METRICS: { value: TrendMetric; label: string; color: string }[] = [
  { value: "reach", label: "Alcance", color: "#6366f1" },
  { value: "engagement", label: "Engajamento", color: "#10b981" },
  { value: "conversions", label: "Conversões", color: "#f59e0b" },
  { value: "streams", label: "Streams (simulado)", color: "#22c55e" },
];

export function TrendChart({ data, isLoading }: { data: TrendPoint[]; isLoading: boolean }) {
  const [metric, setMetric] = useState<TrendMetric>("reach");
  const current = TREND_METRICS.find((m) => m.value === metric) ?? TREND_METRICS[0];

  const action = (
    <Select value={metric} onValueChange={(v) => setMetric((TREND_METRICS.find((m) => m.value === v)?.value) ?? "reach")}>
      <SelectTrigger className="h-8 w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TREND_METRICS.map((m) => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <MarketingSectionCard
      title="Evolução de performance"
      icon={TrendingUp}
      description="Série temporal por métrica selecionada"
      action={action}
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : data.length === 0 ? (
        <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Sem dados de evolução no período.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" tickFormatter={(v: number) => formatCompact(v)} width={48} />
              <Tooltip formatter={(value) => formatCompact(Number(value))} labelClassName="text-foreground" />
              <Area type="monotone" dataKey={current.value} name={current.label} stroke={current.color} fill={current.color} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </MarketingSectionCard>
  );
}

// ---------------------------------------------------------------------------
// Content ranking
// ---------------------------------------------------------------------------

export function ContentRanking({ items, isLoading }: { items: ContentPerformance[]; isLoading: boolean }) {
  return (
    <MarketingSectionCard title="Top conteúdos" icon={Layers} description="Ranking por desempenho, conforme a plataforma selecionada">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum conteúdo para esta plataforma.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <PlatformBadge platform={item.platform} />
                  <span>·</span>
                  <span>{item.artist}</span>
                  <span>·</span>
                  <span>{item.contentType}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{formatMetric(item.metricValue, item.metricFormat)}</p>
                <p className="text-[10px] tracking-wide text-muted-foreground">{item.metricLabel}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </MarketingSectionCard>
  );
}

// ---------------------------------------------------------------------------
// Artist performance
// ---------------------------------------------------------------------------

export function ArtistPerformanceTable({ artists, isLoading }: { artists: ArtistPerformance[]; isLoading: boolean }) {
  const columns = useMemo<Column<ArtistPerformance>[]>(
    () => [
      { key: "name", header: "Artista", cell: (a) => <span className="font-medium">{a.name}</span> },
      { key: "followers", header: "Seguidores", cell: (a) => formatMetric(a.followers, "compact") },
      { key: "listeners", header: "Ouvintes", cell: (a) => formatMetric(a.listeners, "compact") },
      { key: "streams", header: "Streams", cell: (a) => formatMetric(a.streams, "compact") },
      { key: "views", header: "Views", cell: (a) => formatMetric(a.views, "compact") },
      { key: "engagement", header: "Engaj.", cell: (a) => formatMetric(a.engagement, "percent") },
      { key: "revenue", header: "Receita", cell: (a) => formatMetric(a.revenue, "currency") },
      { key: "roi", header: "ROI", cell: (a) => formatMetric(a.roi, "roi") },
      { key: "growth", header: "Cresc.", cell: (a) => formatMetric(a.growth, "percent") },
    ],
    [],
  );
  return (
    <MarketingDataTable
      title="Performance por Artista"
      description="Acompanhe audiência, engajamento, receita, ROI e crescimento por artista"
      columns={columns}
      rows={artists}
      isLoading={isLoading}
      getRowKey={(a) => a.id}
      empty={<p className="py-8 text-center text-sm text-muted-foreground">Sem dados de artistas.</p>}
    />
  );
}

// ---------------------------------------------------------------------------
// Campaign performance
// ---------------------------------------------------------------------------

export function CampaignPerformanceTable({ campaigns, isLoading }: { campaigns: CampaignPerformanceVM[]; isLoading: boolean }) {
  const columns = useMemo<Column<CampaignPerformanceVM>[]>(
    () => [
      { key: "name", header: "Campanha", cell: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-[11px] text-muted-foreground">{c.type} · {c.platform}</p>
        </div>
      ) },
      { key: "status", header: "Status", cell: (c) => <Badge variant="secondary" className="text-[10px]">{c.status}</Badge> },
      { key: "reach", header: "Alcance", cell: (c) => formatMetric(c.reach, "compact") },
      { key: "clicks", header: "Cliques", cell: (c) => formatMetric(c.clicks, "compact") },
      { key: "conversions", header: "Conversões", cell: (c) => formatMetric(c.conversions, "integer") },
      { key: "investment", header: "Investimento", cell: (c) => formatMetric(c.investment, "currency") },
      { key: "roi", header: "ROI", cell: (c) => formatMetric(c.roi, "roi") },
      { key: "roas", header: "ROAS", cell: (c) => formatMetric(c.roas, "roas") },
      { key: "ctr", header: "CTR", cell: (c) => formatMetric(c.ctr, "percent") },
      { key: "cpa", header: "CPA", cell: (c) => formatMetric(c.cpa, "currency") },
    ],
    [],
  );
  return (
    <MarketingDataTable
      title="Performance por Campanha"
      description="Acompanhe investimento, receita, ROAS, CTR e CPA por campanha"
      columns={columns}
      rows={campaigns}
      isLoading={isLoading}
      getRowKey={(c) => c.id}
      empty={<p className="py-8 text-center text-sm text-muted-foreground">Nenhuma campanha encontrada.</p>}
    />
  );
}

// ---------------------------------------------------------------------------
// Music / release performance
// ---------------------------------------------------------------------------

const MUSIC_FORMAT_LABEL: Record<string, string> = {
  single: "Single",
  ep: "EP",
  album: "Álbum",
  videoclipe: "Videoclipe",
};

export function MusicPerformanceTable({ music, isLoading }: { music: MusicPerformance[]; isLoading: boolean }) {
  const columns = useMemo<Column<MusicPerformance>[]>(
    () => [
      { key: "title", header: "Música", cell: (m) => (
        <div>
          <p className="font-medium">{m.title}</p>
          <p className="text-[11px] text-muted-foreground">{m.artist} · {MUSIC_FORMAT_LABEL[m.format] ?? m.format}</p>
        </div>
      ) },
      { key: "streams", header: "Streams", cell: (m) => formatMetric(m.streams, "compact") },
      { key: "saves", header: "Saves", cell: (m) => formatMetric(m.saves, "compact") },
      { key: "playlists", header: "Playlists", cell: (m) => formatMetric(m.playlists, "integer") },
      { key: "views", header: "Views", cell: (m) => formatMetric(m.views, "compact") },
      { key: "presaves", header: "Pré-saves", cell: (m) => formatMetric(m.presaves, "compact") },
      { key: "revenue", header: "Receita", cell: (m) => formatMetric(m.revenue, "currency") },
      { key: "growth", header: "Cresc.", cell: (m) => formatMetric(m.growth, "percent") },
    ],
    [],
  );
  return (
    <MarketingDataTable
      title="Performance por Música"
      description="Acompanhe streams, salvamentos, pré-saves, receita e crescimento por lançamento"
      columns={columns}
      rows={music}
      isLoading={isLoading}
      getRowKey={(m) => m.id}
      empty={<p className="py-8 text-center text-sm text-muted-foreground">Sem dados de músicas/lançamentos.</p>}
    />
  );
}

// ---------------------------------------------------------------------------
// Breakdown table
// ---------------------------------------------------------------------------

export function BreakdownTable({ rows, isLoading }: { rows: BreakdownRow[]; isLoading: boolean }) {
  const columns = useMemo<Column<BreakdownRow>[]>(
    () => [
      { key: "label", header: "Item", cell: (r) => <span className="font-medium">{r.label}</span> },
      { key: "reach", header: "Alcance", cell: (r) => formatMetric(r.reach, "compact") },
      { key: "impressions", header: "Impressões", cell: (r) => formatMetric(r.impressions, "compact") },
      { key: "engagement", header: "Engajamento", cell: (r) => formatMetric(r.engagement, "compact") },
      { key: "clicks", header: "Cliques", cell: (r) => formatMetric(r.clicks, "compact") },
      { key: "conversions", header: "Conversões", cell: (r) => formatMetric(r.conversions, "integer") },
      { key: "roi", header: "ROI", cell: (r) => (r.roi > 0 ? formatMetric(r.roi, "roi") : "—") },
    ],
    [],
  );
  return (
    <MarketingDataTable
      title="Performance por Dimensão"
      description="Acompanhe resultados agregados por canal, conteúdo, campanha ou público"
      columns={columns}
      rows={rows}
      isLoading={isLoading}
      getRowKey={(r) => r.key}
      empty={<p className="py-8 text-center text-sm text-muted-foreground">Sem dados para esta dimensão.</p>}
    />
  );
}

