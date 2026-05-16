import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Music, Mic2, Clock } from "lucide-react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { WorkflowTransitionPanel } from "@/shared/components/WorkflowTransitionPanel";
import { useWorkflowTransition } from "@/shared/hooks/useWorkflowTransition";
import { getWorkflowAllowedTransitions } from "@/shared/lib/workflow-transitions";

interface LancamentoViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento?: any;
}

const TIPO_MAP: Record<string, { label: string; color: string }> = {
  single: { label: "Single",  color: "bg-primary text-white" },
  ep:     { label: "EP",      color: "bg-blue-600 text-white" },
  album:  { label: "Álbum",   color: "bg-purple-600 text-white" },
};

const IDIOMAS: Record<string, string> = {
  "pt-br": "Português (Brasil)",
  en:      "English",
  es:      "Español",
  fr:      "Français",
  de:      "Deutsch",
  it:      "Italiano",
  ja:      "日本語",
  ko:      "한국어",
  zh:      "中文",
  ar:      "العربية",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function aggregateField(faixas: any[], key: string): string {
  const values = faixas
    .flatMap(f => (f[key] ?? "").split(",").map((s: string) => s.trim()))
    .filter(Boolean);
  return [...new Set(values)].join(", ");
}

export function LancamentoViewModal({ open, onOpenChange, lancamento }: LancamentoViewModalProps) {
  const { artistas }   = useArtistas();
  const { fonogramas } = useFonogramas();
  const { transition: workflowTransition, isPending: isTransitionPending } = useWorkflowTransition({
    table:    'lancamentos',
    id:       lancamento?.id ?? '',
    queryKey: ['lancamentos'],
  });

  if (!lancamento) return null;

  const allowedTransitions = getWorkflowAllowedTransitions('release', lancamento.status);
  const tipo     = (lancamento.tipo ?? "single").toLowerCase();
  const tipoInfo = TIPO_MAP[tipo] ?? { label: tipo.toUpperCase(), color: "bg-muted text-muted-foreground" };

  const faixas = Array.isArray(lancamento.fonograma_ids)
    ? (lancamento.fonograma_ids as string[])
        .map(id => fonogramas.find((f: any) => f.id === id))
        .filter(Boolean)
    : [];

  const compositores = aggregateField(faixas, "compositores");
  const interpretes  = aggregateField(faixas, "interpretes");
  const produtores   = aggregateField(faixas, "produtores");

  const dataFormatada = lancamento.data_lancamento
    ? new Date(lancamento.data_lancamento).toLocaleDateString("pt-BR")
    : null;

  const idioma = IDIOMAS[lancamento.idioma] ?? lancamento.idioma ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden><DialogTitle>{lancamento.titulo}</DialogTitle></VisuallyHidden>

        {/* ── Nome + Tipo + Status ── */}
        <div className="flex items-start gap-3 pb-4 border-b border-border">
          <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight">{lancamento.titulo}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge className={`${tipoInfo.color} border-0 text-xs no-default-hover-elevate`}>
                {tipoInfo.label}
              </Badge>
              <StatusBadge status={lancamento.status} />
              {dataFormatada && (
                <span className="text-xs text-muted-foreground">{dataFormatada}</span>
              )}
            </div>
            {allowedTransitions.length > 0 && (
              <WorkflowTransitionPanel
                currentStatus={lancamento.status ?? ""}
                allowedTransitions={allowedTransitions}
                onTransition={workflowTransition}
                isLoading={isTransitionPending}
                className="mt-2"
              />
            )}
          </div>
        </div>

        {/* ── Créditos ── */}
        {(compositores || interpretes || produtores) && (
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Créditos
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Compositores" value={compositores} />
              <Field label="Intérpretes"  value={interpretes} />
              <Field label="Produtores"   value={produtores} />
            </div>
          </div>
        )}

        <Separator />

        {/* ── Metadados Técnicos ── */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Metadados
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Field label="Distribuidora"  value={lancamento.distribuidora} />
            <Field label="ISRC"           value={lancamento.isrc_global} />
            <Field label="UPC / EAN"      value={lancamento.upc ?? lancamento.codigo_upc} />
            <Field label="Gênero"         value={lancamento.genero} />
            <Field label="Idioma"         value={idioma} />
            <Field label="Gravadora"      value={lancamento.gravadora} />
            <Field label="Copyright"      value={lancamento.copyright ?? lancamento.copyright_c} />
          </div>
        </div>

        {/* ── Faixas ── */}
        {faixas.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Faixas ({faixas.length})
              </h3>
              <div className="space-y-1">
                {faixas.map((f: any, idx) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right tabular-nums shrink-0">
                      {idx + 1}
                    </span>
                    <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Mic2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.titulo}</p>
                      {f.isrc && (
                        <p className="text-xs text-muted-foreground font-mono">{f.isrc}</p>
                      )}
                    </div>
                    {f.duracao && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {f.duracao}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
