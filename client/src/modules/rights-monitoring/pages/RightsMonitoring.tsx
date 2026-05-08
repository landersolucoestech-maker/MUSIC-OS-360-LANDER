import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Shield, Radio, Search, RefreshCw, Upload, FileText,
  Mic2, AlertTriangle, FileSearch, ChevronDown, Globe, CheckCircle, Clock
} from "lucide-react";
import { RightsKPICards } from "../components/RightsKPICards";
import { ExecucoesTable } from "../components/ExecucoesTable";
import { DivergenciasPanel, MOCK_DIVERGENCIAS } from "../components/DivergenciasPanel";
import { EcadImportModal } from "../components/EcadImportModal";
import {
  MOCK_EXECUCOES_PUBLICAS,
  MOCK_BROADCAST_DETECTIONS,
  MOCK_CUE_SHEETS,
  MOCK_SETLISTS,
  MOCK_ECAD_IMPORTS,
  MOCK_ECAD_PERIODOS,
} from "../services/mock-data";
import type { RightsExecution } from "../types";

type Tab = "overview" | "radio_tv" | "shows_setlists" | "cue_sheets" | "divergencias" | "auditoria" | "importacoes";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

const STATUS_ECAD: Record<string, { label: string; className: string }> = {
  recebido:   { label: "Recebido",   className: "bg-success/15 text-success border-success/30" },
  pendente:   { label: "Pendente",   className: "bg-warning/15 text-warning border-warning/30" },
  processado: { label: "Processado", className: "bg-primary/15 text-primary border-primary/30" },
  erro:       { label: "Erro",       className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function RightsMonitoring() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);

  const execucoes = MOCK_EXECUCOES_PUBLICAS;

  const filtered = useMemo(() => {
    if (!search.trim()) return execucoes;
    const q = search.toLowerCase();
    return execucoes.filter(e =>
      e.obra_titulo.toLowerCase().includes(q) ||
      e.artista.toLowerCase().includes(q) ||
      e.origem.toLowerCase().includes(q) ||
      e.isrc.toLowerCase().includes(q)
    );
  }, [execucoes, search]);

  const confirmados   = execucoes.filter(e => e.status === "confirmado").length;
  const naoReportados = execucoes.filter(e => e.status === "nao_reportado").length;
  const divergencias  = execucoes.filter(e => e.status === "divergencia").length;
  const pendentes     = execucoes.filter(e => e.status === "pendente").length;
  const matchRate     = execucoes.length > 0 ? Math.round(((confirmados) / execucoes.length) * 100) : 0;
  const valorEstimado = execucoes.reduce((s, e) => s + e.valor_estimado, 0);
  const valorRecebido = MOCK_ECAD_PERIODOS.filter(p => p.status === "recebido").reduce((s, p) => s + p.valor_total, 0);

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview",        label: "Overview",        icon: <Shield className="h-4 w-4" /> },
    { key: "radio_tv",        label: "Rádio & TV",      icon: <Radio className="h-4 w-4" />, badge: MOCK_BROADCAST_DETECTIONS.length },
    { key: "shows_setlists",  label: "Shows & Setlists",icon: <Mic2 className="h-4 w-4" />, badge: MOCK_SETLISTS.length },
    { key: "cue_sheets",      label: "Cue Sheets",      icon: <FileText className="h-4 w-4" />, badge: MOCK_CUE_SHEETS.length },
    { key: "divergencias",    label: "Divergências",    icon: <AlertTriangle className="h-4 w-4" />, badge: MOCK_DIVERGENCIAS.filter(d => d.status !== "resolvida").length },
    { key: "auditoria",       label: "Auditoria",       icon: <FileSearch className="h-4 w-4" /> },
    { key: "importacoes",     label: "Importações ECAD",icon: <Upload className="h-4 w-4" />, badge: MOCK_ECAD_IMPORTS.length },
  ];

  return (
    <MainLayout title="Rights Monitoring" description="Monitoramento de execução pública, auditoria ECAD e reconciliação de royalties">
      <div className="space-y-5">

        {/* Header actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Rights Monitoring</h1>
              <p className="text-xs text-muted-foreground">ECAD Intelligence · Broadcast Tracking · Reconciliação</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />Sincronizar
            </Button>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setImportModalOpen(true)}>
              <Upload className="h-3.5 w-3.5" />Importar ECAD
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <RightsKPICards
          total={execucoes.length}
          confirmados={confirmados}
          naoReportados={naoReportados}
          divergencias={divergencias}
          matchRate={matchRate}
          valorEstimado={valorEstimado}
          valorRecebido={valorRecebido}
        />

        {/* Tab bar */}
        <div className="flex items-center gap-1 flex-wrap border-b border-border/60 pb-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Execuções Públicas Detectadas</CardTitle>
                <CardDescription className="text-xs">Rádio · TV · Shows · Eventos · Web Rádios · Casas Noturnas</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar música, artista, origem, ISRC..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 w-72 h-8 text-sm bg-background"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ExecucoesTable
                execucoes={filtered}
                onViewDetail={(exec) => navigate(`/rights-monitoring/execucao/${exec.id}`)}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Rádio & TV ── */}
        {activeTab === "radio_tv" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Broadcast Detections — Rádio & TV</CardTitle>
              <CardDescription className="text-xs">Execuções detectadas via fingerprinting em emissoras de rádio e televisão</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Música / Artista</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Emissora</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Canal</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Tipo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Data/Hora</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">ISRC</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Valor Est.</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {MOCK_BROADCAST_DETECTIONS.map(det => {
                      const statusMap: Record<string, string> = {
                        confirmado:    "bg-success/15 text-success border-success/30",
                        pendente:      "bg-warning/15 text-warning border-warning/30",
                        divergencia:   "bg-destructive/15 text-destructive border-destructive/30",
                        nao_reportado: "bg-muted text-muted-foreground border-border",
                      };
                      const dt = new Date(det.data_hora);
                      return (
                        <tr key={det.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold">{det.obra_titulo}</p>
                            <p className="text-xs text-muted-foreground">{det.artista}</p>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell text-sm">{det.emissora}</td>
                          <td className="py-3 px-4 hidden lg:table-cell text-xs text-muted-foreground">{det.canal}</td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <span className="text-xs bg-muted/50 px-2 py-1 rounded-md capitalize">{det.tipo.replace("_", " ")}</span>
                          </td>
                          <td className="py-3 px-4 hidden xl:table-cell text-xs text-muted-foreground">
                            {dt.toLocaleDateString("pt-BR")} {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-4 hidden xl:table-cell">
                            <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{det.isrc}</code>
                          </td>
                          <td className="py-3 px-4 text-right hidden md:table-cell text-sm font-medium tabular-nums">{fmtBRL(det.valor_estimado)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md border ${statusMap[det.status] ?? ""}`}>
                              {det.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Shows & Setlists ── */}
        {activeTab === "shows_setlists" && (
          <div className="space-y-3">
            {MOCK_SETLISTS.map(sl => {
              const slStatusMap: Record<string, string> = {
                confirmado: "bg-success/15 text-success border-success/30",
                enviado:    "bg-primary/15 text-primary border-primary/30",
                pendente:   "bg-warning/15 text-warning border-warning/30",
              };
              return (
                <Card key={sl.id} className="border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-sm">{sl.evento}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sl.artista} · {sl.local} · {sl.data}</p>
                      </div>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md border flex-shrink-0 ${slStatusMap[sl.status] ?? ""}`}>
                        {sl.status}
                      </span>
                    </div>
                    <div className="border-t border-border/40 pt-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left pb-2 font-semibold">#</th>
                            <th className="text-left pb-2 font-semibold">Música</th>
                            <th className="text-left pb-2 font-semibold hidden sm:table-cell">Compositor</th>
                            <th className="text-left pb-2 font-semibold hidden md:table-cell">ISRC</th>
                            <th className="text-right pb-2 font-semibold">Duração</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {sl.musicas.map(m => (
                            <tr key={m.ordem}>
                              <td className="py-1.5 pr-3 text-muted-foreground">{m.ordem}</td>
                              <td className="py-1.5 font-medium">{m.obra_titulo}</td>
                              <td className="py-1.5 text-muted-foreground hidden sm:table-cell">{m.compositor}</td>
                              <td className="py-1.5 hidden md:table-cell"><code className="font-mono text-muted-foreground">{m.isrc}</code></td>
                              <td className="py-1.5 text-right text-muted-foreground">{Math.floor(m.duracao_segundos / 60)}:{String(m.duracao_segundos % 60).padStart(2, "0")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Cue Sheets ── */}
        {activeTab === "cue_sheets" && (
          <div className="space-y-3">
            {MOCK_CUE_SHEETS.map(cs => {
              const csStatusMap: Record<string, string> = {
                aprovado:   "bg-success/15 text-success border-success/30",
                pendente:   "bg-warning/15 text-warning border-warning/30",
                enviado:    "bg-primary/15 text-primary border-primary/30",
                divergencia:"bg-destructive/15 text-destructive border-destructive/30",
              };
              return (
                <Card key={cs.id} className="border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-sm">{cs.producao}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{cs.canal}{cs.episodio ? ` · ${cs.episodio}` : ""} · {cs.data_exibicao}</p>
                      </div>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md border flex-shrink-0 ${csStatusMap[cs.status] ?? ""}`}>
                        {cs.status}
                      </span>
                    </div>
                    <div className="border-t border-border/40 pt-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left pb-2 font-semibold">Música</th>
                            <th className="text-left pb-2 font-semibold hidden sm:table-cell">Compositor</th>
                            <th className="text-left pb-2 font-semibold hidden md:table-cell">Publisher</th>
                            <th className="text-left pb-2 font-semibold">Tipo de Uso</th>
                            <th className="text-right pb-2 font-semibold">Duração</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {cs.obras.map((o, i) => (
                            <tr key={i}>
                              <td className="py-1.5 font-medium">{o.obra_titulo}</td>
                              <td className="py-1.5 text-muted-foreground hidden sm:table-cell">{o.compositor}</td>
                              <td className="py-1.5 text-muted-foreground hidden md:table-cell">{o.publisher}</td>
                              <td className="py-1.5"><span className="bg-muted/50 px-1.5 py-0.5 rounded text-xs">{o.tipo_uso.replace("_", " ")}</span></td>
                              <td className="py-1.5 text-right text-muted-foreground">{Math.floor(o.duracao_segundos / 60)}:{String(o.duracao_segundos % 60).padStart(2, "0")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Divergências ── */}
        {activeTab === "divergencias" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Painel de Divergências
              </CardTitle>
              <CardDescription className="text-xs">
                Inconsistências detectadas entre execuções monitoradas e relatórios ECAD
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DivergenciasPanel divergencias={MOCK_DIVERGENCIAS} />
            </CardContent>
          </Card>
        )}

        {/* ── Auditoria ── */}
        {activeTab === "auditoria" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Auditoria ECAD</CardTitle>
              <CardDescription className="text-xs">Histórico de períodos e arrecadação por trimestre</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Data Referência</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor Total</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {MOCK_ECAD_PERIODOS.map(p => {
                      const cfg = STATUS_ECAD[p.status] ?? { label: p.status, className: "bg-muted text-muted-foreground border-border" };
                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold">{p.periodo}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">
                            {new Date(p.data_referencia).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 text-right font-medium tabular-nums">
                            {fmtBRL(p.valor_total)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md border ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground hidden lg:table-cell">{p.observacoes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Importações ECAD ── */}
        {activeTab === "importacoes" && (
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Histórico de Importações ECAD</CardTitle>
                <CardDescription className="text-xs">Pipeline: Upload → Parser → Normalização → Match → Conciliação</CardDescription>
              </div>
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setImportModalOpen(true)}>
                <Upload className="h-3.5 w-3.5" />Nova Importação
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Arquivo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Período</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Data Importação</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Execuções</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor Total</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linhas</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {MOCK_ECAD_IMPORTS.map(imp => {
                      const impStatus: Record<string, string> = {
                        processado: "bg-success/15 text-success border-success/30",
                        pendente:   "bg-warning/15 text-warning border-warning/30",
                        erro:       "bg-destructive/15 text-destructive border-destructive/30",
                        parcial:    "bg-orange-500/15 text-orange-600 border-orange-400/30",
                      };
                      return (
                        <tr key={imp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate max-w-[180px]">{imp.arquivo}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm hidden md:table-cell">{imp.periodo}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                            {new Date(imp.data_importacao).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">{fmtNum(imp.total_execucoes)}</td>
                          <td className="py-3 px-4 text-right font-medium tabular-nums">{fmtBRL(imp.valor_total)}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs">
                              <span className="text-success font-medium">{imp.linhas_ok}</span>
                              {imp.linhas_erro > 0 && <span className="text-destructive font-medium"> · {imp.linhas_erro} erro</span>}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md border ${impStatus[imp.status] ?? ""}`}>
                              {imp.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      <EcadImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </MainLayout>
  );
}
