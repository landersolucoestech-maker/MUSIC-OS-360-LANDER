import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { CalendarCard } from "./CalendarCard";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";

const PLAT_PILL_COLOR: Record<string, string> = {
  instagram: "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300",
  tiktok:    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  youtube:   "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  facebook:  "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  twitter:   "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
  linkedin:  "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300",
};

function getDate(c: ConteudoWithRelations): string | null {
  if (c.data_publicacao) return c.data_publicacao.slice(0, 10);
  return null;
}

interface FeedViewProps {
  conteudos: ConteudoWithRelations[];
  onEdit:   (c: ConteudoWithRelations) => void;
  onDelete: (c: ConteudoWithRelations) => void;
}

interface GroupedByDate {
  date: string;
  label: string;
  items: ConteudoWithRelations[];
}

type SortMode = "data" | "plataforma" | "status";

export function FeedView({ conteudos, onEdit, onDelete }: FeedViewProps) {
  const [sortMode, setSortMode] = useState<SortMode>("data");

  const grouped = useMemo<GroupedByDate[]>(() => {
    if (sortMode !== "data") return [];
    const map = new Map<string, ConteudoWithRelations[]>();
    conteudos.forEach((c) => {
      const d = getDate(c) ?? "sem-data";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(c);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a === "sem-data" ? 1 : b === "sem-data" ? -1 : a.localeCompare(b)))
      .map(([date, items]) => ({
        date,
        label: date === "sem-data"
          ? "Sem data"
          : format(new Date(date + "T00:00"), "EEEE, d 'de' MMMM yyyy", { locale: ptBR }),
        items,
      }));
  }, [conteudos, sortMode]);

  const sortedByPlatOrStatus = useMemo(() => {
    if (sortMode === "data") return [];
    if (sortMode === "plataforma") {
      return [...conteudos].sort((a, b) => {
        const pa = Array.isArray(a.plataforma) ? a.plataforma[0] : a.plataforma ?? "";
        const pb = Array.isArray(b.plataforma) ? b.plataforma[0] : b.plataforma ?? "";
        return (pa as string).localeCompare(pb as string);
      });
    }
    return [...conteudos].sort((a, b) =>
      (a.status ?? "").localeCompare(b.status ?? ""),
    );
  }, [conteudos, sortMode]);

  if (conteudos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <LayoutGrid className="h-12 w-12 opacity-20" />
        <p className="text-sm">Nenhum conteúdo encontrado</p>
      </div>
    );
  }

  const sorts: { value: SortMode; label: string }[] = [
    { value: "data",       label: "Por data" },
    { value: "plataforma", label: "Por plataforma" },
    { value: "status",     label: "Por status" },
  ];

  return (
    <div className="space-y-6">
      {/* Sort tabs */}
      <div className="flex items-center gap-1 border-b border-border/40 pb-0">
        {sorts.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSortMode(s.value)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px",
              sortMode === s.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {conteudos.length} item{conteudos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Date-grouped view */}
      {sortMode === "data" && grouped.map((group) => (
        <div key={group.date} className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-muted-foreground capitalize whitespace-nowrap">
              {group.label}
            </h3>
            <div className="flex-1 h-px bg-border/40" />
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              group.items.length > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}>
              {group.items.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-3">
            {group.items.map((c) => (
              <CalendarCard key={c.id} conteudo={c} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}

      {/* Flat sorted view (platform / status) */}
      {sortMode !== "data" && (
        <div className="grid grid-cols-3 gap-3">
          {sortedByPlatOrStatus.map((c) => {
            const plat = Array.isArray(c.plataforma) ? c.plataforma[0] : c.plataforma ?? null;
            const pill = plat ? (PLAT_PILL_COLOR[plat] ?? "") : "";
            return (
              <div key={c.id} className="flex flex-col gap-0">
                {sortMode === "plataforma" && plat && (
                  <span className={cn("self-start text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-t-md mb-0", pill)}>
                    {plat}
                  </span>
                )}
                {sortMode === "status" && (
                  <span className="self-start text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-t-md mb-0 bg-muted text-muted-foreground">
                    {c.status ?? "rascunho"}
                  </span>
                )}
                <CalendarCard conteudo={c} onEdit={onEdit} onDelete={onDelete} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
