import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import {
  Music, Calendar, CheckCircle2, XCircle, ExternalLink,
  FileAudio, Image, Video, FileText, Link2, BookOpen, Package,
  Clock, AlertTriangle, ChevronRight,
} from "lucide-react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { StatusBadge } from "@/shared/components/StatusBadge";

interface LancamentoViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento?: any;
}

const ASSET_DEFS = [
  { key: "audio_master_url", label: "Áudio Master (WAV/FLAC)", icon: FileAudio, isUrl: true, required: ["single", "ep", "album"] },
  { key: "capa_url", label: "Capa do Álbum (3000×3000)", icon: Image, isUrl: true, required: ["single", "ep", "album"] },
  { key: "video_clipe_url", label: "Vídeo Clipe (YouTube URL)", icon: Video, isUrl: true, required: [] },
  { key: "letra", label: "Letra da Música", icon: BookOpen, isUrl: false, required: [] },
  { key: "ficha_tecnica", label: "Ficha Técnica", icon: FileText, isUrl: false, required: ["ep", "album"] },
  { key: "press_release", label: "Press Release", icon: FileText, isUrl: false, required: ["album"] },
  { key: "epk_url", label: "EPK (Electronic Press Kit)", icon: Link2, isUrl: true, required: ["album"] },
];

const CRON_DEFS = [
  { key: "data_gravacao", label: "Gravação" },
  { key: "data_mix_master", label: "Mix & Master" },
  { key: "data_entrega_distribuidora", label: "Entrega à Distribuidora" },
];

function calcAssetsCompletude(lancamento: any) {
  const tipo = (lancamento?.tipo || "single").toLowerCase();
  const assets = lancamento?.assets ?? {};
  const required = ASSET_DEFS.filter(d => d.required.includes(tipo));
  if (required.length === 0) return { filled: 0, total: 0, pct: 100 };
  const filled = required.filter(d => {
    const v = assets[d.key];
    return v && String(v).trim();
  }).length;
  return { filled, total: required.length, pct: Math.round((filled / required.length) * 100) };
}

function isDatePast(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function LancamentoViewModal({ open, onOpenChange, lancamento }: LancamentoViewModalProps) {
  const { artistas } = useArtistas();
  const [activeTab, setActiveTab] = useState("visao-geral");

  if (!lancamento) return null;

  const artista = artistas.find(a => a.id === lancamento.artista_id);
  const assets = lancamento.assets ?? {};
  const cronograma = lancamento.cronograma ?? {};
  const { filled, total, pct } = calcAssetsCompletude(lancamento);
  const tipo = (lancamento.tipo || "single").toLowerCase();

  const tipoBadgeColor = tipo === "single" ? "bg-primary" : tipo === "ep" ? "bg-blue-600" : "bg-purple-600";
  const tipoLabel = tipo === "single" ? "Single" : tipo === "ep" ? "EP" : "Álbum";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <VisuallyHidden><DialogTitle>{lancamento.titulo}</DialogTitle></VisuallyHidden>
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{lancamento.titulo}</h2>
              <p className="text-muted-foreground text-sm">{artista?.nome_artistico || "Artista não informado"}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`${tipoBadgeColor} text-white no-default-hover-elevate`}>{tipoLabel}</Badge>
                <StatusBadge status={lancamento.status} />
                {lancamento.data_lancamento && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(lancamento.data_lancamento).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
            {total > 0 && (
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground mb-1">Assets</p>
                <p className={`text-2xl font-bold ${pct === 100 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"}`}>
                  {pct}%
                </p>
                <p className="text-xs text-muted-foreground">{filled}/{total} completos</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 shrink-0">
            {[
              { value: "visao-geral", label: "Visão Geral" },
              { value: "assets", label: "Assets" },
              { value: "cronograma", label: "Cronograma" },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                data-testid={`tab-${tab.value}`}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="overflow-y-auto flex-1">
            {/* ── Visão Geral ── */}
            <TabsContent value="visao-geral" className="p-6 space-y-6 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Distribuidora", value: lancamento.distribuidora },
                  { label: "ISRC Global", value: lancamento.isrc_global },
                  { label: "UPC", value: lancamento.upc },
                  { label: "Plataformas", value: Array.isArray(lancamento.plataformas) ? lancamento.plataformas.join(", ") : null },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm font-medium">{value || "—"}</p>
                  </div>
                ))}
              </div>

              {lancamento.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm bg-muted/30 rounded p-3">{lancamento.observacoes}</p>
                </div>
              )}

              {lancamento.notas_internas && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notas Internas</p>
                  <p className="text-sm bg-muted/30 rounded p-3">{lancamento.notas_internas}</p>
                </div>
              )}
            </TabsContent>

            {/* ── Assets ── */}
            <TabsContent value="assets" className="p-6 space-y-4 mt-0" data-testid="tab-content-assets">
              {total > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Completude dos assets obrigatórios</span>
                      <span className={`text-sm font-bold ${pct === 100 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"}`}>
                        {filled}/{total} — {pct}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {ASSET_DEFS.map(def => {
                  const Icon = def.icon;
                  const value = assets[def.key];
                  const hasValue = value && String(value).trim();
                  const isRequired = def.required.includes(tipo);

                  return (
                    <div
                      key={def.key}
                      data-testid={`asset-row-${def.key}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${hasValue ? "bg-success/5 border-success/20" : isRequired ? "bg-destructive/5 border-destructive/20" : "bg-muted/20 border-border"}`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${hasValue ? "bg-success/10" : "bg-muted"}`}>
                        {hasValue ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className={`h-4 w-4 ${isRequired ? "text-destructive" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{def.label}</span>
                          {isRequired && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">obrigatório</Badge>
                          )}
                        </div>
                        {hasValue && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {def.isUrl ? value : String(value).slice(0, 80) + (String(value).length > 80 ? "…" : "")}
                          </p>
                        )}
                      </div>
                      {hasValue && def.isUrl && (
                        <a
                          href={String(value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-asset-${def.key}`}
                          className="shrink-0"
                        >
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Abrir
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── Cronograma ── */}
            <TabsContent value="cronograma" className="p-6 space-y-4 mt-0" data-testid="tab-content-cronograma">
              <div className="space-y-3">
                {/* Etapas de produção */}
                {CRON_DEFS.map((def, index) => {
                  const dateStr = cronograma[def.key];
                  const past = isDatePast(dateStr);
                  const hasCronDate = !!dateStr;
                  const isLast = index === CRON_DEFS.length - 1;

                  return (
                    <div key={def.key} className="relative flex gap-4">
                      {!isLast && (
                        <div className="absolute left-4 top-10 w-0.5 h-full bg-border -z-0" />
                      )}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 ${hasCronDate ? (past ? "bg-success" : "bg-primary") : "bg-muted border-2 border-border"}`}>
                        {hasCronDate ? (
                          past
                            ? <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                            : <Clock className="h-4 w-4 text-primary-foreground" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>
                      <div className="pb-6 flex-1">
                        <p className="text-sm font-medium">{def.label}</p>
                        {hasCronDate ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {new Date(dateStr).toLocaleDateString("pt-BR")}
                            </span>
                            {past ? (
                              <Badge className="bg-success text-success-foreground text-[9px] h-4 px-1">Concluído</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">Pendente</Badge>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">Data não definida</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Data de lançamento */}
                {lancamento.data_lancamento && (
                  <div className="flex gap-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isDatePast(lancamento.data_lancamento) ? "bg-success" : "bg-warning"}`}>
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Lançamento Público</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {new Date(lancamento.data_lancamento).toLocaleDateString("pt-BR")}
                        </span>
                        {isDatePast(lancamento.data_lancamento) ? (
                          <Badge className="bg-success text-success-foreground text-[9px] h-4 px-1">Publicado</Badge>
                        ) : (
                          <Badge className="bg-warning text-warning-foreground text-[9px] h-4 px-1">
                            {Math.ceil((new Date(lancamento.data_lancamento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!Object.values(cronograma).some(Boolean) && !lancamento.data_lancamento && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm">Nenhuma data de cronograma definida</p>
                  <p className="text-xs mt-1">Edite o lançamento para adicionar datas</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
