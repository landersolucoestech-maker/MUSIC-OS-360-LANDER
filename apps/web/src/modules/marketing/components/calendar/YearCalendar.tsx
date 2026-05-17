import {
  startOfYear, eachMonthOfInterval, endOfYear,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, parseISO, format, getYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";

interface YearCalendarProps {
  year: Date;
  conteudos: ConteudoWithRelations[];
  onMonthClick: (month: Date) => void;
}

function MiniMonth({
  month, conteudos, onClick,
}: { month: Date; conteudos: ConteudoWithRelations[]; onClick: () => void }) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days  = eachDayOfInterval({ start, end });

  const hasContent = (day: Date) =>
    conteudos.some((c) => {
      try {
        const d = c.data_publicacao ? parseISO(c.data_publicacao) : null;
        return d ? isSameDay(d, day) : false;
      } catch {
        return false;
      }
    });

  return (
    <div
      className="rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer p-3 group"
      onClick={onClick}
    >
      {/* Month name */}
      <p className="text-xs font-semibold text-foreground capitalize mb-2 group-hover:text-primary transition-colors">
        {format(month, "MMMM", { locale: ptBR })}
      </p>

      {/* Mini weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground/50 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const today   = isSameDay(day, new Date());
          const has     = inMonth && hasContent(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "h-5 w-full flex items-center justify-center rounded-sm relative text-[10px]",
                !inMonth && "opacity-0 pointer-events-none",
                today && "bg-primary text-primary-foreground font-semibold",
                !today && inMonth && has && "bg-primary/15 text-primary font-medium",
                !today && inMonth && !has && "text-muted-foreground/60 hover:bg-muted/40",
              )}
            >
              {inMonth && format(day, "d")}
            </div>
          );
        })}
      </div>

      {/* Content count */}
      {(() => {
        const count = conteudos.filter((c) => {
          try {
            const d = c.data_publicacao ? parseISO(c.data_publicacao) : null;
            return d ? isSameMonth(d, month) : false;
          } catch { return false; }
        }).length;
        return count > 0 ? (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {count} {count === 1 ? "publicação" : "publicações"}
          </p>
        ) : null;
      })()}
    </div>
  );
}

export function YearCalendar({ year, conteudos, onMonthClick }: YearCalendarProps) {
  const months = eachMonthOfInterval({
    start: startOfYear(year),
    end: endOfYear(year),
  });

  return (
    <div>
      <p className="text-sm font-semibold text-muted-foreground mb-4">{getYear(year)}</p>
      <div className="grid grid-cols-4 gap-4">
        {months.map((month) => (
          <MiniMonth
            key={month.toISOString()}
            month={month}
            conteudos={conteudos}
            onClick={() => onMonthClick(month)}
          />
        ))}
      </div>
    </div>
  );
}
