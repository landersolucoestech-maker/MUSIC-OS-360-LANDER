import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Users,
  FileText,
  DollarSign,
  Music,
  Upload,
  Bell,
  Activity,
  Search,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, startOfDay, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { useActivityLogs, type ActivityLogEntry } from "../hooks/useActivityLogs";

// ─── Config ───────────────────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  artist:      { icon: Users,      label: "Artista",     color: "text-primary bg-primary/10 border-primary/20" },
  contract:    { icon: FileText,   label: "Contrato",    color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30" },
  transaction: { icon: DollarSign, label: "Financeiro",  color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30" },
  invoice:     { icon: DollarSign, label: "Invoice",     color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30" },
  release:     { icon: Upload,     label: "Lançamento",  color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/30" },
  work:        { icon: Music,      label: "Obra",        color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30" },
  phonogram:   { icon: Music,      label: "Fonograma",   color: "text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-950/30" },
};

const ACTION_LABEL: Record<string, string> = {
  created:                       "Criado",
  updated:                       "Atualizado",
  deleted:                       "Removido",
  signed:                        "Assinado",
  paid:                          "Pago",
  overdue:                       "Vencido",
  status_changed:                "Status alterado",
  onboarding_started:            "Onboarding iniciado",
  distribution_setup_requested:  "Distribuição solicitada",
  expiring_soon:                 "Vencendo em breve",
  "distributor.status_updated":  "Distribuição atualizada",
  "society.status_updated":      "Dados externos atualizados",
  "external_data.sync_requested":"Sync externo solicitado",
};

function dayLabel(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

function groupByDay(logs: ActivityLogEntry[]) {
  const map = new Map<string, ActivityLogEntry[]>();
  for (const log of logs) {
    try {
      const day = startOfDay(parseISO(log.created_at)).toISOString();
      const arr = map.get(day) ?? [];
      arr.push(log);
      map.set(day, arr);
    } catch { /* skip */ }
  }
  return Array.from(map.entries())
    .map(([day, entries]) => ({ day, date: new Date(day), entries }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ─── Log Entry ────────────────────────────────────────────────────────────────

function LogEntry({ log }: { log: ActivityLogEntry }) {
  const cfg = ENTITY_CONFIG[log.entity_type] ?? { icon: Activity, label: log.entity_type, color: "text-muted-foreground bg-muted/50 border-border" };
  const Icon = cfg.icon;
  const actionLabel = ACTION_LABEL[log.action] ?? log.action;

  let relTime = "";
  try {
    relTime = formatDistanceToNow(parseISO(log.created_at), { addSuffix: true, locale: ptBR });
  } catch { /* noop */ }

  return (
    <div className="flex gap-3 py-3 group">
      <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5", cfg.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{actionLabel}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.color)}>
            {cfg.label}
          </Badge>
          {log.user_name && (
            <span className="text-xs text-muted-foreground">por {log.user_name}</span>
          )}
        </div>
        {log.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-muted-foreground/60">{log.entity_id}</span>
          <span className="text-[10px] text-muted-foreground/60">·</span>
          <span className="text-[10px] text-muted-foreground/60">{relTime}</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 mt-0.5 hidden group-hover:inline">
        {(() => { try { return format(parseISO(log.created_at), "HH:mm"); } catch { return ""; } })()}
      </span>
    </div>
  );
}

// ─── Activity Timeline Page ───────────────────────────────────────────────────

const ENTITY_TYPES = ["artist", "contract", "transaction", "invoice", "release", "work", "phonogram"];

export default function ActivityTimeline() {
  const [entityFilter, setEntityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { logs, isLoading, refetch: _r } = useActivityLogs(
    entityFilter !== "all" ? { entity_type: entityFilter, limit: 100 } : { limit: 100 },
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q),
    );
  }, [logs, search]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <MainLayout
      title="Timeline de Atividades"
      description="Histórico persistente de todas as ações no sistema"
      actions={
        <Button variant="outline" size="sm" onClick={() => void _r()} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar ação ou entidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ENTITY_CONFIG[t]?.label ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="font-mono text-xs ml-auto">
            {filtered.length} {filtered.length === 1 ? "entrada" : "entradas"}
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-muted/60 border border-border p-4 mb-4">
                <BookOpen className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">Nenhuma atividade registrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                As ações no sistema aparecerão aqui automaticamente
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ day, date, entries }) => (
              <div key={day}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {dayLabel(date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="outline" className="font-mono text-[10px]">{entries.length}</Badge>
                </div>
                <Card>
                  <CardContent className="p-0 divide-y divide-border/60">
                    {entries.map((log) => (
                      <div key={log.id} className="px-4">
                        <LogEntry log={log} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
