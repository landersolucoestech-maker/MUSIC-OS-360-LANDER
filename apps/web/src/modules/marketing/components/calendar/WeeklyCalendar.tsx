import { useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCard } from "./CalendarCard";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";

const HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"];
const DAYS_PT = ["SEG","TER","QUA","QUI","SEX","SÁB","DOM"];

function getContentDate(c: ConteudoWithRelations): Date | null {
  try {
    if (c.data_publicacao) return parseISO(c.data_publicacao);
  } catch { /* ignore */ }
  return null;
}

function getContentHour(c: ConteudoWithRelations): string | null {
  if (c.horario_publicacao) return c.horario_publicacao.slice(0, 5);
  if (c.data_publicacao && c.data_publicacao.includes("T")) return c.data_publicacao.slice(11, 16);
  return null;
}

interface WeeklyCalendarProps {
  weekStart: Date;
  conteudos: ConteudoWithRelations[];
  onEdit: (c: ConteudoWithRelations) => void;
  onDelete: (c: ConteudoWithRelations) => void;
  onSlotClick: (date: Date, hour: string) => void;
}

export function WeeklyCalendar({ weekStart, conteudos, onEdit, onDelete, onSlotClick }: WeeklyCalendarProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const allDayItems = useMemo(() =>
    conteudos.filter((c) => {
      const d = getContentDate(c);
      const h = getContentHour(c);
      return d !== null && days.some((day) => isSameDay(d, day)) && !h;
    }), [conteudos, days]);

  const timedItems = useMemo(() => {
    const map: Record<string, Record<string, ConteudoWithRelations[]>> = {};
    conteudos.forEach((c) => {
      const d = getContentDate(c);
      const h = getContentHour(c);
      if (!d || !h) return;
      const dayMatch = days.findIndex((day) => isSameDay(d, day));
      if (dayMatch === -1) return;
      const slotHour = HOURS.find((hr) => hr === h.slice(0, 5)) ??
        HOURS.find((hr) => parseInt(hr) === Math.floor(parseInt(h) / 100) * 100 / 100) ??
        HOURS.reduce((prev, curr) =>
          Math.abs(parseInt(curr) - parseInt(h.replace(":", ""))) < Math.abs(parseInt(prev) - parseInt(h.replace(":", ""))) ? curr : prev
        );
      if (!slotHour) return;
      if (!map[dayMatch]) map[dayMatch] = {};
      if (!map[dayMatch][slotHour]) map[dayMatch][slotHour] = [];
      map[dayMatch][slotHour].push(c);
    });
    return map;
  }, [conteudos, days]);

  return (
    <div className="flex flex-col min-h-0 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
      {/* Day header row */}
      <div className="grid border-b border-border/50" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="h-14 border-r border-border/30" />
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              className={`h-14 flex flex-col items-center justify-center gap-0.5 border-r border-border/30 last:border-r-0 ${today ? "bg-primary/5" : ""}`}
            >
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">{DAYS_PT[i]}</span>
              <span className={`text-sm font-bold leading-none ${today ? "text-primary" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
              <span className="text-[10px] text-muted-foreground/60 capitalize">
                {format(day, "MMM", { locale: ptBR })}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      {allDayItems.length > 0 && (
        <div className="grid border-b border-border/30" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="flex items-center justify-center px-1 border-r border-border/30 py-2">
            <span className="text-[9px] text-muted-foreground rotate-[-90deg] whitespace-nowrap font-medium tracking-widest">dia todo</span>
          </div>
          {days.map((day, i) => {
            const items = allDayItems.filter((c) => {
              const d = getContentDate(c);
              return d && isSameDay(d, day);
            });
            return (
              <div key={i} className="border-r border-border/30 last:border-r-0 p-1 min-h-[48px] flex flex-col gap-1">
                {items.map((c) => (
                  <div
                    key={c.id}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium truncate cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => onEdit(c)}
                    title={c.titulo ?? ""}
                  >
                    {c.titulo}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 340px)", minHeight: 480 }}>
        {HOURS.map((hour) => (
          <div key={hour} className="grid border-b border-border/20 last:border-b-0 min-h-[72px]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div className="flex items-start justify-end pr-3 pt-2 border-r border-border/30">
              <span className="text-[10px] font-mono text-muted-foreground/60">{hour}</span>
            </div>
            {days.map((_, dayIdx) => {
              const items = timedItems[dayIdx]?.[hour] ?? [];
              return (
                <div
                  key={dayIdx}
                  className={`border-r border-border/20 last:border-r-0 p-1 flex flex-col gap-1 cursor-pointer group/slot transition-colors hover:bg-muted/30 ${isToday(days[dayIdx]) ? "bg-primary/[0.02]" : ""}`}
                  onClick={() => { if (items.length === 0) onSlotClick(days[dayIdx], hour); }}
                >
                  {items.length > 0
                    ? items.map((c) => (
                        <CalendarCard
                          key={c.id}
                          conteudo={c}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          compact
                        />
                      ))
                    : (
                      <div className="flex-1 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity">
                        <span className="text-[10px] text-muted-foreground/40 select-none">+</span>
                      </div>
                    )
                  }
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
