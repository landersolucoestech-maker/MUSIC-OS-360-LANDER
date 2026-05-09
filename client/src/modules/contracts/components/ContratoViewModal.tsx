import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import {
  FileText, ExternalLink, Send, History, Music, Clock, AlertCircle, Info, User,
} from "lucide-react";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import type { LancamentoWithRelations } from "@/modules/releases/hooks/useLancamentos";
import type { ContratoWithRelations, ContratoVersao } from "@/modules/contracts/hooks/useContratos";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatDate, formatCurrency } from "@/shared/lib/format-utils";

interface ContratoViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato?: ContratoWithRelations;
}

export function ContratoViewModal({ open, onOpenChange, contrato }: ContratoViewModalProps) {
  const { lancamentos } = useLancamentos();
  const navigate = useNavigate();

  if (!contrato) return null;

  const lancamentoVinculado: LancamentoWithRelations | undefined = contrato.lancamento_id
    ? lancamentos.find((l) => l.id === contrato.lancamento_id)
    : undefined;

  const versoes: ContratoVersao[] = Array.isArray(contrato.versoes)
    ? (contrato.versoes as ContratoVersao[])
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const dataFim = contrato.data_fim ? new Date(contrato.data_fim) : null;
  const expirando = dataFim && dataFim >= today && dataFim <= in30Days;
  const diasRestantes = dataFim
    ? Math.ceil((dataFim.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {contrato.titulo}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={contrato.status} />
                {expirando && (
                  <Badge className="bg-warning/10 text-warning border-warning/20 text-[11px] border gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Expira em {diasRestantes}d
                  </Badge>
                )}
                {contrato.exclusivo && (
                  <Badge variant="outline" className="text-[11px]">Exclusivo</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Tabs ── */}
        <Tabs defaultValue="informacoes" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 shrink-0">
            {[
              { value: "informacoes", label: "Informações" },
              { value: "arquivo", label: "Arquivo" },
              { value: "versoes", label: `Versões${versoes.length > 0 ? ` (${versoes.length})` : ""}` },
              { value: "lancamento", label: "Lançamento" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                data-testid={`tab-contrato-${tab.value}`}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            {/* ── Informações ── */}
            <TabsContent value="informacoes" className="p-6 space-y-5 mt-0">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { label: "Artista / Cliente", value: contrato.artistas?.nome_artistico || contrato.clientes?.nome || "—" },
                  { label: "Tipo", value: contrato.tipo || "—" },
                  { label: "Início", value: formatDate(contrato.data_inicio) || "—" },
                  { label: "Término", value: formatDate(contrato.data_fim) || "Indeterminado" },
                  { label: "Valor", value: contrato.valor != null ? formatCurrency(contrato.valor) : "—" },
                  { label: "Assinado em", value: formatDate(contrato.assinado_em) || "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {contrato.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">{contrato.observacoes}</p>
                </div>
              )}

              {contrato.autentique_doc_id && (
                <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
                  <Info className="h-4 w-4 text-success shrink-0" />
                  <p className="text-xs text-success">
                    Documento enviado via Autentique — ID:{" "}
                    <span className="font-mono">{contrato.autentique_doc_id}</span>
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ── Arquivo ── */}
            <TabsContent value="arquivo" className="p-6 mt-0" data-testid="tab-content-arquivo">
              {contrato.arquivo_url ? (
                <Card className="bg-muted/20">
                  <CardContent className="p-8 flex flex-col items-center gap-5 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1">{contrato.titulo}</p>
                      <p className="text-xs text-muted-foreground font-mono break-all max-w-sm mx-auto">
                        {contrato.arquivo_url}
                      </p>
                    </div>
                    <Button asChild className="gap-2" data-testid="button-open-arquivo">
                      <a href={contrato.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Abrir PDF
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Nenhum arquivo vinculado</p>
                  <p className="text-xs mt-1">Edite o contrato para adicionar a URL do PDF</p>
                </div>
              )}
            </TabsContent>

            {/* ── Versões (histórico documental) ── */}
            <TabsContent value="versoes" className="p-6 mt-0" data-testid="tab-content-versoes">
              {versoes.length > 0 ? (
                <div className="space-y-3">
                  {versoes.map((v, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-muted/20 border border-border rounded-lg"
                      data-testid={`versao-row-${index}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <History className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{v.versao}</span>
                          {index === versoes.length - 1 && (
                            <Badge className="bg-success/10 text-success border border-success/20 text-[9px] h-4 px-1">
                              Atual
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {v.criado_em ? new Date(v.criado_em).toLocaleDateString("pt-BR") : "—"}
                        </p>
                        {v.autor && (
                          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {v.autor}
                          </p>
                        )}
                        {v.notas && (
                          <p className="text-xs text-muted-foreground">{v.notas}</p>
                        )}
                      </div>
                      {v.url && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0" asChild>
                          <a href={v.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            Abrir
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <History className="h-12 w-12 mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Sem histórico de versões</p>
                  <p className="text-xs mt-1">As versões do documento aparecerão aqui ao editar o arquivo</p>
                </div>
              )}
            </TabsContent>

            {/* ── Lançamento ── */}
            <TabsContent value="lancamento" className="p-6 mt-0" data-testid="tab-content-lancamento">
              {lancamentoVinculado ? (
                <Card className="bg-muted/20">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{lancamentoVinculado.titulo}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {lancamentoVinculado.tipo || "—"}
                        </Badge>
                        <StatusBadge status={lancamentoVinculado.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Distribuidora</p>
                          <p className="text-xs font-medium">{lancamentoVinculado.distribuidora || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Data de lançamento</p>
                          <p className="text-xs font-medium">
                            {lancamentoVinculado.data_lancamento
                              ? new Date(lancamentoVinculado.data_lancamento).toLocaleDateString("pt-BR")
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5 text-xs"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/lancamentos?view=${lancamentoVinculado.id}`);
                        }}
                        data-testid="button-ver-lancamento"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver em Lançamentos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Music className="h-12 w-12 mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Sem lançamento vinculado</p>
                  <p className="text-xs mt-1">Edite o contrato para vincular um lançamento</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-3 border-t border-border gap-2 flex-wrap shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {/* Placeholder para futura integração Autentique */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 opacity-50 cursor-not-allowed"
            disabled
            title="Integração Autentique — em breve"
            data-testid="button-autentique-disabled"
          >
            <Send className="h-3.5 w-3.5" />
            Enviar para Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
