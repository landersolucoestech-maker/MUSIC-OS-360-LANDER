import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { MetricCard } from "@/shared/components/MetricCard";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AlertTriangle, Clock, CheckCircle, Upload, PlusCircle, Search, Loader2, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { TakedownFormModal } from "@/modules/monitoring/components/TakedownFormModal";
import { TakedownViewModal } from "@/modules/monitoring/components/TakedownViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { useTakedowns } from "@/modules/monitoring/hooks/useTakedowns";
import { formatTakedownDate, normalizeTakedown, statusBadge, tipoBadge, isResolved, isPending, isInProgress } from "@/modules/monitoring/lib/takedown-format";
import { FeatureGate } from '@/shared/components/FeatureGate';

export default function Takedowns() {
  const { takedowns, isLoading, deleteTakedown } = useTakedowns();
  const [activeTab, setActiveTab] = useState("todos");
  const [takedownModal, setTakedownModal] = useState<{ open: boolean; mode: "create" | "edit"; takedown?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; takedown?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; takedown?: any }>({ open: false });
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [selectedTakedownIds, setSelectedTakedownIds] = useState<string[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Normaliza uma única vez: cada linha mantém o objeto bruto (para os modais) e a
  // versão normalizada (para exibição) — fonte única de verdade do que foi persistido.
  const rows = useMemo(
    () => takedowns.map(t => ({ raw: t, n: normalizeTakedown(t) })),
    [takedowns],
  );

  const metricas = useMemo(() => ({
    total: rows.length,
    pendentes: rows.filter(r => isPending(r.n.status)).length,
    resolvidos: rows.filter(r => isResolved(r.n.status)).length,
    emAndamento: rows.filter(r => isInProgress(r.n.status)).length,
  }), [rows]);

  // Filtered takedowns
  const filteredRows = useMemo(() => rows.filter(({ n }) => {
    const matchesTab = activeTab === "todos" ||
      (activeTab === "pendentes" && isPending(n.status)) ||
      (activeTab === "resolvidos" && isResolved(n.status));

    const term = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      n.titulo.toLowerCase().includes(term) ||
      n.motivo.toLowerCase().includes(term) ||
      n.plataforma.toLowerCase().includes(term) ||
      n.artista.toLowerCase().includes(term) ||
      n.obra_afetada.toLowerCase().includes(term);

    const matchesPlatform = platformFilter === "all" ||
      n.plataforma.toLowerCase() === platformFilter.toLowerCase();

    const matchesStatus = statusFilter === "all" || n.status === statusFilter;

    return matchesTab && matchesSearch && matchesPlatform && matchesStatus;
  }), [rows, activeTab, searchTerm, platformFilter, statusFilter]);

  const hasActiveFilters = searchTerm !== "" || platformFilter !== "all" || statusFilter !== "all";

  const { page, pageSize, total, pageItems, setPage, setPageSize } = usePagination(filteredRows, 10);

  const clearFilters = () => {
    setSearchTerm("");
    setPlatformFilter("all");
    setStatusFilter("all");
  };

  const handleDelete = () => {
    if (deleteModal.takedown) {
      deleteTakedown.mutate(deleteModal.takedown.id);
      setDeleteModal({ open: false });
    }
  };

  const toggleSelectTakedown = (id: string) => {
    setSelectedTakedownIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleSelectAllTakedowns = () => {
    const ids = filteredRows.map(({ n }) => n.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedTakedownIds.includes(id));
    setSelectedTakedownIds((current) => {
      if (allSelected) return current.filter((id) => !ids.includes(id));
      return Array.from(new Set([...current, ...ids]));
    });
  };

  const handleBulkDelete = () => {
    bulkDeleteModal.ids.forEach((id) => deleteTakedown.mutate(id));
    setSelectedTakedownIds((current) => current.filter((id) => !bulkDeleteModal.ids.includes(id)));
    setBulkDeleteModal({ open: false, ids: [] });
  };

  const selectedFilteredCount = filteredRows.filter(({ n }) => selectedTakedownIds.includes(n.id)).length;
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every(({ n }) => selectedTakedownIds.includes(n.id));

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
    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setTakedownModal({ open: true, mode: "create" })} data-testid="button-novo-takedown">
      <PlusCircle className="h-3.5 w-3.5" />
      Novo Takedown
    </Button>
  );

  return (
    <FeatureGate feature="moduleMonitoring" featureName="Monitoramento">
    <MainLayout title="Takedowns" description="Gerencie solicitações de remoção e claims" actions={headerActions}>
      <div className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total" value={metricas.total} icon={AlertTriangle} accent="primary" />
          <MetricCard title="Pendentes" value={metricas.pendentes} icon={Clock} accent="warning" />
          <MetricCard title="Em Andamento" value={metricas.emAndamento} icon={Upload} accent="primary" />
          <MetricCard title="Resolvidos" value={metricas.resolvidos} icon={CheckCircle} accent="success" />
        </div>

        <div className="flex items-center gap-2">
          <Button variant={activeTab === "todos" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("todos")} className={activeTab === "todos" ? "bg-muted text-foreground hover:bg-muted" : ""}>Todos</Button>
          <Button variant={activeTab === "pendentes" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("pendentes")} className={activeTab === "pendentes" ? "bg-muted text-foreground hover:bg-muted" : ""}>Pendentes</Button>
          <Button variant={activeTab === "resolvidos" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("resolvidos")} className={activeTab === "resolvidos" ? "bg-muted text-foreground hover:bg-muted" : ""}>Resolvidos</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, motivo, plataforma..." 
              className="h-8 pl-10 bg-card border-border text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[132px] shrink-0 bg-card border-border text-sm">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="spotify">Spotify</SelectItem>
              <SelectItem value="apple podcasts">Apple Podcasts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[126px] shrink-0 bg-card border-border text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {filteredRows.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="Nenhum takedown encontrado"
                description="Adicione um novo takedown para gerenciar solicitações de remoção e claims."
                action={{ label: "Novo Takedown", onClick: () => setTakedownModal({ open: true, mode: "create" }) }}
              />
            ) : (
              <>
              <ListSectionHeader
                title="Lista de Takedowns"
                count={filteredRows.length}
                action={
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {selectedFilteredCount > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => setBulkDeleteModal({ open: true, ids: filteredRows.filter(({ n }) => selectedTakedownIds.includes(n.id)).map(({ n }) => n.id) })}
                        data-testid="button-delete-selected-takedowns"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir selecionados
                      </Button>
                    )}
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAllTakedowns}
                      aria-label="Selecionar todos os takedowns"
                      data-testid="checkbox-select-all-takedowns"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedFilteredCount > 0 ? `${selectedFilteredCount} selecionado(s)` : "Selecionar todos"}
                    </span>
                  </div>
                }
                description="Acompanhe solicitações de remoção, claims, plataformas e status"
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {pageItems.map(({ raw: takedown, n }) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTakedownIds.includes(n.id)}
                          onCheckedChange={() => toggleSelectTakedown(n.id)}
                          aria-label={`Selecionar takedown ${n.titulo || n.id}`}
                          data-testid={`checkbox-takedown-${n.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{n.titulo || "—"}</TableCell>
                      <TableCell>{tipoBadge(n.tipo)}</TableCell>
                      <TableCell>{n.plataforma ? <Badge variant="neutral">{n.plataforma}</Badge> : "—"}</TableCell>
                      <TableCell>{n.motivo || "—"}</TableCell>
                      <TableCell>{formatTakedownDate(n.data) ?? "—"}</TableCell>
                      <TableCell>{statusBadge(n.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewModal({ open: true, takedown })}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTakedownModal({ open: true, mode: "edit", takedown })}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteModal({ open: true, takedown })} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="takedowns"
              />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <TakedownFormModal open={takedownModal.open} onOpenChange={(open) => setTakedownModal({ ...takedownModal, open })} takedown={takedownModal.takedown} mode={takedownModal.mode} />
      <TakedownViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} takedown={viewModal.takedown} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Takedown" description={`Tem certeza que deseja excluir "${deleteModal.takedown?.titulo}"?`} onConfirm={handleDelete} />
      <DeleteConfirmModal open={bulkDeleteModal.open} onOpenChange={(open) => setBulkDeleteModal({ ...bulkDeleteModal, open })} title="Excluir takedowns selecionados" description={`Tem certeza que deseja excluir ${bulkDeleteModal.ids.length} takedown(s) selecionado(s)?`} onConfirm={handleBulkDelete} />
    </MainLayout>
    </FeatureGate>
  );
}
