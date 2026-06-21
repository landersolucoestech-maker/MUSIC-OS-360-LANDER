import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { CheckCircle, AlertTriangle, XCircle, Clock, Radio, Tv, Music, Mic2, Globe, Building2, Calendar, ExternalLink } from "lucide-react";
import type { RightsExecution, ExecutionType, ExecutionStatus } from "../types";
import { formatRightsDateTime } from "../utils/date-format";

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

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  confirmado:    { label: "Confirmado",    variant: "success", icon: <CheckCircle className="h-3 w-3" /> },
  pendente:      { label: "Pendente",      variant: "warning", icon: <Clock className="h-3 w-3" /> },
  divergencia:   { label: "Divergência",   variant: "danger",  icon: <AlertTriangle className="h-3 w-3" /> },
  nao_reportado: { label: "Não Reportado", variant: "neutral", icon: <XCircle className="h-3 w-3" /> },
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[190px] w-[24%]">Música / Artista</TableHead>
            <TableHead className="hidden lg:table-cell min-w-[180px] w-[18%]">Origem</TableHead>
            <TableHead className="hidden md:table-cell w-[96px]">Tipo</TableHead>
            <TableHead className="hidden xl:table-cell min-w-[128px] w-[128px]">Data / Hora</TableHead>
            <TableHead className="hidden xl:table-cell min-w-[132px] w-[132px]">ISRC</TableHead>
            <TableHead className="hidden lg:table-cell w-[80px]">Match</TableHead>
            <TableHead className="text-right hidden md:table-cell w-[96px]">Valor Est.</TableHead>
            <TableHead className="min-w-[128px] w-[128px]">Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {execucoes.map((exec) => {
            const tipo = TIPO_LABEL[exec.tipo_execucao];
            const status = STATUS_CONFIG[exec.status];
            const { date, time } = formatRightsDateTime(exec.data_hora);
            return (
              <TableRow key={exec.id} data-testid={`row-exec-${exec.id}`}>
                <TableCell className="py-3">
                  <div className="min-w-0 max-w-[220px]">
                    <p className="font-semibold text-foreground leading-tight truncate">{exec.obra_titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{exec.artista}</p>
                  </div>
                </TableCell>
                <TableCell className="py-3 hidden lg:table-cell">
                  <span className="block max-w-[230px] truncate text-sm text-foreground/80">{exec.origem}</span>
                </TableCell>
                <TableCell className="py-3 hidden md:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md font-medium">
                    {tipo.icon}{tipo.label}
                  </span>
                </TableCell>
                <TableCell className="py-3 hidden xl:table-cell">
                  <div className="text-xs">
                    <p className="whitespace-nowrap text-foreground/80 font-medium">{date}</p>
                    <p className="whitespace-nowrap text-muted-foreground">{time}</p>
                  </div>
                </TableCell>
                <TableCell className="py-3 hidden xl:table-cell">
                  <span className="block max-w-[132px] truncate text-sm text-foreground/80">{exec.isrc}</span>
                </TableCell>
                <TableCell className="py-3 hidden lg:table-cell">
                  <span className={`text-xs font-semibold ${exec.match_ecad ? "text-success" : "text-destructive"}`}>
                    {exec.match_ecad ? "✓ Match" : "✗ Sem match"}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right hidden md:table-cell">
                  <span className="text-sm">{fmtBRL(exec.valor_estimado)}</span>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={status.variant} className="gap-1 whitespace-nowrap">{status.icon}{status.label}</Badge>
                </TableCell>
                <TableCell className="py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`btn-detail-${exec.id}`}
                    className="h-7 px-2"
                    onClick={() => onViewDetail?.(exec)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
