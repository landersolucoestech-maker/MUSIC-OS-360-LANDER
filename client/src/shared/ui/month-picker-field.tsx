import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
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
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "w-full justify-start text-left font-normal bg-background border-border text-sm h-9",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
          {displayLabel ? (
            <span>{displayLabel}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setNavYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{navYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setNavYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_PT.map((m, i) => {
            const isSelected = navYear === selYear && i === selMonth;
            return (
              <Button
                key={i}
                type="button"
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  const mm = String(i + 1).padStart(2, "0");
                  onChange(`${navYear}-${mm}`);
                  setOpen(false);
                }}
              >
                {m.slice(0, 3)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
