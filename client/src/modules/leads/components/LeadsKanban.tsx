import { useMemo } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  ChevronRight, Eye, Pencil, Calendar, Building2, Music2,
  DollarSign, AlertTriangle, Clock,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/format-utils";
import { STATUS_LEAD_OPTIONS, STATUS_LABELS } from "../hooks/useLeads";
import type { Lead } from "../hooks/useLeads";

const STATUS_COLORS: Record<string, { bg: string; border: string; dot: string; header: string }> = {
  novo:              { bg: "bg-blue-500/5",    border: "border-blue-500/20",   dot: "bg-blue-500",     header: "text-blue-500" },
  qualificado:       { bg: "bg-cyan-500/5",    border: "border-cyan-500/20",   dot: "bg-cyan-500",     header: "text-cyan-500" },
  contato_realizado: { bg: "bg-sky-500/5",     border: "border-sky-500/20",    dot: "bg-sky-500",      header: "text-sky-500" },
  proposta_enviada:  { bg: "bg-warning/5",     border: "border-warning/20",    dot: "bg-warning",      header: "text-warning" },
  negociacao:        { bg: "bg-purple-500/5",  border: "border-purple-500/20", dot: "bg-purple-500",   header: "text-purple-500" },
  followup:          { bg: "bg-orange-500/5",  border: "border-orange-500/20", dot: "bg-orange-500",   header: "text-orange-500" },
  confirmado:        { bg: "bg-emerald-500/5", border: "border-emerald-500/20",dot: "bg-emerald-500",  header: "text-emerald-500" },
  fechado:           { bg: "bg-success/5",     border: "border-success/20",    dot: "bg-success",      header: "text-success" },
  perdido:           { bg: "bg-destructive/5", border: "border-destructive/20",dot: "bg-destructive",  header: "text-destructive" },
  arquivado:         { bg: "bg-slate-500/5",   border: "border-slate-500/20",  dot: "bg-slate-500",    header: "text-slate-500" },
};

const PRIORIDADE_BADGE: Record<string, string> = {
  alta:  "bg-destructive/10 text-destructive border-destructive/20",
  media: "bg-warning/10 text-warning border-warning/20",
  baixa: "bg-muted text-muted-foreground border-border",
};

function isOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

interface LeadsKanbanProps {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onMoveStage: (lead: Lead, newStatus: string) => void;
}

function KanbanCard({ lead, onView, onEdit, onMoveStage, allStatuses }: {
  lead: Lead;
  onView: (l: Lead) => void;
  onEdit: (l: Lead) => void;
  onMoveStage: (l: Lead, s: string) => void;
  allStatuses: string[];
}) {
  const currentIdx = allStatuses.indexOf(lead.status_lead ?? "novo");
  const nextStatus = currentIdx < allStatuses.length - 1 ? allStatuses[currentIdx + 1] : null;
  const overdue = isOverdue(lead.data_proximo_contato as string);
  const valor = (lead.orcamento_estimado ?? lead.valor_estimado_cache ?? lead.valor_estimado) as number | undefined;

  return (
    <div
      className="group bg-card border border-border rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onView(lead)}
      data-testid={`kanban-card-${lead.id}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">
          {lead.nome_contratante || "(sem nome)"}
        </p>
        {lead.prioridade && (
          <Badge variant="outline" className={cn("text-[9px] shrink-0 px-1.5 py-0 h-4", PRIORIDADE_BADGE[lead.prioridade])}>
            {lead.prioridade === "alta" ? "Alta" : lead.prioridade === "media" ? "Média" : "Baixa"}
          </Badge>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-1 mb-3">
        {lead.nome_empresa && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.nome_empresa}</span>
          </div>
        )}
        {lead.artista_interesse && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Music2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.artista_interesse}</span>
          </div>
        )}
        {valor != null && valor > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-foreground font-mono font-medium">
            <DollarSign className="h-3 w-3 shrink-0 text-success" />
            {formatCurrency(valor)}
          </div>
        )}
        {lead.data_proximo_contato && (
          <div className={cn(
            "flex items-center gap-1.5 text-[11px]",
            overdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {overdue
              ? <AlertTriangle className="h-3 w-3 shrink-0" />
              : <Clock className="h-3 w-3 shrink-0" />
            }
            <span>
              {overdue ? "Atrasado: " : "Follow-up: "}
              {new Date(lead.data_proximo_contato as string).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}
        {lead.data_evento && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{new Date(lead.data_evento as string).toLocaleDateString("pt-BR")}</span>
          </div>
        )}
      </div>

      {/* Prob bar */}
      {(lead.probabilidade_fechamento ?? 0) > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Probabilidade</span>
            <span className="font-mono">{lead.probabilidade_fechamento}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${lead.probabilidade_fechamento ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost" size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onView(lead)}
          data-testid={`kanban-view-${lead.id}`}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(lead)}
          data-testid={`kanban-edit-${lead.id}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {nextStatus && (
          <Button
            variant="outline" size="sm"
            className="h-6 text-[10px] px-2 ml-auto gap-1"
            onClick={() => onMoveStage(lead, nextStatus)}
            data-testid={`kanban-advance-${lead.id}`}
          >
            Avançar <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function LeadsKanban({ leads, onView, onEdit, onMoveStage }: LeadsKanbanProps) {
  const allStatuses = STATUS_LEAD_OPTIONS.map(s => s.value);

  const byStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    allStatuses.forEach(s => { map[s] = []; });
    for (const lead of leads) {
      const s = lead.status_lead ?? "novo";
      if (!map[s]) map[s] = [];
      map[s].push(lead);
    }
    return map;
  }, [leads, allStatuses]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]" data-testid="kanban-board">
      {STATUS_LEAD_OPTIONS.map((col) => {
        const colLeads = byStatus[col.value] ?? [];
        const colors = STATUS_COLORS[col.value] ?? STATUS_COLORS.novo;
        const totalValor = colLeads.reduce((s, l) => {
          const v = (l.orcamento_estimado ?? l.valor_estimado_cache ?? l.valor_estimado) as number | undefined;
          return s + (v ?? 0);
        }, 0);

        return (
          <div
            key={col.value}
            className={cn("flex-shrink-0 w-[240px] rounded-xl border", colors.bg, colors.border)}
            data-testid={`kanban-col-${col.value}`}
          >
            {/* Column header */}
            <div className="p-3 border-b border-border/60">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
                  <span className={cn("text-xs font-semibold", colors.header)}>{col.label}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono h-4 px-1.5">
                  {colLeads.length}
                </Badge>
              </div>
              {totalValor > 0 && (
                <p className="text-[10px] font-mono text-muted-foreground pl-4">
                  {formatCurrency(totalValor)}
                </p>
              )}
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {colLeads.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-muted-foreground/50">
                  Nenhum lead
                </div>
              ) : (
                colLeads.map(lead => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    onView={onView}
                    onEdit={onEdit}
                    onMoveStage={onMoveStage}
                    allStatuses={allStatuses}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
