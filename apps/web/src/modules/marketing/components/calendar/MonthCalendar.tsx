import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, parseISO, format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";
import { CalendarCard } from "./CalendarCard";

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface MonthCalendarProps {
  month: Date;
  conteudos: ConteudoWithRelations[];
  onEdit: (c: ConteudoWithRelations) => void;
  onDelete: (c: ConteudoWithRelations) => void;
  onSlotClick: (date: Date, hour: string) => void;
}

export function MonthCalendar({ month, conteudos, onEdit, onDelete, onSlotClick }: MonthCalendarProps) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days  = eachDayOfInterval({ start, end });

  const itemsForDay = (day: Date) =>
    conteudos.filter((c) => {
      try {
        const d = c.data_publicacao ? parseISO(c.data_publicacao) : null;
        return d ? isSameDay(d, day) : false;
      } catch {
        return false;
      }
    });

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/20">
        {days.map((day) => {
          const items    = itemsForDay(day);
          const inMonth  = isSameMonth(day, month);
          const today    = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[110px] p-1.5 group relative cursor-pointer transition-colors",
                inMonth ? "bg-card hover:bg-muted/20" : "bg-muted/10",
              )}
              onClick={() => onSlotClick(day, "09:00")}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "h-6 w-6 flex items-center justify-center rounded-full text-xs font-medium",
                    today
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40",
                  )}
                >
                  {format(day, "d")}
                </span>
                {inMonth && (
                  <Plus className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>

              {/* Content cards — show max 2, then "+N more" */}
              <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                {items.slice(0, 2).map((c) => (
                  <CalendarCard key={c.id} conteudo={c} onEdit={onEdit} onDelete={onDelete} compact />
                ))}
                {items.length > 2 && (
                  <span className="text-[10px] text-muted-foreground pl-1">
                    +{items.length - 2} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
