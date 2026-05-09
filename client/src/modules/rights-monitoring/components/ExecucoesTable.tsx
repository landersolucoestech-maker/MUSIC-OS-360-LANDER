import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CheckCircle, AlertTriangle, XCircle, Clock, Radio, Tv, Music, Mic2, Globe, Building2, Calendar, ExternalLink } from "lucide-react";
import type { RightsExecution, ExecutionType, ExecutionStatus } from "../types";

const TIPO_LABEL: Record<ExecutionType, { label: string; icon: React.ReactNode }> = {
  radio_fm:         { label: "Rádio FM",      icon: <Radio className="h-3 w-3" /> },
  radio_am:         { label: "Rádio AM",      icon: <Radio className="h-3 w-3" /> },
  tv_aberta:        { label: "TV Aberta",     icon: <Tv className="h-3 w-3" /> },
  tv_fechada:       { label: "TV Fechada",    icon: <Tv className="h-3 w-3" /> },
  show_ao_vivo:     { label: "Show",          icon: <Mic2 className="h-3 w-3" /> },
  web_radio:        { label: "Web Rádio",     icon: <Globe className="h-3 w-3" /> },
  casa_noturna:     { label: "Casa Noturna",  icon: <Building2 className="h-3 w-3" /> },
  evento:           { label: "Evento",        icon: <Calendar className="h-3 w-3" /> },
  cue_sheet:        { label: "Cue Sheet",     icon: <Music className="h-3 w-3" /> },
  streaming_publico:{ label: "Streaming Púb.",icon: <Globe className="h-3 w-3" /> },
};

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; className: string; icon: React.ReactNode }> = {
  confirmado:    { label: "Confirmado",    className: "bg-success/15 text-success border-success/30",          icon: <CheckCircle className="h-3 w-3" /> },
  pendente:      { label: "Pendente",      className: "bg-warning/15 text-warning border-warning/30",          icon: <Clock className="h-3 w-3" /> },
  divergencia:   { label: "Divergência",   className: "bg-destructive/15 text-destructive border-destructive/30", icon: <AlertTriangle className="h-3 w-3" /> },
  nao_reportado: { label: "Não Reportado", className: "bg-muted text-muted-foreground border-border",          icon: <XCircle className="h-3 w-3" /> },
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
};

interface Props {
  execucoes: RightsExecution[];
  onViewDetail?: (exec: RightsExecution) => void;
}

export function ExecucoesTable({ execucoes, onViewDetail }: Props) {
  if (execucoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Radio className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">Nenhuma execução detectada</p>
        <p className="text-xs mt-1">As execuções públicas aparecerão aqui automaticamente</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Música / Artista</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Origem</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Tipo</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Data / Hora</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">ISRC</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Match</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Valor Est.</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {execucoes.map((exec) => {
            const tipo = TIPO_LABEL[exec.tipo_execucao];
            const status = STATUS_CONFIG[exec.status];
            const { date, time } = fmtDateTime(exec.data_hora);
            return (
              <tr key={exec.id} data-testid={`row-exec-${exec.id}`} className="hover:bg-muted/30 transition-colors group">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-semibold text-foreground leading-tight">{exec.obra_titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{exec.artista}</p>
                  </div>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <span className="text-sm text-foreground/80">{exec.origem}</span>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md font-medium">
                    {tipo.icon}{tipo.label}
                  </span>
                </td>
                <td className="py-3 px-4 hidden xl:table-cell">
                  <div className="text-xs">
                    <p className="text-foreground/80 font-medium">{date}</p>
                    <p className="text-muted-foreground">{time}</p>
                  </div>
                </td>
                <td className="py-3 px-4 hidden xl:table-cell">
                  <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{exec.isrc}</code>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <span className={`text-xs font-semibold ${exec.match_ecad ? "text-success" : "text-destructive"}`}>
                    {exec.match_ecad ? "✓ Match" : "✗ Sem match"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right hidden md:table-cell">
                  <span className="text-sm font-medium tabular-nums">{fmtBRL(exec.valor_estimado)}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border ${status.className}`}>
                    {status.icon}{status.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`btn-detail-${exec.id}`}
                    className="h-7 px-2"
                    onClick={() => onViewDetail?.(exec)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
