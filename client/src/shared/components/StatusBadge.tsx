import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

type StatusType =
  | "active" | "ativo" | "ativa"
  | "pending" | "pendente"
  | "confirmed" | "confirmado" | "confirmada"
  | "cancelled" | "cancelado" | "cancelada"
  | "executed" | "executado" | "executada"
  | "registered" | "registrado" | "registrada"
  | "analysis" | "em_analise" | "analise"
  | "rejected" | "rejeitado" | "rejeitada"
  | "expired" | "expirado" | "expirada" | "vencido" | "vencida"
  | "negotiation" | "negociacao" | "em_negociacao"
  | "proposal" | "proposta"
  | "lead" | "cliente_ativo" | "inativo"
  | "contratado" | "parceiro" | "independente"
  | "agendado" | "concluido" | "concluida"
  | "aprovado" | "aprovada"
  | "em_revisao" | "em_andamento" | "atrasada"
  | "rascunho" | "em_producao"
  | "disponivel" | "em_uso" | "emprestado" | "manutencao" | "danificado" | "descartado"
  | "pausada"
  | "vigente" | "assinado" | "em_vigor"
  | "onboarding"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

// Enterprise tinted badge style — subtle bg + matching text + border
// Replaces solid colored badges for a Linear/Stripe aesthetic
const statusStyles: Record<string, string> = {
  // ── Success / Green
  active:        "bg-success/10 text-success border-success/20",
  ativo:         "bg-success/10 text-success border-success/20",
  ativa:         "bg-success/10 text-success border-success/20",
  executed:      "bg-success/10 text-success border-success/20",
  executado:     "bg-success/10 text-success border-success/20",
  executada:     "bg-success/10 text-success border-success/20",
  registered:    "bg-success/10 text-success border-success/20",
  registrado:    "bg-success/10 text-success border-success/20",
  registrada:    "bg-success/10 text-success border-success/20",
  concluido:     "bg-success/10 text-success border-success/20",
  concluida:     "bg-success/10 text-success border-success/20",
  aprovado:      "bg-success/10 text-success border-success/20",
  aprovada:      "bg-success/10 text-success border-success/20",
  cliente_ativo: "bg-success/10 text-success border-success/20",
  contratado:    "bg-success/10 text-success border-success/20",
  disponivel:    "bg-success/10 text-success border-success/20",
  vigente:       "bg-success/10 text-success border-success/20",
  assinado:      "bg-success/10 text-success border-success/20",
  em_vigor:      "bg-success/10 text-success border-success/20",

  // ── Warning / Amber
  pending:       "bg-warning/10 text-warning border-warning/20",
  pendente:      "bg-warning/10 text-warning border-warning/20",
  analysis:      "bg-warning/10 text-warning border-warning/20",
  em_analise:    "bg-warning/10 text-warning border-warning/20",
  analise:       "bg-warning/10 text-warning border-warning/20",
  negotiation:   "bg-warning/10 text-warning border-warning/20",
  negociacao:    "bg-warning/10 text-warning border-warning/20",
  em_negociacao: "bg-warning/10 text-warning border-warning/20",
  em_revisao:    "bg-warning/10 text-warning border-warning/20",
  em_andamento:  "bg-warning/10 text-warning border-warning/20",
  em_producao:   "bg-warning/10 text-warning border-warning/20",
  agendado:      "bg-warning/10 text-warning border-warning/20",
  vencendo:      "bg-warning/10 text-warning border-warning/20",
  lead:          "bg-warning/10 text-warning border-warning/20",
  parceiro:      "bg-warning/10 text-warning border-warning/20",
  em_uso:        "bg-warning/10 text-warning border-warning/20",
  emprestado:    "bg-warning/10 text-warning border-warning/20",
  manutencao:    "bg-warning/10 text-warning border-warning/20",
  programado:    "bg-warning/10 text-warning border-warning/20",
  pausada:       "bg-warning/10 text-warning border-warning/20",
  onboarding:    "bg-warning/10 text-warning border-warning/20",

  // ── Info / Blue
  confirmed:                "bg-primary/10 text-primary border-primary/20",
  confirmado:               "bg-primary/10 text-primary border-primary/20",
  confirmada:               "bg-primary/10 text-primary border-primary/20",
  proposal:                 "bg-primary/10 text-primary border-primary/20",
  proposta:                 "bg-primary/10 text-primary border-primary/20",
  independente:             "bg-primary/10 text-primary border-primary/20",
  aguardando_distribuicao:  "bg-primary/10 text-primary border-primary/20",
  aguardando_assinatura:    "bg-primary/10 text-primary border-primary/20",
  publicado:                "bg-success/10 text-success border-success/20",
  planejado:                "bg-muted text-muted-foreground border-border",

  // ── Destructive / Red
  cancelled:     "bg-destructive/10 text-destructive border-destructive/20",
  cancelado:     "bg-destructive/10 text-destructive border-destructive/20",
  cancelada:     "bg-destructive/10 text-destructive border-destructive/20",
  rejected:      "bg-destructive/10 text-destructive border-destructive/20",
  rejeitado:     "bg-destructive/10 text-destructive border-destructive/20",
  rejeitada:     "bg-destructive/10 text-destructive border-destructive/20",
  expired:       "bg-destructive/10 text-destructive border-destructive/20",
  expirado:      "bg-destructive/10 text-destructive border-destructive/20",
  expirada:      "bg-destructive/10 text-destructive border-destructive/20",
  vencido:       "bg-destructive/10 text-destructive border-destructive/20",
  vencida:       "bg-destructive/10 text-destructive border-destructive/20",
  rescindido:    "bg-destructive/10 text-destructive border-destructive/20",
  rescindida:    "bg-destructive/10 text-destructive border-destructive/20",
  inativo:       "bg-destructive/10 text-destructive border-destructive/20",
  atrasada:      "bg-destructive/10 text-destructive border-destructive/20",
  danificado:    "bg-destructive/10 text-destructive border-destructive/20",
  descartado:    "bg-destructive/10 text-destructive border-destructive/20",

  // ── Neutral / Gray
  rascunho:      "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  active: "Ativo", ativo: "Ativo", ativa: "Ativa",
  pending: "Pendente", pendente: "Pendente",
  confirmed: "Confirmado", confirmado: "Confirmado", confirmada: "Confirmada",
  cancelled: "Cancelado", cancelado: "Cancelado", cancelada: "Cancelada",
  executed: "Executado", executado: "Executado", executada: "Executada",
  registered: "Registrado", registrado: "Registrado", registrada: "Registrada",
  analysis: "Em Análise", em_analise: "Em Análise", analise: "Em Análise",
  rejected: "Rejeitado", rejeitado: "Rejeitado", rejeitada: "Rejeitada",
  expired: "Expirado", expirado: "Expirado", expirada: "Expirada",
  vencido: "Vencido", vencida: "Vencida", vencendo: "Vencendo",
  negotiation: "Em Negociação", negociacao: "Em Negociação", em_negociacao: "Em Negociação",
  proposal: "Proposta Enviada", proposta: "Proposta Enviada",
  lead: "Lead", cliente_ativo: "Cliente Ativo", inativo: "Inativo",
  contratado: "Contratado", parceiro: "Parceiro", independente: "Independente",
  agendado: "Agendado", concluido: "Concluído", concluida: "Concluída",
  aprovado: "Aprovado", aprovada: "Aprovada",
  em_revisao: "Em Revisão", em_andamento: "Em Andamento", em_producao: "Em Produção",
  atrasada: "Atrasada", rascunho: "Rascunho",
  disponivel: "Disponível", em_uso: "Em Uso", emprestado: "Emprestado",
  manutencao: "Em Manutenção", danificado: "Danificado", descartado: "Descartado",
  programado: "Programado", pausada: "Pausada",
  planejado: "Planejado", publicado: "Publicado",
  aguardando_distribuicao: "Aguardando Distribuição",
  aguardando_assinatura: "Aguardando Assinatura",
  rescindido: "Rescindido", rescindida: "Rescindida",
  vigente: "Vigente", assinado: "Assinado", em_vigor: "Em Vigor",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const key = status?.toLowerCase().replace(/ /g, "_") || "";
  const style = statusStyles[key] || "bg-muted text-muted-foreground border-border";
  const displayLabel = label || statusLabels[key] || status?.replace(/_/g, " ");

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded-sm border",
        style,
        className
      )}
    >
      {displayLabel}
    </Badge>
  );
}

// ─── Priority Badge ─────────────────────────────────────────────────────────

type PriorityType = "alta" | "media" | "baixa" | "high" | "medium" | "low" | string;

interface PriorityBadgeProps {
  priority: PriorityType;
  label?: string;
  className?: string;
}

const priorityStyles: Record<string, string> = {
  alta:   "bg-destructive/10 text-destructive border-destructive/20",
  high:   "bg-destructive/10 text-destructive border-destructive/20",
  media:  "bg-warning/10 text-warning border-warning/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  baixa:  "bg-success/10 text-success border-success/20",
  low:    "bg-success/10 text-success border-success/20",
};

const priorityLabels: Record<string, string> = {
  alta: "Alta", high: "Alta",
  media: "Média", medium: "Média",
  baixa: "Baixa", low: "Baixa",
};

export function PriorityBadge({ priority, label, className }: PriorityBadgeProps) {
  const key = priority?.toLowerCase() || "";
  const style = priorityStyles[key] || "bg-muted text-muted-foreground border-border";
  const displayLabel = label || priorityLabels[key] || priority;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded-sm border",
        style,
        className
      )}
    >
      {displayLabel}
    </Badge>
  );
}

// ─── Priority Indicator (dot) ────────────────────────────────────────────────

export function PriorityIndicator({ priority }: { priority: PriorityType }) {
  const key = priority?.toLowerCase() || "";
  const colors: Record<string, string> = {
    alta: "bg-destructive", high: "bg-destructive",
    media: "bg-warning", medium: "bg-warning",
    baixa: "bg-success", low: "bg-success",
  };
  return (
    <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", colors[key] || "bg-muted-foreground")} />
  );
}
