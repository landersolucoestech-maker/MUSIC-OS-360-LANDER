import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import {
  Music,
  Calendar,
  Hash,
  Globe,
  Disc,
  Mic2,
  Tag,
  FileText,
  Building2,
  Clock,
} from "lucide-react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import { StatusBadge } from "@/shared/components/StatusBadge";

interface LancamentoViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento?: any;
}

const TIPO_MAP: Record<string, { label: string; color: string }> = {
  single: { label: "Single", color: "bg-primary text-white" },
  ep:     { label: "EP",     color: "bg-blue-600 text-white" },
  album:  { label: "Álbum",  color: "bg-purple-600 text-white" },
};

const PLATFORM_COLORS: Record<string, string> = {
  Spotify:       "bg-green-500/10 text-green-400 border-green-500/30",
  "Apple Music": "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "YouTube Music":"bg-red-500/10 text-red-400 border-red-500/30",
  Deezer:        "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Tidal:         "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Beatport:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  SoundCloud:    "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Amazon:        "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
};

function PlatformBadge({ name }: { name: string }) {
  const color = PLATFORM_COLORS[name] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {name}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function LancamentoViewModal({ open, onOpenChange, lancamento }: LancamentoViewModalProps) {
  const { artistas } = useArtistas();
  const { fonogramas } = useFonogramas();

  if (!lancamento) return null;

  const artista    = artistas.find(a => a.id === lancamento.artista_id);
  const tipo       = (lancamento.tipo ?? "single").toLowerCase();
  const tipoInfo   = TIPO_MAP[tipo] ?? { label: tipo.toUpperCase(), color: "bg-muted text-muted-foreground" };
  const capaUrl    = lancamento.assets?.capa_url as string | null | undefined;

  const faixas = Array.isArray(lancamento.fonograma_ids)
    ? (lancamento.fonograma_ids as string[])
        .map(id => fonogramas.find(f => (f as any).id === id))
        .filter(Boolean)
    : [];

  const plataformas: string[] = Array.isArray(lancamento.plataformas) ? lancamento.plataformas : [];

  const idiomas: Record<string, string> = {
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

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <VisuallyHidden><DialogTitle>{lancamento.titulo}</DialogTitle></VisuallyHidden>

        {/* ── Capa + Header ── */}
        <div className="relative">
          {capaUrl ? (
            <div className="h-48 w-full overflow-hidden rounded-t-lg">
              <img
                src={capaUrl}
                alt={lancamento.titulo}
                className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent rounded-t-lg" />
            </div>
          ) : (
            <div className="h-32 w-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
              <Music className="h-12 w-12 text-primary/30" />
            </div>
          )}

          <div className={`px-6 pb-5 ${capaUrl ? "absolute bottom-0 left-0 right-0" : "pt-4"}`}>
            <div className="flex items-end gap-3">
              {capaUrl ? (
                <img
                  src={capaUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover shadow-lg border-2 border-background shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center border border-border shrink-0">
                  <Music className="h-7 w-7 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1 pb-1">
                <h2 className="text-xl font-bold truncate leading-tight">{lancamento.titulo}</h2>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {artista?.nome_artistico ?? "Artista não informado"}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={`${tipoInfo.color} border-0 text-xs no-default-hover-elevate`}>
                    {tipoInfo.label}
                  </Badge>
                  <StatusBadge status={lancamento.status} />
                  {lancamento.data_lancamento && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(lancamento.data_lancamento)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5 mt-1">

          {/* ── Identificação ── */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Identificação
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={Hash}     label="ISRC Global"  value={lancamento.isrc_global} />
              <InfoRow icon={Tag}      label="UPC / EAN"    value={lancamento.upc ?? lancamento.codigo_upc} />
              <InfoRow icon={Music}    label="Gênero"       value={lancamento.genero} />
              <InfoRow icon={Globe}    label="Idioma"       value={idiomas[lancamento.idioma] ?? lancamento.idioma} />
              <InfoRow icon={Building2} label="Gravadora"   value={lancamento.gravadora} />
              <InfoRow icon={Disc}     label="Distribuidora" value={lancamento.distribuidora} />
              <InfoRow icon={FileText} label="Copyright"    value={lancamento.copyright ?? lancamento.copyright_c} />
            </div>
          </div>

          {/* ── Plataformas ── */}
          {plataformas.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Plataformas de Distribuição
                </h3>
                <div className="flex flex-wrap gap-2">
                  {plataformas.map(p => <PlatformBadge key={p} name={p} />)}
                </div>
              </div>
            </>
          )}

          {/* ── Faixas ── */}
          {faixas.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Faixas ({faixas.length})
                </h3>
                <div className="space-y-1">
                  {faixas.map((f: any, idx) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0 tabular-nums">
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

          {/* ── Observações ── */}
          {lancamento.observacoes && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Observações
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80 bg-muted/30 rounded-lg p-3">
                  {lancamento.observacoes}
                </p>
              </div>
            </>
          )}

          {/* ── Notas Internas ── */}
          {lancamento.notas_internas && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Notas Internas
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  {lancamento.notas_internas}
                </p>
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
