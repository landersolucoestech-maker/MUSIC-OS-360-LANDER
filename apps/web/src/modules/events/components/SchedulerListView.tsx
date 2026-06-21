import { format } from "date-fns";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, getMonetarySemanticClass } from "@/shared/lib/format-utils";
import type { AgendaEvent } from "@/modules/events/components/types";

interface SchedulerListViewProps {
  events: AgendaEvent[];
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onView?: (event: AgendaEvent) => void;
  onEdit?: (event: AgendaEvent) => void;
  onDelete?: (event: AgendaEvent) => void;
}

export function SchedulerListView({ events, selectedIds = [], onSelect, onSelectAll, onView, onEdit, onDelete }: SchedulerListViewProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhum evento encontrado. Use a barra de filtros ou crie um novo evento para começar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onSelectAll ? (
        <div className="rounded-3xl border border-border/60 bg-card p-4">
          <ListSectionHeader
            title="Lista de Eventos"
            count={events.length}
            description="Acompanhe eventos, participantes, datas, locais, cachês e status"
            action={
              <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-foreground">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-sm transition hover:border-primary/70"
              onClick={onSelectAll}
            >
              {selectedIds.length === events.length ? "✓" : "☐"}
            </button>
                <span>{selectedIds.length === events.length ? "Todos selecionados" : "Selecionar todos"}</span>
              </div>
            }
          />
        </div>
      ) : null}

      {events.map((event) => (
        <div key={event.id} className="rounded-3xl border border-border/60 bg-card p-4 transition hover:border-primary/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              {onSelect ? (
                <button
                  type="button"
                  className={`mt-1 h-5 w-5 shrink-0 rounded-sm border border-border/70 transition ${selectedIds.includes(event.id) ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  onClick={() => onSelect(event.id)}
                >
                  {selectedIds.includes(event.id) ? "✓" : ""}
                </button>
              ) : null}
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs  tracking-[0.2em] text-muted-foreground">
                  <span>{formatDate(event.startDate)}</span>
                  <span>•</span>
                  <span>{event.allDay ? "Dia inteiro" : format(event.startDate, "HH:mm")}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground truncate">{event.title}</h3>
                <Badge className="rounded-full bg-muted/70 px-2 py-1 text-xs font-semibold text-foreground">
                  {event.type ?? "Evento"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.artist ?? "Participantes não informados"} · {event.location ?? "Local não informado"}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className={`text-sm font-semibold ${event.cache != null ? getMonetarySemanticClass("neutral") : "text-foreground"}`}>{event.cache != null ? formatCurrency(event.cache) : "-"}</div>
              <Badge className="rounded-full px-2 py-1 text-xs font-semibold bg-muted/70 text-foreground">
                {event.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-border">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView ? (
                    <DropdownMenuItem onClick={() => onView(event)}>
                      <Eye className="mr-2 h-4 w-4" />Ver
                    </DropdownMenuItem>
                  ) : null}
                  {onEdit ? (
                    <DropdownMenuItem onClick={() => onEdit(event)}>
                      <Pencil className="mr-2 h-4 w-4" />Editar
                    </DropdownMenuItem>
                  ) : null}
                  {onDelete ? (
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(event)}>
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

