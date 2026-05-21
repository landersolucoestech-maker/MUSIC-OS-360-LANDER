import { format } from "date-fns";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format-utils";
import type { AgendaEvent } from "@/modules/events/components/types";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  confirmado: { label: "Confirmado", className: "bg-emerald-500/10 text-emerald-300" },
  negociacao: { label: "Negociação", className: "bg-amber-500/10 text-amber-300" },
  pendente:   { label: "Pendente",   className: "bg-amber-500/10 text-amber-300" },
  agendado:   { label: "Agendado",   className: "bg-amber-500/10 text-amber-300" },
  cancelado:  { label: "Cancelado",  className: "bg-rose-500/10 text-rose-300" },
  realizado:  { label: "Realizado",  className: "bg-sky-500/10 text-sky-300" },
};

interface SchedulerEventCardProps {
  event: AgendaEvent;
  compact?: boolean;
  onClick?: (event: AgendaEvent) => void;
  onEdit?: (event: AgendaEvent) => void;
  onDelete?: (event: AgendaEvent) => void;
}

export function SchedulerEventCard({ event, compact = false, onClick, onEdit, onDelete }: SchedulerEventCardProps) {
  const status = STATUS_STYLES[event.status] ?? {
    label: event.status ? String(event.status).replace(/_/g, " ") : "Sem status",
    className: "bg-slate-500/10 text-slate-300",
  };

  const timeLabel = event.allDay
    ? "Dia inteiro"
    : `${format(event.startDate, "HH:mm")}${event.endDate ? ` — ${format(event.endDate, "HH:mm")}` : ""}`;

  const cacheLabel = event.cache != null ? formatCurrency(event.cache) : "-";

  if (compact) {
    return (
      <div
        className="group flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/70 px-3 py-2 text-sm text-foreground transition hover:border-primary/60 hover:shadow-sm"
        onClick={() => onClick?.(event)}
      >
        <div className="min-w-[52px] text-xs font-medium text-muted-foreground">{timeLabel}</div>
        <div className="min-w-0 truncate font-semibold">{event.title}</div>
        <span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-4 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
      onClick={() => onClick?.(event)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <span>{timeLabel}</span>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-border" />
            <span>{event.type ?? "Evento"}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-tight text-foreground line-clamp-2">{event.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {event.artist ? `${event.artist} • ` : ""}{event.location ?? "Local não definido"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-right">
          <Badge className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}>{status.label}</Badge>
          <div className="text-sm font-semibold text-foreground">{cacheLabel}</div>
        </div>
      </div>

      {(onEdit || onDelete) ? (
        <div className="absolute right-4 top-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-border">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit ? (
                <DropdownMenuItem onClick={(eventClick) => { eventClick.stopPropagation(); onEdit(event); }}>
                  <Pencil className="mr-2 h-4 w-4" />Editar
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <DropdownMenuItem className="text-destructive" onClick={(eventClick) => { eventClick.stopPropagation(); onDelete(event); }}>
                  <Trash2 className="mr-2 h-4 w-4" />Excluir
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}
