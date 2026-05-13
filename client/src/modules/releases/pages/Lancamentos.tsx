import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import {
  Music, Radio, Clock, Eye, AlertTriangle, Upload, Download, Plus, Search,
  Loader2, Disc, Trash2, LayoutGrid, List, Calendar,
} from "lucide-react";
import { SiSpotify, SiApplemusic, SiYoutubemusic } from "react-icons/si";
import { LancamentoFormModal } from "@/modules/releases/components/LancamentoFormModal";
import { LancamentoViewModal } from "@/modules/releases/components/LancamentoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { EmptyState } from "@/shared/components/EmptyState";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { StatusBadge } from "@/shared/components/StatusBadge";

const lancamentoColumns: CSVColumn[] = [
  { key: "titulo", label: "Título" },
  { key: "tipo", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "artista", label: "Artista", transform: (r) => r.artistas?.nome_artistico || "" },
  { key: "data_lancamento", label: "Data de Lançamento" },
  { key: "distribuidora", label: "Distribuidora" },
  { key: "plataformas", label: "Plataformas", transform: (r) => Array.isArray(r.plataformas) ? r.plataformas.join(", ") : (r.plataformas || "") },
  { key: "observacoes", label: "Observações" },
];

// ── Assets helpers ──────────────────────────────────────────────────────────
const ASSETS_REQUIRED: Record<string, string[]> = {
  single: ["audio_master_url", "capa_url"],
  ep:     ["audio_master_url", "capa_url", "ficha_tecnica"],
  album:  ["audio_master_url", "capa_url", "ficha_tecnica", "press_release", "epk_url"],
};

function calcAssetsPct(lancamento: any): number {
  const tipo = (lancamento.tipo || "single").toLowerCase();
  const required = ASSETS_REQUIRED[tipo] ?? ASSETS_REQUIRED.single;
  const assets = lancamento.assets ?? {};
  const filled = required.filter((k: string) => assets[k] && String(assets[k]).trim()).length;
  if (required.length === 0) return 100;
  return Math.round((filled / required.length) * 100);
}

function isIncompleto(lancamento: any): boolean {
  return calcAssetsPct(lancamento) < 100;
}

// ── Kanban ──────────────────────────────────────────────────────────────────
const KANBAN_COLUMNS = [
  { key: "planejado",               label: "Planejado",               colorCls: "border-muted-foreground/40", badgeCls: "bg-muted text-muted-foreground",      statuses: ["planejado", "programado"] },
  { key: "em_producao",             label: "Em Produção",             colorCls: "border-warning/60",          badgeCls: "bg-warning text-warning-foreground",  statuses: ["em_producao", "analise"] },
  { key: "aguardando_distribuicao", label: "Aguardando Distribuição", colorCls: "border-blue-500/50",         badgeCls: "bg-blue-600 text-white",              statuses: ["aguardando_distribuicao", "aprovado"] },
  { key: "publicado",               label: "Publicado",               colorCls: "border-success/50",          badgeCls: "bg-success text-success-foreground",  statuses: ["publicado", "ativo"] },
  { key: "cancelado",               label: "Cancelado",               colorCls: "border-destructive/40",      badgeCls: "bg-destructive text-destructive-foreground", statuses: ["cancelado"] },
];

function getKanbanCol(status: string | null | undefined) {
  const s = status ?? "";
  return KANBAN_COLUMNS.find(c => c.statuses.includes(s)) ?? KANBAN_COLUMNS[0];
}

export default function Lancamentos() {
  const { lancamentos, isLoading, deleteLancamento, addLancamento, updateLancamento } = useLancamentos();
  const { artistas } = useArtistas();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReleases.length && filteredReleases.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReleases.map((r: any) => r.id));
    }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteLancamento.mutate(id));
    toast.success(`${selectedIds.length} lançamento(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; lancamento?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; lancamento?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; lancamento?: any }>({ open: false });

  useEditQueryParam(
    "edit",
    lancamentos,
    useCallback((lancamento) => setFormModal({ open: true, mode: "edit", lancamento }), []),
  );

  // Support ?view=<id> to directly open the view modal (e.g., navigated from ContratoViewModal)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId || lancamentos.length === 0) return;
    const target = lancamentos.find((l) => l.id === viewId);
    if (target) {
      setViewModal({ open: true, lancamento: target });
      setSearchParams((prev) => { prev.delete("view"); return prev; }, { replace: true });
    }
  }, [searchParams, lancamentos, setSearchParams]);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [artistFilter, setArtistFilter] = useState("all-artist");
  const [incompletoFilter, setIncompletoFilter] = useState(false);

  const handleExport = () => exportToCSV(lancamentos, lancamentoColumns, "lancamentos");
  const handleImport = () => importCSV(async (data) => {
    let importados = 0;
    for (const row of data) {
      const titulo = row["Título"] || row["titulo"] || row["TITULO"];
      if (!titulo) continue;
      try {
        const plataformasRaw = row["Plataformas"] || row["plataformas"] || null;
        await addLancamento.mutateAsync({
          titulo,
          tipo: row["Tipo"] || row["tipo"] || "single",
          status: row["Status"] || row["status"] || "planejado",
          data_lancamento: row["Data de Lançamento"] || row["Data"] || row["data_lancamento"] || null,
          distribuidora: row["Distribuidora"] || row["distribuidora"] || null,
          plataformas: plataformasRaw ? plataformasRaw.split(",").map((p: string) => p.trim()).filter(Boolean) : null,
          observacoes: row["Observações"] || row["observacoes"] || null,
        } as any);
        importados++;
      } catch {}
    }
    if (importados > 0) toast.success(`${importados} lançamento(s) importado(s) com sucesso!`);
    else toast.error("Nenhum lançamento válido encontrado no arquivo");
  }, ["Título", "Tipo", "Status", "Data de Lançamento"]);

  const getArtistaById = (id: string | null) => id ? artistas.find(a => a.id === id) : undefined;

  const metricas = useMemo(() => {
    const ativos = lancamentos.filter(l => ["ativo", "publicado"].includes(l.status ?? "")).length;
    const programados = lancamentos.filter(l => ["programado", "planejado"].includes(l.status ?? "")).length;
    const incompletos = lancamentos.filter(l => isIncompleto(l)).length;
    const hoje = new Date();
    const em30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const proximos30 = lancamentos.filter(l => {
      if (!l.data_lancamento) return false;
      const dl = new Date(l.data_lancamento);
      return dl >= hoje && dl <= em30;
    }).length;
    return { total: lancamentos.length, ativos, programados, incompletos, proximos30 };
  }, [lancamentos]);

  const filteredReleases = useMemo(() => {
    return lancamentos.filter((release) => {
      const artista = getArtistaById(release.artista_id);
      const matchesSearch = release.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista?.nome_artistico?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all-type" || release.tipo?.toLowerCase() === typeFilter.toLowerCase();
      const matchesStatus = statusFilter === "all-status" || release.status === statusFilter;
      const matchesArtist = artistFilter === "all-artist" || release.artista_id === artistFilter;
      const matchesIncompleto = !incompletoFilter || isIncompleto(release);
      return matchesSearch && matchesType && matchesStatus && matchesArtist && matchesIncompleto;
    });
  }, [lancamentos, searchTerm, typeFilter, statusFilter, artistFilter, incompletoFilter, artistas]);

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all-type" || statusFilter !== "all-status" || artistFilter !== "all-artist" || incompletoFilter;

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all-type");
    setStatusFilter("all-status");
    setArtistFilter("all-artist");
    setIncompletoFilter(false);
  };

  const handleDelete = () => {
    if (deleteModal.lancamento) {
      deleteLancamento.mutate(deleteModal.lancamento.id);
      setDeleteModal({ open: false });
    }
  };

  // ── Kanban drag handlers ─────────────────────────────────────────────────
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => setDraggedId(null);

  const handleDrop = (colKey: string) => {
    if (!draggedId) return;
    const lancamento = lancamentos.find(l => l.id === draggedId);
    if (!lancamento) return;
    const currentCol = getKanbanCol(lancamento.status);
    if (currentCol.key === colKey) return;
    updateLancamento.mutate({ id: draggedId, status: colKey } as any);
    setDraggedId(null);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const headerActions = (
    <>
      <Button size="sm" className="gap-2 bg-primary" data-testid="button-novo-lancamento" onClick={() => setFormModal({ open: true, mode: "create" })}>
        <Plus className="h-4 w-4" />
        Novo Lançamento
      </Button>
    </>
  );

  // ── Render card (list view) ─────────────────────────────────────────────
  const renderCard = (release: any) => {
    const artista = getArtistaById(release.artista_id);
    const tipoBadgeColor = release.tipo === "single" ? "bg-primary" : release.tipo === "ep" ? "bg-blue-600" : "bg-purple-600";
    const generos = artista?.genero_musical ? [artista.genero_musical] : [];
    const pct = calcAssetsPct(release);
    return (
      <Card key={release.id} data-testid={`card-lancamento-${release.id}`} className="bg-muted/30 border-border overflow-hidden flex flex-col">
        <div className="relative">
          <div className="absolute top-3 left-3 z-10">
            <div
              className={`w-5 h-5 rounded border-2 border-primary flex items-center justify-center cursor-pointer bg-background/50 ${selectedIds.includes(release.id) ? 'bg-primary border-primary' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleSelect(release.id); }}
              data-testid={`checkbox-lancamento-${release.id}`}
            >
              {selectedIds.includes(release.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
            </div>
          </div>
          <div className="absolute top-3 right-3 z-10">
            <StatusBadge status={release.status} />
          </div>
          <div className="aspect-square bg-muted flex items-center justify-center">
            <Music className="h-16 w-16 text-primary/50" />
          </div>
        </div>
        <CardContent className="p-4 flex flex-col flex-1">
          <div className="mb-1">
            <h3 className="font-bold text-foreground text-sm uppercase truncate" data-testid={`text-lancamento-titulo-${release.id}`}>{release.titulo}</h3>
            <p className="text-muted-foreground text-xs" data-testid={`text-lancamento-artista-${release.id}`}>{artista?.nome_artistico || "-"}</p>
          </div>
          <div className="flex items-center gap-1 flex-wrap mb-2">
            <Badge className={`${tipoBadgeColor} text-white text-[10px] no-default-hover-elevate no-default-active-elevate`}>
              {release.tipo === "single" ? "Single" : release.tipo === "ep" ? "EP" : "Album"}
            </Badge>
            {generos.map((g, i) => (
              <Badge key={i} className="bg-success text-success-foreground text-[10px] no-default-hover-elevate no-default-active-elevate">
                {g}
              </Badge>
            ))}
          </div>
          {/* Assets progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Assets</span>
              <span className={`text-[10px] font-medium ${pct === 100 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"}`}>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1" />
          </div>
          <div className="grid grid-cols-4 gap-1 text-center mb-3">
            <div className="flex flex-col items-center gap-0.5">
              <SiSpotify className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Spotify</span>
              <span className="text-xs text-foreground">--</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <SiApplemusic className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Apple</span>
              <span className="text-xs text-foreground">--</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <SiYoutubemusic className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">YouTube</span>
              <span className="text-xs text-foreground">--</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Disc className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Deezer</span>
              <span className="text-xs text-foreground">--</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-auto">
            <Button variant="outline" size="sm" className="text-xs" data-testid={`button-ver-lancamento-${release.id}`} onClick={() => setViewModal({ open: true, lancamento: release })}>
              Ver
            </Button>
            <Button variant="outline" size="sm" className="text-xs" data-testid={`button-editar-lancamento-${release.id}`} onClick={() => setFormModal({ open: true, mode: "edit", lancamento: release })}>
              Editar
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-destructive" data-testid={`button-excluir-lancamento-${release.id}`} onClick={() => setDeleteModal({ open: true, lancamento: release })}>
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Render kanban card ──────────────────────────────────────────────────
  const renderKanbanCard = (release: any) => {
    const artista = getArtistaById(release.artista_id);
    const pct = calcAssetsPct(release);
    const tipoBadgeColor = release.tipo === "single" ? "bg-primary" : release.tipo === "ep" ? "bg-blue-600" : "bg-purple-600";
    return (
      <Card
        key={release.id}
        draggable
        onDragStart={() => handleDragStart(release.id)}
        onDragEnd={handleDragEnd}
        data-testid={`kanban-card-${release.id}`}
        className={`bg-card border-border cursor-grab active:cursor-grabbing select-none mb-2 ${draggedId === release.id ? "opacity-50" : ""}`}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-tight truncate flex-1">{release.titulo}</p>
            <Badge className={`${tipoBadgeColor} text-white text-[9px] shrink-0 no-default-hover-elevate`}>
              {release.tipo === "single" ? "Single" : release.tipo === "ep" ? "EP" : "Album"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{artista?.nome_artistico || "—"}</p>
          {release.data_lancamento && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(release.data_lancamento).toLocaleDateString("pt-BR")}
            </div>
          )}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">Assets</span>
              <span className={`text-[10px] font-medium ${pct === 100 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"}`}>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1" />
          </div>
          <div className="flex gap-1 pt-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1" onClick={() => setViewModal({ open: true, lancamento: release })}>Ver</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1" onClick={() => setFormModal({ open: true, mode: "edit", lancamento: release })}>Editar</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout title="Lançamentos" description="Gestão de lançamentos e distribuição" actions={headerActions}>
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Publicados</span>
                <Radio className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{metricas.ativos}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">disponíveis nas plataformas</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Programados</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{metricas.programados}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">planejados / programados</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Assets Incompletos</span>
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div className="mt-2">
                <span className={`text-2xl font-bold ${metricas.incompletos > 0 ? "text-warning" : "text-foreground"}`}>{metricas.incompletos}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">lançamentos com assets pendentes</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Próximos 30 dias</span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className={`text-2xl font-bold ${metricas.proximos30 > 0 ? "text-primary" : "text-foreground"}`}>{metricas.proximos30}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">lançamentos previstos</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{metricas.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">lançamentos cadastrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Search, Filters and View Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou artista..."
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Todos Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-type">Todos Tipo</SelectItem>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="álbum">Álbum</SelectItem>
              <SelectItem value="ep">EP</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos Status</SelectItem>
              <SelectItem value="planejado">Planejado</SelectItem>
              <SelectItem value="em_producao">Em Produção</SelectItem>
              <SelectItem value="analise">Em Análise</SelectItem>
              <SelectItem value="aguardando_distribuicao">Aguardando Distribuição</SelectItem>
              <SelectItem value="ativo">Ativo / Publicado</SelectItem>
              <SelectItem value="programado">Programado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={artistFilter} onValueChange={setArtistFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder="Todos Artistas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-artist">Todos Artistas</SelectItem>
              {artistas.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>{artist.nome_artistico}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={incompletoFilter ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 ${incompletoFilter ? "bg-warning hover:bg-warning/90 text-warning-foreground" : ""}`}
            data-testid="button-filter-incompleto"
            onClick={() => setIncompletoFilter(!incompletoFilter)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Assets incompletos
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>Limpar</Button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 border border-border rounded-md p-0.5">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              data-testid="button-view-list"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              data-testid="button-view-kanban"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Lista de Lançamentos</CardTitle>
                <CardDescription>Acompanhe todos os seus lançamentos musicais</CardDescription>
              </div>
              {lancamentos.length > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded border-2 border-primary flex items-center justify-center cursor-pointer"
                    onClick={toggleSelectAll}
                  >
                    {selectedIds.length === filteredReleases.length && filteredReleases.length > 0 && <div className="w-2.5 h-2.5 rounded-sm bg-primary" />}
                  </div>
                  <span className="text-sm text-muted-foreground">Selecionar Todos</span>
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir ({selectedIds.length})
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredReleases.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {filteredReleases.map(renderCard)}
                </div>
              ) : (
                <EmptyState
                  icon={Radio}
                  title="Nenhum lançamento encontrado"
                  description="Tente ajustar os filtros ou crie um novo lançamento"
                  actionLabel="Novo Lançamento"
                  onAction={() => setFormModal({ open: true, mode: "create" })}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* ── KANBAN VIEW ── */}
        {view === "kanban" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Pipeline de Lançamentos</h2>
              <p className="text-sm text-muted-foreground">{filteredReleases.length} lançamento(s)</p>
            </div>
            <div className="grid grid-cols-5 gap-3 min-h-[400px]">
              {KANBAN_COLUMNS.map(col => {
                const colReleases = filteredReleases.filter(r => col.statuses.includes(r.status ?? ""));
                return (
                  <div
                    key={col.key}
                    data-testid={`kanban-col-${col.key}`}
                    className={`rounded-lg border-2 ${col.colorCls} bg-muted/20 p-3 flex flex-col min-h-[400px]`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(col.key)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold">{col.label}</span>
                      <Badge className={`${col.badgeCls} text-[10px] h-5 px-2`}>{colReleases.length}</Badge>
                    </div>
                    <div className="flex-1">
                      {colReleases.map(renderKanbanCard)}
                      {colReleases.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border-2 border-dashed border-border rounded-lg">
                          Arraste aqui
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <LancamentoFormModal open={formModal.open} onOpenChange={(open) => setFormModal({ ...formModal, open })} lancamento={formModal.lancamento} mode={formModal.mode} />
      <LancamentoViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} lancamento={viewModal.lancamento} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Lançamento" description={`Tem certeza que deseja excluir "${deleteModal.lancamento?.titulo}"?`} onConfirm={handleDelete} />
    </MainLayout>
  );
}
