import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Share2, User, Calendar, Percent, ExternalLink, FileText, Clock, History } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { ShareWithRelations, ShareHistoricoEntry } from "../types";
import { formatDate } from "@/shared/lib/format-utils";

interface ShareViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share?: ShareWithRelations | null;
}

function Field({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
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

const TIPO_LABELS: Record<string, string> = {
  interprete: "Intérprete",
  compositor: "Compositor",
  produtor: "Produtor",
  musico: "Músico",
  arranjador: "Arranjador",
  editor: "Editor",
  autor: "Autor",
  outro: "Outro",
};

export function ShareViewModal({ open, onOpenChange, share }: ShareViewModalProps) {
  if (!share) return null;

  const historico: ShareHistoricoEntry[] = (share.historico as ShareHistoricoEntry[]) ?? [];

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
          {/* ── Dados principais ── */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field
                label="Obra"
                value={share.obras?.titulo as string}
                icon={FileText}
              />
              <Field
                label="Artista"
                value={share.artistas?.nome_artistico as string}
                icon={User}
              />
              <Field
                label="Beneficiário (Detentor)"
                value={share.detentor as string}
                icon={User}
              />
              <Field
                label="Função"
                value={share.tipo ? (TIPO_LABELS[share.tipo] ?? share.tipo) : null}
                icon={Share2}
              />
              <Field
                label="Percentual"
                value={share.percentual != null ? (
                  <span className="font-mono text-primary font-semibold">{share.percentual}%</span>
                ) : null}
                icon={Percent}
              />
              {share.created_at && (
                <Field
                  label="Registrado em"
                  value={formatDate(share.created_at)}
                  icon={Calendar}
                />
              )}
            </CardContent>
          </Card>

          {/* ── Acordo ── */}
          {(share.acordo_notas || share.acordo_url) && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acordo / Documento</p>
                {share.acordo_notas && (
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{share.acordo_notas}</p>
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

          {/* ── Histórico de versões ── */}
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
                        {h.autor && <span className="flex items-center gap-1"><User className="h-3 w-3" />{h.autor}</span>}
                        {h.data && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(h.data)}</span>}
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
