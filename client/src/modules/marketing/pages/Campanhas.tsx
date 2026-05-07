import { useCallback, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Target, DollarSign, MousePointer, BarChart3, Search, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { CampanhaFormModal } from "@/modules/marketing/components/CampanhaFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { useCampanhas } from "@/modules/marketing/hooks/useCampanhas";

const getStatusColor = (status: string) => {
  switch (status) {
    case "ativa": return "bg-success text-success-foreground";
    case "pausada": return "bg-warning text-warning-foreground";
    case "concluida": return "bg-blue-600 text-white";
    case "rascunho": return "bg-gray-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function MarketingCampanhas() {
  const { campanhas, isLoading, deleteCampanha } = useCampanhas();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCampanha, setSelectedCampanha] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; campanha?: any }>({ open: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all-plat");

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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCampanhas.length && filteredCampanhas.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCampanhas.map((c: any) => c.id));
    }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteCampanha.mutate(id));
    toast.success(`${selectedIds.length} campanha(s) excluída(s) com sucesso`);
    setSelectedIds([]);
  };

  // Filter campanhas
  const filteredCampanhas = campanhas.filter((c: any) => {
    const matchesSearch = searchTerm === "" || 
      c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesPlatform = platformFilter === "all-plat" || c.plataforma === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

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

  const headerActions = (
    <Button className="bg-primary hover:bg-primary/90" onClick={handleNovaCampanha}>
      + Nova Campanha
    </Button>
  );

  return (
    <MainLayout title="Campanhas de Marketing" description="Planeje, execute e monitore campanhas de marketing e tráfego pago" actions={headerActions}>
      <div className="space-y-6 pt-[10px] pb-[10px]">
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Campanhas Ativas</span>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{campanhasAtivas}</span>
                <p className="text-xs text-muted-foreground mt-1">em execução</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Budget Total</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">R$ {budgetTotal.toLocaleString("pt-BR")}</span>
                <p className="text-xs text-muted-foreground mt-1">investimento</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gasto Total</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">R$ {gastoTotal.toLocaleString("pt-BR")}</span>
                <p className="text-xs text-muted-foreground mt-1">executado</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cliques</span>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{cliquesTotal.toLocaleString("pt-BR")}</span>
                <p className="text-xs text-muted-foreground mt-1">total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CTR Médio</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">0%</span>
                <p className="text-xs text-muted-foreground mt-1">taxa de clique</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar campanhas por nome ou descrição..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas Plataformas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-plat">Todas Plataformas</SelectItem>
              <SelectItem value="meta">Meta Ads</SelectItem>
              <SelectItem value="google">Google Ads</SelectItem>
              <SelectItem value="tiktok">TikTok Ads</SelectItem>
            </SelectContent>
          </Select>
          {(searchTerm !== "" || statusFilter !== "all" || platformFilter !== "all-plat") && (
            <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPlatformFilter("all-plat"); }}>
              Limpar
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Todas as Campanhas</CardTitle>
                <CardDescription>Gerencie campanhas de marketing e tráfego pago em um só lugar</CardDescription>
              </div>
              {filteredCampanhas.length > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer"
                    onClick={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  >
                    {selectedIds.length === filteredCampanhas.length && filteredCampanhas.length > 0 && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm text-muted-foreground">Selecionar todos</span>
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir ({selectedIds.length})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredCampanhas.length > 0 ? (
              <div className="space-y-3">
                <div className="hidden md:flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="w-10" />
                  <div className="flex-1 min-w-0">Campanha</div>
                  <div className="w-9 text-center">Ações</div>
                </div>
                {filteredCampanhas.map((campanha: any) => (
                  <div key={campanha.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div
                      className={`w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer shrink-0 ${selectedIds.includes(campanha.id) ? 'bg-primary' : ''}`}
                      onClick={() => toggleSelect(campanha.id)}
                      data-testid={`checkbox-campanha-${campanha.id}`}
                    >
                      {selectedIds.includes(campanha.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{campanha.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{campanha.plataforma || "Não definido"}</Badge>
                        <Badge className={`text-xs ${getStatusColor(campanha.status)}`}>{campanha.status}</Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(campanha)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteModal({ open: true, campanha })} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title="Nenhuma campanha cadastrada"
                description="Comece criando sua primeira campanha de marketing"
                actionLabel="Nova Campanha"
                onAction={handleNovaCampanha}
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
  );
}
