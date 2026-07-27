import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import {
  Shield, Radio, Search, RefreshCw, Upload, FileText,
  Mic2, AlertTriangle, FileSearch, X, Trash2
} from "lucide-react";
import { RightsKPICards } from "../components/RightsKPICards";
import { ExecucoesTable } from "../components/ExecucoesTable";
import { DivergenciasPanel } from "../components/DivergenciasPanel";
import { ResolverDivergenciaModal } from "../components/ResolverDivergenciaModal";
import type { Divergencia } from "../components/DivergenciasPanel";
import { EcadImportModal } from "../components/EcadImportModal";
import { ExecucaoDetailModal } from "../components/ExecucaoDetailModal";
import { formatRightsDate, formatRightsDateTime } from "../utils/date-format";
import {
  RIGHTS_EXECUCOES as MOCK_EXECUCOES_PUBLICAS,
  RIGHTS_BROADCAST_DETECTIONS as MOCK_BROADCAST_DETECTIONS,
  RIGHTS_CUE_SHEETS as MOCK_CUE_SHEETS,
  RIGHTS_SETLISTS as MOCK_SETLISTS,
  RIGHTS_ECAD_PERIODOS as MOCK_ECAD_PERIODOS,
  RIGHTS_DATA_IS_MOCK,
} from "../services/rights-source";
import { getIsrcIndex, computeEcadMatchRate, findOrphanIsrcs, getCatalogArtistas } from "../services/catalog-lookup";
import type { RightsExecution } from "../types";
import { FeatureGate } from '@/shared/components/FeatureGate';

type Tab = "overview" | "radio_tv" | "shows_setlists" | "cue_sheets" | "divergencias" | "auditoria";
type BulkDeleteScope = "radio_tv" | "shows_setlists" | "cue_sheets" | "divergencias";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

// Status → variant global (componente Badge). Único mapa para toda a página.
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  confirmado: "success", enviado: "info", aprovado: "success", recebido: "success",
  pendente: "warning", nao_reportado: "neutral", divergencia: "danger",
  processado: "info", erro: "danger",
};
const statusVariant = (s: string): BadgeVariant => STATUS_VARIANT[s] ?? "neutral";
const STATUS_ECAD_LABEL: Record<string, string> = {
  recebido: "Recebido", pendente: "Pendente", processado: "Processado", erro: "Erro",
};
const fmtStatus = (s: string) => s.replace(/_/g, " ");
const fmtDur = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
const DASH = "—";


export default function RightsMonitoring() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedRadioIds, setSelectedRadioIds] = useState<string[]>([]);
  const [selectedSetlistIds, setSelectedSetlistIds] = useState<string[]>([]);
  const [selectedCueIds, setSelectedCueIds] = useState<string[]>([]);
  const [deletedRadioIds, setDeletedRadioIds] = useState<string[]>([]);
  const [deletedSetlistIds, setDeletedSetlistIds] = useState<string[]>([]);
  const [deletedCueIds, setDeletedCueIds] = useState<string[]>([]);
  const [deletedDivergenciaIds, setDeletedDivergenciaIds] = useState<string[]>([]);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<{ scope: BulkDeleteScope; ids: string[] } | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [artistaFilter, setArtistFilter] = useState("all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedExec, setSelectedExec] = useState<RightsExecution | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Refresh counter — bump to rebuild the ISRC index from catalog on demand
  const [catalogRevision, setCatalogRevision] = useState(0);
  // Resolução de divergências — estado local da sessão (app mock-first, sem backend)
  const [divOverrides, setDivOverrides] = useState<Record<string, Partial<Divergencia>>>({});
  const [selectedDivergencia, setSelectedDivergencia] = useState<Divergencia | null>(null);
  const [resolverOpen, setResolverOpen] = useState(false);

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
          editora: obra.editora,
          iswc: obra.iswc,
          cod_ecad: obra.cod_ecad,
          cod_entidade: obra.cod_entidade,
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

  const overviewPg = usePagination(filtered, 10);
  const radioRows = useMemo(
    () => MOCK_BROADCAST_DETECTIONS.filter((row) => !deletedRadioIds.includes(row.id)),
    [deletedRadioIds],
  );
  const radioPg = usePagination(radioRows, 10);

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

  // ── Tabela plana: Shows & Setlists (uma linha por música executada) ──
  const setlistRows = useMemo(
    () =>
      MOCK_SETLISTS.flatMap((sl) =>
        sl.musicas.map((m) => {
          const cat = isrcIndex.get(m.isrc);
          return {
            id: `${sl.id}-${m.ordem}`,
            evento: sl.evento,
            data: sl.data,
            local: sl.local,
            musica: m.obra_titulo,
            artista: sl.artista,
            interprete: sl.artista,
            compositor: cat?.compositor || m.compositor,
            publisher: cat?.editora || "",
            iswc: cat?.iswc || "",
            isrc: m.isrc,
            duracao: m.duracao_segundos,
            status: sl.status,
          };
        }),
      ).filter((row) => !deletedSetlistIds.includes(row.id)),
    [deletedSetlistIds, isrcIndex],
  );
  const setlistPg = usePagination(setlistRows, 15);

  // ── Tabela plana: Cue Sheets (uma linha por obra utilizada) ──
  const cueRows = useMemo(
    () =>
      MOCK_CUE_SHEETS.flatMap((cs) =>
        cs.obras.map((o, i) => {
          const cat = isrcIndex.get(o.isrc);
          return {
            id: `${cs.id}-${i}`,
            producao: cs.producao,
            episodio: cs.episodio || "",
            data: cs.data_exibicao,
            musica: o.obra_titulo,
            compositor: cat?.compositor || o.compositor,
            publisher: cat?.editora || o.publisher,
            iswc: cat?.iswc || "",
            isrc: o.isrc,
            cod_ecad: cat?.cod_ecad || "",
            tipo_uso: o.tipo_uso,
            duracao: o.duracao_segundos,
            status: cs.status,
          };
        }),
      ).filter((row) => !deletedCueIds.includes(row.id)),
    [deletedCueIds, isrcIndex],
  );
  const cuePg = usePagination(cueRows, 15);

  const toggleRadioSelectAll = () => {
    setSelectedRadioIds((current) =>
      current.length === radioRows.length && radioRows.length > 0
        ? []
        : radioRows.map((row) => row.id),
    );
  };
  const toggleRadioSelect = (id: string) => {
    setSelectedRadioIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleSetlistSelectAll = () => {
    setSelectedSetlistIds((current) =>
      current.length === setlistRows.length && setlistRows.length > 0
        ? []
        : setlistRows.map((row) => row.id),
    );
  };
  const toggleSetlistSelect = (id: string) => {
    setSelectedSetlistIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleCueSelectAll = () => {
    setSelectedCueIds((current) =>
      current.length === cueRows.length && cueRows.length > 0
        ? []
        : cueRows.map((row) => row.id),
    );
  };
  const toggleCueSelect = (id: string) => {
    setSelectedCueIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

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

  // Divergências reais: apenas as computadas dinamicamente (execuções órfãs),
  // com overrides de resolução (estado local).
  const allDivergencias: Divergencia[] = useMemo(() => {
    return [...dynamicDivergencias].map(d =>
      divOverrides[d.id] ? { ...d, ...divOverrides[d.id] } : d,
    ).filter((d) => !deletedDivergenciaIds.includes(d.id));
  }, [deletedDivergenciaIds, dynamicDivergencias, divOverrides]);

  const openDivergencias = allDivergencias.filter(d => d.status !== "resolvida");

  const handleResolveDivergencia = (updated: Divergencia) => {
    setDivOverrides(prev => ({
      ...prev,
      [updated.id]: {
        status: updated.status,
        observacoes: updated.observacoes,
        data_resolucao: updated.data_resolucao,
        historico: updated.historico,
      },
    }));
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview",        label: "Resumo",        icon: <Shield className="h-4 w-4" /> },
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

  const requestBulkDelete = (scope: BulkDeleteScope, ids: string[]) => {
    if (ids.length === 0) return;
    setPendingBulkDelete({ scope, ids });
  };

  const handleConfirmBulkDelete = () => {
    if (!pendingBulkDelete) return;

    if (pendingBulkDelete.scope === "radio_tv") {
      setDeletedRadioIds((current) => [...new Set([...current, ...pendingBulkDelete.ids])]);
      setSelectedRadioIds([]);
    }
    if (pendingBulkDelete.scope === "shows_setlists") {
      setDeletedSetlistIds((current) => [...new Set([...current, ...pendingBulkDelete.ids])]);
      setSelectedSetlistIds([]);
    }
    if (pendingBulkDelete.scope === "cue_sheets") {
      setDeletedCueIds((current) => [...new Set([...current, ...pendingBulkDelete.ids])]);
      setSelectedCueIds([]);
    }
    if (pendingBulkDelete.scope === "divergencias") {
      setDeletedDivergenciaIds((current) => [...new Set([...current, ...pendingBulkDelete.ids])]);
    }

    setPendingBulkDelete(null);
  };

  return (
    <MainLayout
      title="Monitoramento de Direitos"
      description="Monitoramento de execução pública, auditoria ECAD e reconciliação de recebimentos externos de direitos"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleSyncCatalog} data-testid="button-sync-catalog">
            <RefreshCw className="h-3.5 w-3.5" />Sincronizar
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setImportModalOpen(true)} data-testid="button-import-ecad">
            <Upload className="h-3.5 w-3.5" />Importar ECAD
          </Button>
        </div>
      }
    >
      <div className="space-y-5">

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

        {/* Abas (componente global) */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="space-y-5">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            {TABS.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5" data-testid={`tab-${tab.key}`}>
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge variant="neutral" className="ml-1">{tab.badge}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-0">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-1">
              <DatePickerField
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="Data inicial"
                className="h-8 w-[126px] shrink-0 bg-card border-border text-sm"
                data-testid="input-date-from"
              />
              <span className="text-muted-foreground text-xs px-1">até</span>
              <DatePickerField
                value={dateTo}
                onChange={setDateTo}
                placeholder="Data final"
                className="h-8 w-[126px] shrink-0 bg-card border-border text-sm"
                data-testid="input-date-to"
              />
            </div>

            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar música, artista, origem, ISRC..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-card border-border"
                data-testid="input-search-execucoes"
              />
            </div>

            <Select value={artistaFilter} onValueChange={setArtistFilter}>
              <SelectTrigger className="h-8 w-auto min-w-[142px] shrink-0 bg-card border-border text-sm" data-testid="select-artista-filter">
                <SelectValue placeholder="Todos os artistas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os artistas</SelectItem>
                {artistaOptions.map(a => (
                  <SelectItem key={a.id} value={a.nome_artistico}>{a.nome_artistico}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          <Card className="border-border/60">
            <CardContent className="p-0">
              <ListSectionHeader
                title="Monitoramento de Execuções Públicas"
                count={overviewPg.total}
                description="Acompanhe execuções identificadas em rádio, TV, shows, eventos, web rádios e casas noturnas, com conciliação ECAD, estimativas de arrecadação e validação de vínculos entre obras e fonogramas."
                className="px-6 pt-6"
              />
              {orphanIsrcs.length > 0 && (
                <p className="px-6 pb-3 text-xs font-medium text-destructive">
                  ⚠️ {orphanIsrcs.length} ISRC identificado{orphanIsrcs.length > 1 ? "s" : ""} sem obra vinculada no catálogo.
                </p>
              )}
              <ExecucoesTable execucoes={overviewPg.pageItems} onViewDetail={handleViewDetail} />
              <TablePagination
                total={overviewPg.total}
                page={overviewPg.page}
                pageSize={overviewPg.pageSize}
                onPageChange={overviewPg.setPage}
                onPageSizeChange={overviewPg.setPageSize}
                itemLabel="execuções"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Rádio & TV ── */}
        <TabsContent value="radio_tv" className="mt-0">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <ListSectionHeader
                title="Broadcast Detections — Rádio & TV"
                count={radioPg.total}
                description="Execuções detectadas via fingerprinting em emissoras de rádio e televisão"
                className="px-6 pt-6"
                action={radioRows.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {selectedRadioIds.length > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => requestBulkDelete("radio_tv", selectedRadioIds)}
                        data-testid="button-delete-selected-radio-tv"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir selecionadas
                      </Button>
                    )}
                    <Checkbox
                      checked={selectedRadioIds.length === radioRows.length && radioRows.length > 0}
                      onCheckedChange={toggleRadioSelectAll}
                      aria-label="Selecionar todas as detecções"
                      data-testid="checkbox-select-all-radio-tv"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedRadioIds.length > 0 ? `${selectedRadioIds.length} selecionada(s)` : "Selecionar todos"}
                    </span>
                  </div>
                ) : undefined}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="min-w-[220px] w-[30%]">Música / Artista</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[140px] w-[18%]">Emissora</TableHead>
                    <TableHead className="hidden lg:table-cell w-[120px]">Canal</TableHead>
                    <TableHead className="hidden lg:table-cell w-[96px]">Tipo</TableHead>
                    <TableHead className="hidden xl:table-cell w-[132px]">Data/Hora</TableHead>
                    <TableHead className="hidden xl:table-cell w-[120px]">ISRC</TableHead>
                    <TableHead className="text-right hidden md:table-cell w-[112px]">Valor Est.</TableHead>
                    <TableHead className="w-[112px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {radioPg.pageItems.map(det => {
                    const dt = formatRightsDateTime(det.data_hora);
                    const catalogObra = isrcIndex.get(det.isrc);
                    return (
                      <TableRow key={det.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRadioIds.includes(det.id)}
                            onCheckedChange={() => toggleRadioSelect(det.id)}
                            aria-label={`Selecionar ${det.obra_titulo}`}
                            data-testid={`checkbox-radio-tv-${det.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[260px] truncate font-semibold">{det.obra_titulo}</p>
                          <p className="max-w-[260px] truncate text-xs text-muted-foreground">{det.artista}</p>
                          {catalogObra && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {catalogObra.compositor} · {catalogObra.editora}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm"><span className="block max-w-[180px] truncate">{det.emissora}</span></TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground"><span className="block max-w-[120px] truncate">{det.canal}</span></TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs bg-muted/50 px-2 py-1 rounded-md capitalize">{det.tipo.replace("_", " ")}</span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {dt.full}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div>
                            <span className="block max-w-[180px] truncate text-sm">{det.isrc}</span>
                            {catalogObra?.cod_ecad && (
                              <p className="text-xs text-muted-foreground mt-0.5">{catalogObra.cod_ecad}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell text-sm">{fmtBRL(det.valor_estimado)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(det.status)} className="capitalize">{fmtStatus(det.status)}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                total={radioPg.total}
                page={radioPg.page}
                pageSize={radioPg.pageSize}
                onPageChange={radioPg.setPage}
                onPageSizeChange={radioPg.setPageSize}
                itemLabel="detecções"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Shows & Setlists ── (tabela única plana: uma linha por música) */}
        <TabsContent value="shows_setlists" className="mt-0">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <ListSectionHeader
                title="Shows & Setlists"
                count={setlistRows.length}
                description="Músicas executadas em shows, eventos e setlists importados"
                className="px-6 pt-6"
                action={setlistRows.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {selectedSetlistIds.length > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => requestBulkDelete("shows_setlists", selectedSetlistIds)}
                        data-testid="button-delete-selected-setlists"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir selecionadas
                      </Button>
                    )}
                    <Checkbox
                      checked={selectedSetlistIds.length === setlistRows.length && setlistRows.length > 0}
                      onCheckedChange={toggleSetlistSelectAll}
                      aria-label="Selecionar todos os setlists"
                      data-testid="checkbox-select-all-setlists"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedSetlistIds.length > 0 ? `${selectedSetlistIds.length} selecionada(s)` : "Selecionar todos"}
                    </span>
                  </div>
                ) : undefined}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8"></TableHead>
                      <TableHead className="text-xs">Evento</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Local</TableHead>
                      <TableHead className="text-xs">Música</TableHead>
                      <TableHead className="text-xs">Artista/Banda</TableHead>
                      <TableHead className="text-xs">Intérprete</TableHead>
                      <TableHead className="text-xs">Compositor</TableHead>
                      <TableHead className="text-xs">Publisher</TableHead>
                      <TableHead className="text-xs">ISWC</TableHead>
                      <TableHead className="text-xs">ISRC</TableHead>
                      <TableHead className="text-xs text-right">Duração</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {setlistPg.pageItems.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          <Checkbox
                            checked={selectedSetlistIds.includes(r.id)}
                            onCheckedChange={() => toggleSetlistSelect(r.id)}
                            aria-label={`Selecionar ${r.musica}`}
                            data-testid={`checkbox-setlist-${r.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-medium"><span className="block max-w-[200px] truncate">{r.evento}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatRightsDate(r.data)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground"><span className="block max-w-[180px] truncate">{r.local}</span></TableCell>
                        <TableCell className="text-xs font-medium"><span className="block max-w-[200px] truncate">{r.musica}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><span className="block max-w-[160px] truncate">{r.artista}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><span className="block max-w-[160px] truncate">{r.interprete}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><span className="block max-w-[160px] truncate">{r.compositor || DASH}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><span className="block max-w-[160px] truncate">{r.publisher || DASH}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.iswc || DASH}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.isrc}</TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground whitespace-nowrap">{fmtDur(r.duracao)}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)} className="capitalize">{fmtStatus(r.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {setlistRows.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma execução registrada.</div>
              )}
              {setlistRows.length > 0 && (
                <TablePagination
                  total={setlistPg.total}
                  page={setlistPg.page}
                  pageSize={setlistPg.pageSize}
                  onPageChange={setlistPg.setPage}
                  onPageSizeChange={setlistPg.setPageSize}
                  itemLabel="execuções"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cue Sheets ── (tabela única plana: uma linha por obra) */}
        <TabsContent value="cue_sheets" className="mt-0">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <ListSectionHeader
                title="Cue Sheets"
                count={cueRows.length}
                description="Obras sincronizadas em produções audiovisuais e cue sheets"
                className="px-6 pt-6"
                action={cueRows.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {selectedCueIds.length > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => requestBulkDelete("cue_sheets", selectedCueIds)}
                        data-testid="button-delete-selected-cue-sheets"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir selecionadas
                      </Button>
                    )}
                    <Checkbox
                      checked={selectedCueIds.length === cueRows.length && cueRows.length > 0}
                      onCheckedChange={toggleCueSelectAll}
                      aria-label="Selecionar todos os cue sheets"
                      data-testid="checkbox-select-all-cue-sheets"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedCueIds.length > 0 ? `${selectedCueIds.length} selecionada(s)` : "Selecionar todos"}
                    </span>
                  </div>
                ) : undefined}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8"></TableHead>
                      <TableHead className="text-xs">Produção</TableHead>
                      <TableHead className="text-xs">Episódio</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Música</TableHead>
                      <TableHead className="text-xs">Artista/Banda</TableHead>
                      <TableHead className="text-xs">Intérprete</TableHead>
                      <TableHead className="text-xs">Compositor</TableHead>
                      <TableHead className="text-xs">Publisher</TableHead>
                      <TableHead className="text-xs">ISWC</TableHead>
                      <TableHead className="text-xs">ISRC</TableHead>
                      <TableHead className="text-xs">Código ECAD</TableHead>
                      <TableHead className="text-xs">Tipo de Uso</TableHead>
                      <TableHead className="text-xs text-right">Duração</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuePg.pageItems.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          <Checkbox
                            checked={selectedCueIds.includes(r.id)}
                            onCheckedChange={() => toggleCueSelect(r.id)}
                            aria-label={`Selecionar ${r.musica}`}
                            data-testid={`checkbox-cue-sheet-${r.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-medium"><span className="block max-w-[200px] truncate">{r.producao}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.episodio || DASH}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatRightsDate(r.data)}</TableCell>
                        <TableCell className="text-xs font-medium"><span className="block max-w-[200px] truncate">{r.musica}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{DASH}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{DASH}</TableCell>
                        <TableCell className="text-xs text-muted-foreground"><span className="block max-w-[160px] truncate">{r.compositor || DASH}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><span className="block max-w-[160px] truncate">{r.publisher || DASH}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.iswc || DASH}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.isrc}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.cod_ecad || DASH}</TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{r.tipo_uso.replace("_", " ")}</TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground whitespace-nowrap">{fmtDur(r.duracao)}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)} className="capitalize">{fmtStatus(r.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {cueRows.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma utilização registrada.</div>
              )}
              {cueRows.length > 0 && (
                <TablePagination
                  total={cuePg.total}
                  page={cuePg.page}
                  pageSize={cuePg.pageSize}
                  onPageChange={cuePg.setPage}
                  onPageSizeChange={cuePg.setPageSize}
                  itemLabel="utilizações"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Divergências ── */}
        <TabsContent value="divergencias" className="mt-0">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <DivergenciasPanel
                divergencias={allDivergencias}
                onResolve={(d) => { setSelectedDivergencia(d); setResolverOpen(true); }}
                onBulkDelete={(ids) => requestBulkDelete("divergencias", ids)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Auditoria ── */}
        <TabsContent value="auditoria" className="mt-0">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <ListSectionHeader
                title="Auditoria ECAD"
                count={MOCK_ECAD_PERIODOS.length}
                description="Histórico de períodos e arrecadação por trimestre"
                className="px-6 pt-6"
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Período</TableHead>
                    <TableHead className="hidden md:table-cell w-[132px]">Data Referência</TableHead>
                    <TableHead className="text-right w-[132px]">Valor Total</TableHead>
                    <TableHead className="w-[112px]">Status</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[240px]">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ECAD_PERIODOS.map(p => {
                    return (
                      <FeatureGate key={p.id} feature="moduleMonitoring" featureName="Monitoramento">
                        <TableRow>
                          <TableCell className="font-semibold">{p.periodo}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                            {formatRightsDate(p.data_referencia)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtBRL(p.valor_total)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(p.status)}>{STATUS_ECAD_LABEL[p.status] ?? fmtStatus(p.status)}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{p.observacoes}</TableCell>
                        </TableRow>
                      </FeatureGate>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>


        {/* Modals */}
        <EcadImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
        <ExecucaoDetailModal
          exec={selectedExec}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
        <ResolverDivergenciaModal
          divergencia={selectedDivergencia}
          open={resolverOpen}
          onOpenChange={setResolverOpen}
          onSubmit={handleResolveDivergencia}
        />
        <DeleteConfirmModal
          open={Boolean(pendingBulkDelete)}
          onOpenChange={(open) => !open && setPendingBulkDelete(null)}
          title="Excluir selecionados"
          description="Esta ação remove os registros selecionados desta visualização. Deseja continuar?"
          onConfirm={handleConfirmBulkDelete}
        />

      </div>
    </MainLayout>
  );
}
