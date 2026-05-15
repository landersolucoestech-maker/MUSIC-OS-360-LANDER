import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  ArrowLeft, CheckCircle, AlertTriangle, XCircle, Clock,
  Radio, Tv, Music, Mic2, Globe, Building2, Calendar,
  Send, FileDown, Link2, CheckSquare,
  Zap, ShieldCheck, DollarSign, BookOpen,
  Info
} from "lucide-react";
import { MOCK_EXECUCOES_PUBLICAS, MOCK_TIMELINE_BY_ISRC, MOCK_ECAD_HISTORICO_ISRC } from "../services/mock-data";
import type { ExecutionType, ExecutionStatus, TimelineEventType } from "../types";

const TIPO_LABEL: Record<ExecutionType, { label: string; icon: React.ReactNode }> = {
  radio_fm:          { label: "Rádio FM",       icon: <Radio className="h-4 w-4" /> },
  radio_am:          { label: "Rádio AM",       icon: <Radio className="h-4 w-4" /> },
  tv_aberta:         { label: "TV Aberta",      icon: <Tv className="h-4 w-4" /> },
  tv_fechada:        { label: "TV Fechada",     icon: <Tv className="h-4 w-4" /> },
  show_ao_vivo:      { label: "Show Ao Vivo",   icon: <Mic2 className="h-4 w-4" /> },
  web_radio:         { label: "Web Rádio",      icon: <Globe className="h-4 w-4" /> },
  casa_noturna:      { label: "Casa Noturna",   icon: <Building2 className="h-4 w-4" /> },
  evento:            { label: "Evento",         icon: <Calendar className="h-4 w-4" /> },
  cue_sheet:         { label: "Cue Sheet",      icon: <Music className="h-4 w-4" /> },
  streaming_publico: { label: "Streaming Púb.", icon: <Globe className="h-4 w-4" /> },
};

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; className: string; icon: React.ReactNode }> = {
  confirmado:    { label: "Confirmado",    className: "bg-success/15 text-success border-success/30",              icon: <CheckCircle className="h-3.5 w-3.5" /> },
  pendente:      { label: "Pendente",      className: "bg-warning/15 text-warning border-warning/30",              icon: <Clock className="h-3.5 w-3.5" /> },
  divergencia:   { label: "Divergência",  className: "bg-destructive/15 text-destructive border-destructive/30",  icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  nao_reportado: { label: "Não Reportado",className: "bg-muted text-muted-foreground border-border",               icon: <XCircle className="h-3.5 w-3.5" /> },
};

const TIMELINE_CONFIG: Record<TimelineEventType, { label: string; icon: React.ReactNode; dotClass: string; lineClass: string }> = {
  deteccao:             { label: "Detecção",              icon: <Zap className="h-3.5 w-3.5" />,       dotClass: "bg-primary border-primary/40",        lineClass: "bg-primary/20" },
  confirmacao_ecad:     { label: "Confirmação ECAD",      icon: <ShieldCheck className="h-3.5 w-3.5" />,dotClass: "bg-success border-success/40",        lineClass: "bg-success/20" },
  divergencia_aberta:   { label: "Divergência Aberta",    icon: <AlertTriangle className="h-3.5 w-3.5" />,dotClass: "bg-destructive border-destructive/40",lineClass: "bg-destructive/20" },
  divergencia_resolvida:{ label: "Divergência Resolvida", icon: <CheckCircle className="h-3.5 w-3.5" />, dotClass: "bg-success border-success/40",       lineClass: "bg-success/20" },
  envio_ecad:           { label: "Envio ao ECAD",         icon: <Send className="h-3.5 w-3.5" />,       dotClass: "bg-blue-500 border-blue-400/40",      lineClass: "bg-blue-500/20" },
  arrecadacao:          { label: "Arrecadação",           icon: <DollarSign className="h-3.5 w-3.5" />, dotClass: "bg-emerald-500 border-emerald-400/40",lineClass: "bg-emerald-500/20" },
  vinculo_catalogo:     { label: "Vínculo Catálogo",      icon: <Link2 className="h-3.5 w-3.5" />,      dotClass: "bg-violet-500 border-violet-400/40",  lineClass: "bg-violet-500/20" },
};

const ECAD_STATUS_CONFIG = {
  recebido:   { label: "Recebido",   className: "bg-success/15 text-success border-success/30" },
  pendente:   { label: "Pendente",   className: "bg-warning/15 text-warning border-warning/30" },
  divergencia:{ label: "Divergência",className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
};

type ActionModal = "resolver" | "enviar" | "exportar" | "vincular" | null;

export default function ExecucaoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<ActionModal>(null);
  const [resolvedStatus, setResolvedStatus] = useState<ExecutionStatus | null>(null);

  const exec = MOCK_EXECUCOES_PUBLICAS.find(e => e.id === id);

  if (!exec) {
    return (
      <MainLayout title="Execução não encontrada">
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <Info className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">Execução não encontrada</p>
          <p className="text-sm">O ID <code className="font-mono bg-muted px-1 py-0.5 rounded">{id}</code> não corresponde a nenhuma execução.</p>
          <Button variant="outline" onClick={() => navigate("/rights-monitoring")} className="mt-2 gap-2">
            <ArrowLeft className="h-4 w-4" />Voltar ao Rights Monitoring
          </Button>
        </div>
      </MainLayout>
    );
  }

  const currentStatus = resolvedStatus ?? exec.status;
  const statusCfg = STATUS_CONFIG[currentStatus];
  const tipoCfg = TIPO_LABEL[exec.tipo_execucao];
  const timeline = (MOCK_TIMELINE_BY_ISRC[exec.isrc] ?? []).sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
  );
  const ecadHistorico = MOCK_ECAD_HISTORICO_ISRC[exec.isrc] ?? [];
  const allDetections = MOCK_EXECUCOES_PUBLICAS.filter(e => e.isrc === exec.isrc);
  const totalArrecadado = ecadHistorico.filter(h => h.status === "recebido").reduce((s, h) => s + h.valor_arrecadado, 0);
  const totalExecucoesEcad = ecadHistorico.filter(h => h.status === "recebido").reduce((s, h) => s + h.total_execucoes, 0);

  const handleResolverDivergencia = () => {
    setResolvedStatus("confirmado");
    setActiveAction(null);
  };

  const handleExportarRelatorio = () => {
    setActiveAction(null);
  };

  return (
    <MainLayout
      title={`${exec.obra_titulo} — Detalhe de Execução`}
      description="Histórico completo de detecções e timeline ECAD"
    >
      <div className="space-y-5">

        {/* Back + Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/rights-monitoring")}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1 mt-0.5 flex-shrink-0"
            data-testid="btn-back-rights-monitoring"
          >
            <ArrowLeft className="h-4 w-4" />Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                {tipoCfg.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold leading-tight truncate">{exec.obra_titulo}</h1>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border ${statusCfg.className}`}>
                    {statusCfg.icon}{statusCfg.label}
                  </span>
                  {exec.match_ecad ? (
                    <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-md border border-success/30">✓ Match ECAD</span>
                  ) : (
                    <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/30">✗ Sem Match ECAD</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm text-muted-foreground">{exec.artista}</span>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{exec.isrc}</code>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {tipoCfg.icon}{tipoCfg.label}
                  </span>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-xs text-muted-foreground">{exec.origem}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {(currentStatus === "divergencia" || currentStatus === "nao_reportado") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => setActiveAction("resolver")}
              data-testid="btn-resolver-divergencia"
            >
              <CheckSquare className="h-3.5 w-3.5" />Resolver Divergência
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setActiveAction("enviar")}
            data-testid="btn-enviar-ecad"
          >
            <Send className="h-3.5 w-3.5" />Enviar ao ECAD
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setActiveAction("exportar")}
            data-testid="btn-exportar-relatorio"
          >
            <FileDown className="h-3.5 w-3.5" />Exportar Relatório
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setActiveAction("vincular")}
            data-testid="btn-vincular-catalogo"
          >
            <Link2 className="h-3.5 w-3.5" />Vincular ao Catálogo
          </Button>
        </div>

        {/* Action feedback banners */}
        {activeAction === "resolver" && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Confirmar resolução de divergência</p>
              <p className="text-xs text-muted-foreground mt-0.5">Isso marcará a execução como confirmada e notificará o ECAD. Esta ação não pode ser desfeita.</p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="h-7 bg-primary hover:bg-primary/90 gap-1.5" onClick={handleResolverDivergencia} data-testid="btn-confirmar-resolucao">
                  <CheckCircle className="h-3.5 w-3.5" />Confirmar
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setActiveAction(null)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        {activeAction === "enviar" && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
            <Send className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Enviar execução ao ECAD</p>
              <p className="text-xs text-muted-foreground mt-0.5">A execução será submetida via API ECAD para processamento. O status será atualizado em até 24h.</p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="h-7 bg-primary hover:bg-primary/90 gap-1.5" onClick={() => setActiveAction(null)} data-testid="btn-confirmar-envio">
                  <Send className="h-3.5 w-3.5" />Enviar
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setActiveAction(null)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        {activeAction === "exportar" && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex items-start gap-3">
            <FileDown className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Exportar relatório de execução</p>
              <p className="text-xs text-muted-foreground mt-0.5">Será gerado um PDF com histórico completo de detecções, timeline ECAD e dados de arrecadação para esta obra.</p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="h-7 bg-primary hover:bg-primary/90 gap-1.5" onClick={handleExportarRelatorio} data-testid="btn-confirmar-exportar">
                  <FileDown className="h-3.5 w-3.5" />Gerar PDF
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setActiveAction(null)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        {activeAction === "vincular" && (
          <div className="rounded-lg border border-violet-500/40 bg-violet-500/5 p-4 flex items-start gap-3">
            <Link2 className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Vincular ao catálogo interno</p>
              <p className="text-xs text-muted-foreground mt-0.5">Associar esta execução a uma obra cadastrada no catálogo do MUSIC OS 360. Pesquise pelo ISRC ou título.</p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="h-7 bg-violet-600 hover:bg-violet-700 text-white gap-1.5" onClick={() => setActiveAction(null)} data-testid="btn-confirmar-vincular">
                  <Link2 className="h-3.5 w-3.5" />Vincular
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setActiveAction(null)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Detecções Totais</p>
              <p className="text-2xl font-bold tabular-nums">{fmtNum(allDetections.length)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">para este ISRC</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Valor Estimado</p>
              <p className="text-2xl font-bold tabular-nums">{fmtBRL(exec.valor_estimado)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">esta execução</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total Arrecadado ECAD</p>
              <p className="text-2xl font-bold tabular-nums text-success">{fmtBRL(totalArrecadado)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fmtNum(totalExecucoesEcad)} execuções confirmadas</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Primeira Detecção</p>
              <p className="text-base font-bold">
                {timeline.length > 0
                  ? fmtDateTime([...timeline].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0].data_hora).date
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{exec.origem}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Timeline ── */}
          <div className="lg:col-span-3 space-y-3">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Timeline de Histórico
                </CardTitle>
                <CardDescription className="text-xs">
                  Todas as detecções e eventos desta obra em ordem cronológica reversa
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Clock className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum evento registrado</p>
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    <div className="relative">
                      {timeline.map((event, idx) => {
                        const cfg = TIMELINE_CONFIG[event.tipo];
                        const { date, time } = fmtDateTime(event.data_hora);
                        const isLast = idx === timeline.length - 1;
                        return (
                          <div key={event.id} className="flex gap-3 pb-0" data-testid={`timeline-event-${event.id}`}>
                            {/* Connector column */}
                            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 28 }}>
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-white flex-shrink-0 z-10 ${cfg.dotClass}`}>
                                {cfg.icon}
                              </div>
                              {!isLast && <div className={`w-0.5 flex-1 min-h-[28px] ${cfg.lineClass} mt-1`} />}
                            </div>
                            {/* Content */}
                            <div className={`flex-1 min-w-0 ${!isLast ? "pb-5" : "pb-2"}`}>
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-foreground">{event.descricao}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.dotClass} text-white`}>
                                      {cfg.label}
                                    </span>
                                  </div>
                                  {event.detalhe && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{event.detalhe}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {event.origem && (
                                      <span className="text-xs text-muted-foreground/70">Fonte: {event.origem}</span>
                                    )}
                                    {event.usuario && (
                                      <span className="text-xs text-muted-foreground/70">Por: {event.usuario}</span>
                                    )}
                                    {event.valor !== undefined && (
                                      <span className="text-xs font-semibold text-success">{fmtBRL(event.valor)}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-medium text-foreground/70">{date}</p>
                                  <p className="text-xs text-muted-foreground">{time}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Other detections of same ISRC */}
            {allDetections.length > 1 && (
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Outras Detecções do Mesmo ISRC</CardTitle>
                  <CardDescription className="text-xs">Todas as execuções monitoradas com ISRC {exec.isrc}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead className="hidden lg:table-cell">Data</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Valor Est.</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDetections.map(det => {
                        const sCfg = STATUS_CONFIG[det.status];
                        const tCfg = TIPO_LABEL[det.tipo_execucao];
                        const dt = fmtDateTime(det.data_hora);
                        return (
                          <TableRow
                            key={det.id}
                            className={`cursor-pointer ${det.id === exec.id ? "bg-primary/5" : ""}`}
                            onClick={() => navigate(`/rights-monitoring/execucao/${det.id}`)}
                            data-testid={`row-detection-${det.id}`}
                          >
                            <TableCell className="py-2.5">
                              <span className="text-sm">{det.origem}</span>
                              {det.id === exec.id && <span className="ml-2 text-xs text-primary font-medium">(atual)</span>}
                            </TableCell>
                            <TableCell className="py-2.5 hidden md:table-cell">
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                                {tCfg.icon}{tCfg.label}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 text-xs text-muted-foreground hidden lg:table-cell">{dt.date} {dt.time}</TableCell>
                            <TableCell className="py-2.5 text-right text-sm font-medium tabular-nums hidden sm:table-cell">{fmtBRL(det.valor_estimado)}</TableCell>
                            <TableCell className="py-2.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${sCfg.className}`}>
                                {sCfg.icon}{sCfg.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── ECAD History sidebar ── */}
          <div className="lg:col-span-2 space-y-3">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  Histórico de Arrecadação ECAD
                </CardTitle>
                <CardDescription className="text-xs">
                  Valores recebidos por período para o ISRC {exec.isrc}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {ecadHistorico.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground px-4">
                    <DollarSign className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm text-center">Sem histórico de arrecadação ECAD para este ISRC</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {ecadHistorico.map(hist => {
                      const sCfg = ECAD_STATUS_CONFIG[hist.status];
                      return (
                        <div key={hist.id} className="px-4 py-3" data-testid={`ecad-hist-${hist.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{hist.periodo}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(hist.data_referencia).toLocaleDateString("pt-BR")}
                              </p>
                              {hist.total_execucoes > 0 && (
                                <p className="text-xs text-muted-foreground">{fmtNum(hist.total_execucoes)} execuções</p>
                              )}
                              {hist.observacoes && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{hist.observacoes}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-bold tabular-nums ${hist.status === "recebido" ? "text-success" : hist.status === "divergencia" ? "text-destructive" : "text-muted-foreground"}`}>
                                {hist.status === "recebido" ? fmtBRL(hist.valor_arrecadado) : hist.status === "pendente" ? "Pendente" : "—"}
                              </p>
                              <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded border mt-1 ${sCfg.className}`}>
                                {sCfg.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Execution metadata card */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Detalhes da Execução</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">ID</p>
                    <code className="font-mono text-foreground">{exec.id}</code>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">ISRC</p>
                    <code className="font-mono text-foreground">{exec.isrc}</code>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Artista</p>
                    <p className="text-foreground">{exec.artista}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Origem</p>
                    <p className="text-foreground">{exec.origem}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Tipo</p>
                    <p className="text-foreground">{TIPO_LABEL[exec.tipo_execucao].label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Data / Hora</p>
                    <p className="text-foreground">{fmtDateTime(exec.data_hora).full}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Valor Estimado</p>
                    <p className="text-foreground font-semibold">{fmtBRL(exec.valor_estimado)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Match ECAD</p>
                    <p className={`font-semibold ${exec.match_ecad ? "text-success" : "text-destructive"}`}>
                      {exec.match_ecad ? "✓ Sim" : "✗ Não"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
