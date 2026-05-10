import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface MonthPickerFieldProps {
  value: string;
  onChange: (yyyyMm: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export function MonthPickerField({
  value,
  onChange,
  disabled,
  placeholder = "Selecione o mês",
  className,
  "data-testid": testId,
}: MonthPickerFieldProps) {
  const [open, setOpen] = useState(false);

  const parsed = value && /^\d{4}-\d{2}$/.test(value) ? value : null;
  const selYear  = parsed ? parseInt(parsed.split("-")[0]) : null;
  const selMonth = parsed ? parseInt(parsed.split("-")[1]) - 1 : null; // 0-indexed

  const [navYear, setNavYear] = useState<number>(selYear ?? new Date().getFullYear());

  const displayLabel = parsed
    ? `${MONTHS_PT[selMonth!]} ${selYear}`
    : null;

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(o) => {
        if (disabled) return;
        setOpen(o);
        if (o) setNavYear(selYear ?? new Date().getFullYear());
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2",
            "text-sm font-normal",
            "transition-colors duration-150",
            "hover:border-border",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          {displayLabel ? (
            <span className="text-foreground">{displayLabel}</span>
          ) : (
            <span className="text-muted-foreground/70">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[264px] p-3" align="start">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3 h-9">
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-md h-7 w-7",
              "border-0 bg-transparent text-muted-foreground",
              "transition-colors duration-150",
              "hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setNavYear((y) => y - 1)}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground tabular-nums">{navYear}</span>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-md h-7 w-7",
              "border-0 bg-transparent text-muted-foreground",
              "transition-colors duration-150",
              "hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setNavYear((y) => y + 1)}
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_PT.map((m, i) => {
            const isSelected = navYear === selYear && i === selMonth;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const mm = String(i + 1).padStart(2, "0");
                  onChange(`${navYear}-${mm}`);
                  setOpen(false);
                }}
                className={cn(
                  "inline-flex items-center justify-center rounded-md h-8 px-1",
                  "text-xs font-medium",
                  "transition-colors duration-100",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
