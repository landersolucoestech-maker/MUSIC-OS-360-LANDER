import { format } from "date-fns";
import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, getMonetarySemanticClass } from "@/shared/lib/format-utils";
import type { AgendaEvent } from "@/modules/events/components/types";

const STATUS_STYLES: Record<string, { label: string; variant: BadgeVariant }> = {
  confirmado: { label: "Confirmado", variant: "success" },
  negociacao: { label: "Negociação", variant: "warning" },
  pendente:   { label: "Pendente",   variant: "warning" },
  agendado:   { label: "Agendado",   variant: "warning" },
  cancelado:  { label: "Cancelado",  variant: "danger" },
  realizado:  { label: "Realizado",  variant: "info" },
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
    variant: "neutral" as BadgeVariant,
  };

  const timeLabel = event.allDay
    ? "Dia inteiro"
    : `${format(event.startDate, "HH:mm")}${event.endDate ? ` — ${format(event.endDate, "HH:mm")}` : ""}`;

  const cacheLabel = event.cache != null ? formatCurrency(event.cache) : "-";
  const cacheClassName = event.cache != null ? getMonetarySemanticClass("neutral") : "text-foreground";

  if (compact) {
    return (
      <div
        className="group flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] text-foreground transition hover:bg-muted hover:text-foreground"
        onClick={() => onClick?.(event)}
      >
        <div className="shrink-0 font-medium tabular-nums text-muted-foreground">{timeLabel}</div>
        <div className="min-w-0 truncate font-medium">{event.title}</div>
        <Badge variant={status.variant} className="ml-auto h-4 px-1 text-[9px]">{status.label}</Badge>
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-4 transition duration-200 ease-out hover:border-primary/60"
      onClick={() => onClick?.(event)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs  tracking-[0.22em] text-muted-foreground">
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
          <Badge variant={status.variant}>{status.label}</Badge>
          <div className={`text-sm font-semibold ${cacheClassName}`}>{cacheLabel}</div>
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
