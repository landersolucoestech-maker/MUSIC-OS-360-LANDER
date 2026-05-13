import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Shield, Radio, Search, RefreshCw, Upload, FileText,
  Mic2, AlertTriangle, FileSearch, Globe, CheckCircle, Clock, X
} from "lucide-react";
import { RightsKPICards } from "../components/RightsKPICards";
import { ExecucoesTable } from "../components/ExecucoesTable";
import { DivergenciasPanel, MOCK_DIVERGENCIAS } from "../components/DivergenciasPanel";
import type { Divergencia } from "../components/DivergenciasPanel";
import { EcadImportModal } from "../components/EcadImportModal";
import { ExecucaoDetailModal } from "../components/ExecucaoDetailModal";
import {
  MOCK_EXECUCOES_PUBLICAS,
  MOCK_BROADCAST_DETECTIONS,
  MOCK_CUE_SHEETS,
  MOCK_SETLISTS,
  MOCK_ECAD_PERIODOS,
} from "../services/mock-data";
import { getIsrcIndex, computeEcadMatchRate, findOrphanIsrcs, getCatalogArtistas } from "../services/catalog-lookup";
import type { RightsExecution } from "../types";
import { FeatureGate } from '@/shared/components/FeatureGate';

type Tab = "overview" | "radio_tv" | "shows_setlists" | "cue_sheets" | "divergencias" | "auditoria";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [artistaFilter, setArtistFilter] = useState("all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedExec, setSelectedExec] = useState<RightsExecution | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Refresh counter — bump to rebuild the ISRC index from catalog on demand
  const [catalogRevision, setCatalogRevision] = useState(0);

  // Build ISRC → obra index from catalog; rebuilds when catalogRevision changes
  const isrcIndex = useMemo(() => getIsrcIndex(), [catalogRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSyncCatalog() {
    setCatalogRevision(r => r + 1);
  }

  // Enrich executions with catalog obra data via ISRC lookup.
  // match_ecad is derived from catalog: obra must exist AND have cod_ecad
  // (aligns per-row Match badge semantics with the KPI match-rate logic).
  const execucoes: RightsExecution[] = useMemo(() =>
    MOCK_EXECUCOES_PUBLICAS.map((exec) => {
      const obra = isrcIndex.get(exec.isrc);
      if (!obra) return { ...exec, match_ecad: false };
      const hasEcad = Boolean(obra.cod_ecad);
      return {
        ...exec,
        match_ecad: hasEcad,
        obra_catalog: {
          compositor: obra.compositor,
          compositores: obra.compositores,
          co_compositores: obra.co_compositores,
          editora: obra.editora,
          detentores: obra.detentores,
          iswc: obra.iswc,
          cod_ecad: obra.cod_ecad,
          cod_abramus: obra.cod_abramus,
          genero: obra.genero,
          duracao: obra.duracao,
          catalog_id: obra.id,
          catalog_status: obra.status,
        },
      };
    }),
    [isrcIndex],
  );

  // Catalog artistas for dropdown — sourced from catalog, rebuilt when catalog is synced
  const artistaOptions = useMemo(() => getCatalogArtistas(), [catalogRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters = search.trim() !== "" || dateFrom !== "" || dateTo !== "" || artistaFilter !== "all";

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setArtistFilter("all");
  }

  const filtered = useMemo(() => {
    return execucoes.filter(e => {
      if (artistaFilter !== "all" && e.artista !== artistaFilter) return false;
      if (dateFrom) {
        const execDate = e.data_hora.split("T")[0];
        if (execDate < dateFrom) return false;
      }
      if (dateTo) {
        const execDate = e.data_hora.split("T")[0];
        if (execDate > dateTo) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          e.obra_titulo.toLowerCase().includes(q) ||
          e.artista.toLowerCase().includes(q) ||
          e.origem.toLowerCase().includes(q) ||
          e.isrc.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [execucoes, search, dateFrom, dateTo, artistaFilter]);

  const confirmados   = filtered.filter(e => e.status === "confirmado").length;
  const naoReportados = filtered.filter(e => e.status === "nao_reportado").length;
  const divergencias  = filtered.filter(e => e.status === "divergencia").length;

  // All unique ISRCs (unfiltered) — needed for orphan detection and valorRecebido
  const uniqueIsrcs = useMemo(() => [...new Set(execucoes.map(e => e.isrc))], [execucoes]);
  // Match rate reflects the filtered scope so it stays consistent with the other KPIs
  const filteredUniqueIsrcs = useMemo(() => [...new Set(filtered.map(e => e.isrc))], [filtered]);
  const matchRate = computeEcadMatchRate(filteredUniqueIsrcs, isrcIndex);

  const valorEstimado = filtered.reduce((s, e) => s + e.valor_estimado, 0);
  const valorRecebido = MOCK_ECAD_PERIODOS.filter(p => p.status === "recebido").reduce((s, p) => s + p.valor_total, 0);

  // Build dynamic divergências for orphan ISRCs (no obra in catalog)
  const orphanIsrcs = useMemo(() => findOrphanIsrcs(uniqueIsrcs, isrcIndex), [uniqueIsrcs, isrcIndex]);
  const orphanExecs = useMemo(() =>
    execucoes.filter(e => orphanIsrcs.includes(e.isrc)),
    [execucoes, orphanIsrcs],
  );

  const dynamicDivergencias: Divergencia[] = useMemo(() =>
    orphanExecs.map((exec, i) => ({
      id: `dyn-orphan-${i}`,
      tipo: "Execução sem obra cadastrada",
      descricao: `Execução detectada em "${exec.origem}" mas o ISRC ${exec.isrc} não possui obra correspondente no catálogo interno. Cadastre a obra para habilitar a conciliação ECAD.`,
      obra: exec.obra_titulo !== "Track Desconhecida" ? exec.obra_titulo : undefined,
      isrc: exec.isrc,
      origem: exec.origem,
      severity: "media" as const,
      risco_score: 52,
      data: exec.data_hora.split("T")[0],
      status: "aberta" as const,
    })),
    [orphanExecs],
  );

  // Merge static + dynamic divergências (remove static div-005 which is now superseded by dynamic)
  const allDivergencias: Divergencia[] = useMemo(() => {
    const staticFiltered = MOCK_DIVERGENCIAS.filter(d => d.id !== "div-005");
    return [...staticFiltered, ...dynamicDivergencias];
  }, [dynamicDivergencias]);

  const openDivergencias = allDivergencias.filter(d => d.status !== "resolvida");

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview",        label: "Overview",        icon: <Shield className="h-4 w-4" /> },
    { key: "radio_tv",        label: "Rádio & TV",      icon: <Radio className="h-4 w-4" />, badge: MOCK_BROADCAST_DETECTIONS.length },
    { key: "shows_setlists",  label: "Shows & Setlists",icon: <Mic2 className="h-4 w-4" />, badge: MOCK_SETLISTS.length },
    { key: "cue_sheets",      label: "Cue Sheets",      icon: <FileText className="h-4 w-4" />, badge: MOCK_CUE_SHEETS.length },
    { key: "divergencias",    label: "Divergências",    icon: <AlertTriangle className="h-4 w-4" />, badge: openDivergencias.length },
    { key: "auditoria",       label: "Auditoria",       icon: <FileSearch className="h-4 w-4" /> },
  ];

  function handleViewDetail(exec: RightsExecution) {
    setSelectedExec(exec);
    setDetailOpen(true);
  }

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
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSyncCatalog}>
              <RefreshCw className="h-3.5 w-3.5" />Sincronizar
            </Button>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setImportModalOpen(true)}>
              <Upload className="h-3.5 w-3.5" />Importar ECAD
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <RightsKPICards
          total={filtered.length}
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
            <CardHeader className="pb-3 space-y-3">
              <div className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Execuções Públicas Detectadas</CardTitle>
                  <CardDescription className="text-xs">
                    Rádio · TV · Shows · Eventos · Web Rádios · Casas Noturnas
                    {orphanIsrcs.length > 0 && (
                      <span className="ml-2 text-destructive font-medium">
                        · {orphanIsrcs.length} ISRC{orphanIsrcs.length > 1 ? "s" : ""} sem obra no catálogo
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>

              {/* Filter row */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar música, artista, origem, ISRC..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm bg-background"
                    data-testid="input-search-execucoes"
                  />
                </div>

                <Select value={artistaFilter} onValueChange={setArtistFilter}>
                  <SelectTrigger className="h-8 text-xs w-44" data-testid="select-artista-filter">
                    <SelectValue placeholder="Todos os artistas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os artistas</SelectItem>
                    {artistaOptions.map(a => (
                      <SelectItem key={a.id} value={a.nome_artistico}>{a.nome_artistico}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="h-8 text-xs w-36 bg-background"
                    data-testid="input-date-from"
                    title="Data inicial"
                  />
                  <span className="text-muted-foreground text-xs px-1">até</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="h-8 text-xs w-36 bg-background"
                    data-testid="input-date-to"
                    title="Data final"
                    min={dateFrom || undefined}
                  />
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ExecucoesTable execucoes={filtered} onViewDetail={handleViewDetail} />
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
                      const catalogObra = isrcIndex.get(det.isrc);
                      return (
                        <tr key={det.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold">{det.obra_titulo}</p>
                            <p className="text-xs text-muted-foreground">{det.artista}</p>
                            {catalogObra && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5">
                                {catalogObra.compositor} · {catalogObra.editora}
                              </p>
                            )}
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
                            <div>
                              <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{det.isrc}</code>
                              {catalogObra?.cod_ecad && (
                                <p className="text-xs text-muted-foreground mt-0.5">{catalogObra.cod_ecad}</p>
                              )}
                            </div>
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
                            <th className="text-left pb-2 font-semibold hidden lg:table-cell">Publisher</th>
                            <th className="text-right pb-2 font-semibold">Duração</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {sl.musicas.map(m => {
                            const catalogObra = isrcIndex.get(m.isrc);
                            return (
                              <tr key={m.ordem}>
                                <td className="py-1.5 pr-3 text-muted-foreground">{m.ordem}</td>
                                <td className="py-1.5 font-medium">{m.obra_titulo}</td>
                                <td className="py-1.5 text-muted-foreground hidden sm:table-cell">{m.compositor}</td>
                                <td className="py-1.5 hidden md:table-cell">
                                  <code className="font-mono text-muted-foreground">{m.isrc}</code>
                                </td>
                                <td className="py-1.5 text-muted-foreground hidden lg:table-cell">
                                  {catalogObra?.editora ?? <span className="text-warning text-xs">Sem publisher</span>}
                                </td>
                                <td className="py-1.5 text-right text-muted-foreground">{Math.floor(m.duracao_segundos / 60)}:{String(m.duracao_segundos % 60).padStart(2, "0")}</td>
                              </tr>
                            );
                          })}
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
                            <th className="text-left pb-2 font-semibold hidden lg:table-cell">Cód. ECAD</th>
                            <th className="text-left pb-2 font-semibold">Tipo de Uso</th>
                            <th className="text-right pb-2 font-semibold">Duração</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {cs.obras.map((o, i) => {
                            const catalogObra = isrcIndex.get(o.isrc);
                            return (
                              <tr key={i}>
                                <td className="py-1.5 font-medium">{o.obra_titulo}</td>
                                <td className="py-1.5 text-muted-foreground hidden sm:table-cell">
                                  {catalogObra?.compositor ?? o.compositor}
                                </td>
                                <td className="py-1.5 text-muted-foreground hidden md:table-cell">
                                  {catalogObra?.editora ?? o.publisher}
                                </td>
                                <td className="py-1.5 hidden lg:table-cell">
                                  {catalogObra?.cod_ecad
                                    ? <code className="font-mono text-success text-xs">{catalogObra.cod_ecad}</code>
                                    : <span className="text-warning text-xs">Sem cod_ecad</span>
                                  }
                                </td>
                                <td className="py-1.5"><span className="bg-muted/50 px-1.5 py-0.5 rounded text-xs">{o.tipo_uso.replace("_", " ")}</span></td>
                                <td className="py-1.5 text-right text-muted-foreground">{Math.floor(o.duracao_segundos / 60)}:{String(o.duracao_segundos % 60).padStart(2, "0")}</td>
                              </tr>
                            );
                          })}
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
                {orphanIsrcs.length > 0 && (
                  <span className="ml-1 text-destructive font-medium">
                    · {orphanIsrcs.length} ISRC{orphanIsrcs.length > 1 ? "s" : ""} sem obra no catálogo
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DivergenciasPanel divergencias={allDivergencias} />
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
                        <FeatureGate feature="moduleMonitoring" featureName="Monitoramento">
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
                        </FeatureGate>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Modals */}
        <EcadImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
        <ExecucaoDetailModal
          exec={selectedExec}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />

      </div>
    </MainLayout>
  );
}
