import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Clock, Radio, Tv, Music, Mic2, Globe, Building2, Calendar, BookOpen, User, Tag, Hash, Clock3, Link2 } from "lucide-react";
import type { RightsExecution, ExecutionType, ExecutionStatus } from "../types";

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

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; className: string; icon: React.ReactNode }> = {
  confirmado:    { label: "Confirmado",    className: "bg-success/15 text-success border-success/30",                  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  pendente:      { label: "Pendente",      className: "bg-warning/15 text-warning border-warning/30",                  icon: <Clock className="h-3.5 w-3.5" /> },
  divergencia:   { label: "Divergência",   className: "bg-destructive/15 text-destructive border-destructive/30",      icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  nao_reportado: { label: "Não Reportado", className: "bg-muted text-muted-foreground border-border",                  icon: <XCircle className="h-3.5 w-3.5" /> },
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

interface Props {
  exec: RightsExecution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
        <p className={`text-sm text-foreground ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dados da Execução</p>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/30">
              <Row icon={<Hash className="h-3.5 w-3.5" />} label="ISRC" value={exec.isrc} mono />
              <Row icon={<Radio className="h-3.5 w-3.5" />} label="Origem" value={exec.origem} />
              <Row icon={<Tag className="h-3.5 w-3.5" />} label="Tipo" value={TIPO_LABEL[exec.tipo_execucao]} />
              <Row icon={<Clock3 className="h-3.5 w-3.5" />} label="Data / Hora" value={fmtDateTime(exec.data_hora)} />
              <Row
                icon={<CheckCircle className="h-3.5 w-3.5" />}
                label="Status"
                value={
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${status.className}`}>
                    {status.icon}{status.label}
                  </span>
                }
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dados da Obra — Catálogo</p>
            {catalog ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/30">
                <Row icon={<User className="h-3.5 w-3.5" />} label="Compositor(es)" value={catalog.compositores} />
                {catalog.co_compositores && (
                  <Row icon={<User className="h-3.5 w-3.5" />} label="Co-compositor(es)" value={catalog.co_compositores} />
                )}
                <Row icon={<BookOpen className="h-3.5 w-3.5" />} label="Publisher / Editora" value={catalog.editora} />
                <Row icon={<BookOpen className="h-3.5 w-3.5" />} label="Detentores" value={catalog.detentores} />
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
                      ? <span className="font-mono text-success">{catalog.cod_ecad}</span>
                      : <span className="text-warning text-xs">Não cadastrado — sem cod_ecad</span>
                  }
                />
                {catalog.cod_abramus && (
                  <Row icon={<Hash className="h-3.5 w-3.5" />} label="Cód. ABRAMUS" value={catalog.cod_abramus} mono />
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
                    Nenhuma obra com ISRC <code className="font-mono">{exec.isrc}</code> foi localizada no catálogo interno.
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
