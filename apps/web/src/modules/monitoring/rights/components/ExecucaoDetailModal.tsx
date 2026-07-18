import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Clock, Radio, Tv, Music, Mic2, Globe, Building2, Calendar, BookOpen, User, Tag, Hash, Clock3, Link2 } from "lucide-react";
import type { RightsExecution, ExecutionType, ExecutionStatus } from "../types";
import { formatRightsDateTime } from "../utils/date-format";

const TIPO_LABEL: Record<ExecutionType, string> = {
  radio_fm: "Rádio FM",
  radio_am: "Rádio AM",
  tv_aberta: "TV Aberta",
  tv_fechada: "TV Fechada",
  show_ao_vivo: "Show Ao Vivo",
  web_radio: "Web Rádio",
  casa_noturna: "Casa Noturna",
  evento: "Evento",
  cue_sheet: "Cue Sheet",
  streaming_publico: "Streaming Público",
};

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  confirmado:    { label: "Confirmado",    variant: "success", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  pendente:      { label: "Pendente",      variant: "warning", icon: <Clock className="h-3.5 w-3.5" /> },
  divergencia:   { label: "Divergência",   variant: "danger",  icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  nao_reportado: { label: "Não Reportado", variant: "neutral", icon: <XCircle className="h-3.5 w-3.5" /> },
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

interface Props {
  exec: RightsExecution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2.5">
      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
        <div className={`text-sm text-foreground break-words ${mono ? "font-sans" : "font-medium"}`}>{value}</div>
      </div>
    </div>
  );
}

export function ExecucaoDetailModal({ exec, open, onOpenChange }: Props) {
  if (!exec) return null;

  const status = STATUS_CONFIG[exec.status];
  const catalog = exec.obra_catalog;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{exec.obra_titulo}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{exec.artista}</DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-4">

          {/* Execution info */}
          <div>
            <p className="text-xs font-semibold  tracking-wide text-muted-foreground mb-2">Dados da Execução</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <Row icon={<Hash className="h-3.5 w-3.5" />} label="ISRC" value={exec.isrc} mono />
              <Row icon={<Radio className="h-3.5 w-3.5" />} label="Origem" value={exec.origem} />
              <Row icon={<Tag className="h-3.5 w-3.5" />} label="Tipo" value={TIPO_LABEL[exec.tipo_execucao]} />
              <Row icon={<Clock3 className="h-3.5 w-3.5" />} label="Data / Hora" value={formatRightsDateTime(exec.data_hora).full} />
              <Row
                icon={<CheckCircle className="h-3.5 w-3.5" />}
                label="Status"
                value={<Badge variant={status.variant} className="gap-1">{status.icon}{status.label}</Badge>}
              />
              <Row
                icon={<Link2 className="h-3.5 w-3.5" />}
                label="Match ECAD"
                value={
                  exec.match_ecad
                    ? <span className="text-success font-semibold text-xs">✓ Obra encontrada no ECAD</span>
                    : <span className="text-destructive font-semibold text-xs">✗ Sem correspondência no ECAD</span>
                }
              />
              <Row icon={<Globe className="h-3.5 w-3.5" />} label="Valor Estimado" value={fmtBRL(exec.valor_estimado)} />
            </div>
          </div>

          {/* Catalog / obra info */}
          <div>
            <p className="text-xs font-semibold  tracking-wide text-muted-foreground mb-2">Dados da Obra — Catálogo</p>
            {catalog ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                <Row icon={<User className="h-3.5 w-3.5" />} label="Compositor(es)" value={catalog.compositores} />
                <Row icon={<BookOpen className="h-3.5 w-3.5" />} label="Publisher / Editora" value={catalog.editora} />
                <Row icon={<Tag className="h-3.5 w-3.5" />} label="Gênero" value={catalog.genero} />
                <Row icon={<Clock3 className="h-3.5 w-3.5" />} label="Duração" value={catalog.duracao} />
                {catalog.iswc && (
                  <Row icon={<Hash className="h-3.5 w-3.5" />} label="ISWC" value={catalog.iswc} mono />
                )}
                <Row
                  icon={<CheckCircle className="h-3.5 w-3.5" />}
                  label="Cód. ECAD"
                  value={
                    catalog.cod_ecad
                      ? <span className="font-sans text-success">{catalog.cod_ecad}</span>
                      : <span className="text-warning text-xs">Não cadastrado — sem cod_ecad</span>
                  }
                />
                {catalog.cod_entidade && (
                  <Row icon={<Hash className="h-3.5 w-3.5" />} label="Cód. Sociedade" value={catalog.cod_entidade} mono />
                )}
                <Row
                  icon={<Tag className="h-3.5 w-3.5" />}
                  label="Status no Catálogo"
                  value={<span className="capitalize text-xs">{catalog.catalog_status}</span>}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Obra não encontrada no catálogo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhuma obra com ISRC <code className="font-sans">{exec.isrc}</code> foi localizada no catálogo interno.
                    Registre a obra no Catálogo para habilitar a conciliação ECAD.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
