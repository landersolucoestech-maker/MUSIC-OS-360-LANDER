import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { WorkflowTransitionPanel } from "@/shared/components/WorkflowTransitionPanel";
import { useWorkflowTransition } from "@/shared/hooks/useWorkflowTransition";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Target, DollarSign, Calendar, MousePointer, BarChart3, User } from "lucide-react";
import type { ElementType } from "react";
import type { CampanhaWithRelations } from "../types/marketing.types";

interface CampanhaWithWorkflow extends CampanhaWithRelations {
  allowed_transitions?: { to: string; label?: string }[];
}

interface CampanhaViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campanha?: CampanhaWithWorkflow;
}

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function CampanhaViewModal({ open, onOpenChange, campanha }: CampanhaViewModalProps) {
  const { transition: workflowTransition, isPending: isTransitionPending } = useWorkflowTransition({
    table:    'campanhas',
    id:       campanha?.id ?? '',
    queryKey: ['campanhas'],
  });

  if (!campanha) return null;

  const ctr = campanha.cliques && campanha.impressoes && campanha.impressoes > 0
    ? ((campanha.cliques / campanha.impressoes) * 100).toFixed(2) + '%'
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="modal-campanha-view">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <Target className="h-5 w-5 text-primary" />
            <span data-testid="text-campanha-nome">{campanha.nome}</span>
            {campanha.status && <StatusBadge status={campanha.status as string} />}
            {campanha.tipo && (
              <Badge variant="outline" className="text-xs">
                {campanha.tipo as string}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Campanha criada em {formatDate(campanha.created_at ?? '')}
          </DialogDescription>
          {Array.isArray(campanha.allowed_transitions) && campanha.allowed_transitions.length > 0 && (
            <WorkflowTransitionPanel
              currentStatus={campanha.status ?? ''}
              allowedTransitions={campanha.allowed_transitions}
              onTransition={workflowTransition}
              isLoading={isTransitionPending}
              className="mt-1"
            />
          )}
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </h4>
            <div className="grid grid-cols-2 gap-3 pl-4">
              <InfoRow icon={DollarSign} label="Orçamento" value={campanha.orcamento ? formatCurrency(campanha.orcamento) : null} />
              <InfoRow icon={DollarSign} label="Gasto" value={campanha.gasto ? formatCurrency(campanha.gasto) : null} />
              <InfoRow icon={MousePointer} label="Cliques" value={campanha.cliques?.toLocaleString('pt-BR') ?? null} />
              <InfoRow icon={BarChart3} label="Impressões" value={campanha.impressoes?.toLocaleString('pt-BR') ?? null} />
              <InfoRow icon={BarChart3} label="Conversões" value={campanha.conversoes?.toLocaleString('pt-BR') ?? null} />
              <InfoRow icon={BarChart3} label="CTR" value={ctr} />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período
            </h4>
            <div className="grid grid-cols-2 gap-3 pl-4">
              <InfoRow icon={Calendar} label="Início" value={campanha.data_inicio ? formatDate(campanha.data_inicio) : null} />
              <InfoRow icon={Calendar} label="Fim" value={campanha.data_fim ? formatDate(campanha.data_fim) : null} />
            </div>
          </div>

          {campanha.artistas && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Artista
                </h4>
                <div className="pl-4 text-sm text-foreground">
                  {(campanha.artistas as { nome?: string }).nome ?? '—'}
                </div>
              </div>
            </>
          )}

          {campanha.observacoes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Observações</h4>
                <p className="text-muted-foreground pl-4 whitespace-pre-wrap text-sm" data-testid="text-campanha-observacoes">
                  {campanha.observacoes as string}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
