import { useCallback, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Target, DollarSign, MousePointer, BarChart3,
  Search, Loader2, MoreHorizontal, Pencil, Trash2, Plus, X,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { CampanhaFormModal } from "@/modules/marketing/components/CampanhaFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { MetricCard } from "@/shared/components/MetricCard";
import { useCampanhas } from "@/modules/marketing/hooks/useCampanhas";
import { toast } from "sonner";
import { formatCurrency } from "@/shared/lib/format-utils";
import { FeatureGate } from '@/shared/components/FeatureGate';

export default function MarketingCampanhas() {
  const { campanhas, isLoading, deleteCampanha } = useCampanhas();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCampanha, setSelectedCampanha] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; campanha?: any }>({ open: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all-plat");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleNovaCampanha = () => {
    setSelectedCampanha(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleEdit = useCallback((campanha: any) => {
    setSelectedCampanha(campanha);
    setModalMode("edit");
    setModalOpen(true);
  }, []);

  useEditQueryParam("edit", campanhas, handleEdit);

  const handleDelete = () => {
    if (deleteModal.campanha) {
      deleteCampanha.mutate(deleteModal.campanha.id);
      setDeleteModal({ open: false });
    }
  };

  const filteredCampanhas = campanhas.filter((c: any) => {
    const matchesSearch =
      searchTerm === "" ||
      c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesPlatform = platformFilter === "all-plat" || c.plataforma === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || platformFilter !== "all-plat";

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCampanhas.length && filteredCampanhas.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCampanhas.map((c: any) => c.id));
    }
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteCampanha.mutate(id));
    toast.success(`${selectedIds.length} campanha(s) excluída(s) com sucesso`);
    setSelectedIds([]);
  };

  // Metrics
  const campanhasAtivas = campanhas.filter((c: any) => c.status === "ativa").length;
  const budgetTotal = campanhas.reduce((acc: number, c: any) => acc + (c.budget || 0), 0);
  const gastoTotal = campanhas.reduce((acc: number, c: any) => acc + (c.gasto || 0), 0);
  const cliquesTotal = campanhas.reduce((acc: number, c: any) => acc + (c.cliques || 0), 0);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <FeatureGate feature="moduleMarketing" featureName="Marketing & Campanhas">
    <MainLayout
      title="Campanhas de Marketing"
      description="Planeje, execute e monitore campanhas e tráfego pago"
      actions={
        <RequirePermission module="marketing" action="write">
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleNovaCampanha}>
            <Plus className="h-3.5 w-3.5" />
            Nova Campanha
          </Button>
        </RequirePermission>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Campanhas Ativas" value={campanhasAtivas} description="em execução" icon={Target} accent="primary" />
          <MetricCard title="Budget Total" value={formatCurrency(budgetTotal)} description="investimento" icon={DollarSign} accent="success" />
          <MetricCard title="Gasto Total" value={formatCurrency(gastoTotal)} description="executado" icon={DollarSign} accent={gastoTotal > budgetTotal ? "destructive" : "warning"} />
          <MetricCard title="Cliques" value={cliquesTotal.toLocaleString("pt-BR")} description="total" icon={MousePointer} accent="primary" />
          <MetricCard title="CTR Médio" value="0%" description="taxa de clique" icon={BarChart3} accent="primary" />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-plat">Todas</SelectItem>
              <SelectItem value="meta">Meta Ads</SelectItem>
              <SelectItem value="google">Google Ads</SelectItem>
              <SelectItem value="tiktok">TikTok Ads</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost" size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground"
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPlatformFilter("all-plat"); }}
            >
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        {/* ── Table Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Todas as Campanhas
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredCampanhas.length})</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Gerencie campanhas em um só lugar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <span className="text-xs text-muted-foreground flex-1">{selectedIds.length} selecionada(s)</span>
                <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir ({selectedIds.length})
                </Button>
              </div>
            )}

            {filteredCampanhas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]">
                      <Checkbox
                        checked={selectedIds.length === filteredCampanhas.length && filteredCampanhas.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Gasto</TableHead>
                    <TableHead>Cliques</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampanhas.map((campanha: any) => (
                    <TableRow key={campanha.id} data-testid={`row-campanha-${campanha.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(campanha.id)}
                          onCheckedChange={() => toggleSelect(campanha.id)}
                          data-testid={`checkbox-campanha-${campanha.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{campanha.nome}</TableCell>
                      <TableCell>
                        {campanha.plataforma ? (
                          <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
                            {campanha.plataforma}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={campanha.status} /></TableCell>
                      <TableCell className="font-mono text-sm">{campanha.budget ? formatCurrency(campanha.budget) : "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{campanha.gasto ? formatCurrency(campanha.gasto) : "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{campanha.cliques?.toLocaleString("pt-BR") || "—"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-acoes-campanha-${campanha.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(campanha)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteModal({ open: true, campanha })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Target}
                title={hasActiveFilters ? "Nenhum resultado" : "Nenhuma campanha cadastrada"}
                description={
                  hasActiveFilters
                    ? "Nenhuma campanha corresponde aos filtros."
                    : "Comece criando sua primeira campanha de marketing."
                }
                actionLabel={hasActiveFilters ? undefined : "Nova Campanha"}
                onAction={hasActiveFilters ? undefined : handleNovaCampanha}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <CampanhaFormModal open={modalOpen} onOpenChange={setModalOpen} initialData={selectedCampanha} mode={modalMode} />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Campanha"
        description={`Tem certeza que deseja excluir a campanha "${deleteModal.campanha?.nome}"?`}
        onConfirm={handleDelete}
      />
    </MainLayout>
    </FeatureGate>
  );
}
