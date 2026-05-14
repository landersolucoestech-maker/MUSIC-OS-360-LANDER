import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/shared/ui/badge";
import { Music, Calendar } from "lucide-react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/format-utils";

interface LancamentoViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento?: any;
}

export function LancamentoViewModal({ open, onOpenChange, lancamento }: LancamentoViewModalProps) {
  const { artistas } = useArtistas();

  if (!lancamento) return null;

  const artista = artistas.find(a => a.id === lancamento.artista_id);
  const tipo = (lancamento.tipo || "single").toLowerCase();
  const tipoBadgeColor = tipo === "single" ? "bg-primary" : tipo === "ep" ? "bg-blue-600" : "bg-purple-600";
  const tipoLabel = tipo === "single" ? "Single" : tipo === "ep" ? "EP" : "Álbum";

  const campos = [
    { label: "Distribuidora",  value: lancamento.distribuidora },
    { label: "ISRC Global",    value: lancamento.isrc_global },
    { label: "UPC",            value: lancamento.upc },
    { label: "Plataformas",    value: Array.isArray(lancamento.plataformas) ? lancamento.plataformas.join(", ") : lancamento.plataformas },
    { label: "Gênero",         value: lancamento.genero },
    { label: "Idioma",         value: lancamento.idioma },
    { label: "Gravadora",      value: lancamento.gravadora },
    { label: "Copyright ©",    value: lancamento.copyright_c },
    { label: "Copyright ℗",    value: lancamento.copyright_p },
  ].filter(c => c.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden><DialogTitle>{lancamento.titulo}</DialogTitle></VisuallyHidden>

        {/* Header */}
        <div className="flex items-start gap-4 pb-4 border-b border-border">
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{lancamento.titulo}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {artista?.nome_artistico || "Artista não informado"}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={`${tipoBadgeColor} text-white no-default-hover-elevate`}>
                {tipoLabel}
              </Badge>
              <StatusBadge status={lancamento.status} />
              {lancamento.data_lancamento && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(lancamento.data_lancamento).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Informações */}
        {campos.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
            {campos.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Valor do lançamento */}
        {lancamento.valor != null && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-0.5">Valor</p>
            <p className="text-sm font-medium">{formatCurrency(lancamento.valor)}</p>
          </div>
        )}

        {/* Observações */}
        {lancamento.observacoes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Observações</p>
            <p className="text-sm bg-muted/30 rounded p-3 leading-relaxed">{lancamento.observacoes}</p>
          </div>
        )}

        {/* Notas internas */}
        {lancamento.notas_internas && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Notas Internas</p>
            <p className="text-sm bg-muted/30 rounded p-3 leading-relaxed">{lancamento.notas_internas}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
