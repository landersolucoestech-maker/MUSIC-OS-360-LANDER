import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Share2, User, Percent, ExternalLink, FileText,
  Clock, History, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { ShareHistoricoEntry } from "../types";
import { formatDate } from "@/shared/lib/format-utils";

interface ShareViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share?: any | null;
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <div className="text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground italic">—</span>}
      </div>
    </div>
  );
}

const FUNCAO_LABELS: Record<string, string> = {
  compositor: "Compositor / Autor",
  interprete: "Intérprete",
  produtor: "Produtor",
  editora: "Editora",
  gravadora: "Gravadora",
  empresario: "Empresário",
  outro: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente:  { label: "Pendente",  variant: "outline" },
  parcial:   { label: "Parcial",   variant: "secondary" },
  recebido:  { label: "Recebido",  variant: "default" },
  enviado:   { label: "Enviado",   variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function ShareViewModal({ open, onOpenChange, share }: ShareViewModalProps) {
  if (!share) return null;

  const historico: ShareHistoricoEntry[] = (share.historico as ShareHistoricoEntry[]) ?? [];
  const statusConf = STATUS_CONFIG[share.status] ?? { label: share.status ?? "—", variant: "outline" as const };
  const isAEnviar = share.direcao === "a_enviar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-share-view">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Share2 className="h-5 w-5 text-primary" />
            Detalhe do Share
            {share.versao && (
              <Badge variant="outline" className="text-[10px] font-mono ml-1">v{share.versao}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Dados principais ────────────────────────────────────────────── */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 grid grid-cols-2 gap-4 sm:grid-cols-3">

              <Field
                label="Nome da Música"
                value={share.nome_musica ?? share.titulo_obra ?? null}
                icon={FileText}
              />

              <Field
                label="Detentor / Beneficiário"
                value={share.detentor}
                icon={User}
              />

              <Field
                label="Direção"
                value={
                  share.direcao === "a_receber" ? (
                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      <ArrowDownLeft className="h-3.5 w-3.5" /> A Receber
                    </span>
                  ) : share.direcao === "a_enviar" ? (
                    <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                      <ArrowUpRight className="h-3.5 w-3.5" /> A Enviar
                    </span>
                  ) : null
                }
              />

              {isAEnviar && (
                <Field
                  label="Função"
                  value={share.tipo ? (FUNCAO_LABELS[share.tipo] ?? share.tipo) : null}
                  icon={Share2}
                />
              )}

              <Field
                label="% Share"
                value={
                  share.percentual != null ? (
                    <span className="font-mono text-primary font-semibold flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {share.percentual}%
                    </span>
                  ) : null
                }
              />

              <Field
                label="Status"
                value={
                  <Badge variant={statusConf.variant} className="text-xs">
                    {statusConf.label}
                  </Badge>
                }
              />

            </CardContent>
          </Card>

          {/* ── Acordo / Documento ──────────────────────────────────────────── */}
          {(share.acordo_notas || share.acordo_url) && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notas do Acordo
                </p>
                {share.acordo_notas && (
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {share.acordo_notas}
                  </p>
                )}
                {share.acordo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => window.open(share.acordo_url as string, "_blank")}
                    data-testid="btn-acordo-url"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver Documento
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Observações ─────────────────────────────────────────────────── */}
          {share.observacoes && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações adicionais
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {share.observacoes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Histórico de versões ─────────────────────────────────────────── */}
          {historico.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Histórico de Versões
              </p>
              <div className="space-y-2">
                {historico.slice().reverse().map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20"
                    data-testid={`historico-v${h.versao}`}
                  >
                    <div className="shrink-0">
                      <Badge variant="outline" className="font-mono text-[10px]">v{h.versao}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.percentual != null && (
                          <span className="text-sm font-mono font-semibold text-primary">{h.percentual}%</span>
                        )}
                        {h.descricao && (
                          <span className="text-xs text-muted-foreground">{h.descricao}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        {h.autor && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />{h.autor}
                          </span>
                        )}
                        {h.data && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{formatDate(h.data)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
