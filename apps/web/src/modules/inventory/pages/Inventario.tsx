import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Package, Wrench, CheckCircle, Upload, Download, Plus, Search, Monitor, Loader2, MoreHorizontal, Eye, Pencil, Trash2, MapPin, User } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Checkbox } from "@/shared/ui/checkbox";
import { InventarioFormModal } from "@/modules/inventory/components/InventarioFormModal";
import { InventarioViewModal } from "@/modules/inventory/components/InventarioViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { EmptyState } from "@/shared/components/EmptyState";
import { useInventario } from "@/modules/inventory/hooks/useInventario";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { FeatureGate } from '@/shared/components/FeatureGate';

const inventarioColumns: CSVColumn[] = [
  { key: "setor", label: "Setor" },
  { key: "categoria", label: "Categoria" },
  { key: "nome", label: "Nome do Item" },
  { key: "quantidade", label: "Quantidade" },
  { key: "localizacao", label: "Localização" },
  { key: "responsavel", label: "Responsável" },
  { key: "status", label: "Status" },
  { key: "dataEntrada", label: "Data de Entrada" },
  { key: "valor_unitario", label: "Valor Unitário (R$)" },
  { key: "observacoes", label: "Observações" },
];

export default function Inventario() {
  const { inventario, isLoading, deleteInventario, addInventario } = useInventario();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEquipamentos.length && filteredEquipamentos.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEquipamentos.map((i: any) => i.id));
    }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteInventario.mutate(id));
    toast.success(`${selectedIds.length} item(ns) excluído(s) com sucesso`);
    setSelectedIds([]);
  };
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; item?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all-category");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [localFilter, setLocalFilter] = useState("all-local");

  const handleExport = () => exportToCSV(inventario, inventarioColumns, "inventario");
  const handleImport = () => importCSV(async (data) => {
    let importados = 0;
    for (const row of data) {
      const nome = row["Nome do Item"] || row["Nome"] || row["nome"] || row["NOME"];
      if (!nome) continue;
      try {
        await addInventario.mutateAsync({
          nome,
          setor: row["Setor"] || row["setor"] || null,
          categoria: row["Categoria"] || row["categoria"] || null,
          quantidade: row["Quantidade"] || row["quantidade"] ? Number(row["Quantidade"] || row["quantidade"]) : null,
          localizacao: row["Localização"] || row["localizacao"] || row["Local"] || null,
          responsavel: row["Responsável"] || row["responsavel"] || null,
          status: row["Status"] || row["status"] || "disponivel",
          dataEntrada: row["Data de Entrada"] || row["dataEntrada"] || null,
          valor_unitario: row["Valor Unitário (R$)"] || row["Valor Unitário"] || row["valor_unitario"] ? Number(row["Valor Unitário (R$)"] || row["Valor Unitário"] || row["valor_unitario"]) : null,
          observacoes: row["Observações"] || row["observacoes"] || null,
        } as any);
        importados++;
      } catch {}
    }
    if (importados > 0) toast.success(`${importados} item(ns) importado(s) com sucesso!`);
    else toast.error("Nenhum item válido encontrado no arquivo");
  }, ["Nome do Item", "Categoria", "Quantidade", "Status"]);

  const filteredEquipamentos = useMemo(() => inventario.filter((item) => {
    const matchesSearch = item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.localizacao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all-category" || item.categoria?.toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === "all-status" || 
      (statusFilter === "em-uso" && item.status === "em_uso") ||
      (statusFilter === "disponivel" && item.status === "disponivel") ||
      (statusFilter === "manutencao" && item.status === "manutencao");
    const matchesLocal = localFilter === "all-local" || 
      (localFilter === "estudio1" && item.localizacao === "Estúdio 1") ||
      (localFilter === "estudio2" && item.localizacao === "Estúdio 2") ||
      (localFilter === "escritorio" && item.localizacao === "Escritório") ||
      (localFilter === "estoque" && item.localizacao === "Estoque");
    return matchesSearch && matchesCategory && matchesStatus && matchesLocal;
  }), [inventario, searchTerm, categoryFilter, statusFilter, localFilter]);

  const hasActiveFilters = searchTerm !== "" || categoryFilter !== "all-category" || statusFilter !== "all-status" || localFilter !== "all-local";

  const handleClearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all-category");
    setStatusFilter("all-status");
    setLocalFilter("all-local");
  };

  const handleDelete = () => {
    if (deleteModal.item) {
      deleteInventario.mutate(deleteModal.item.id);
      setDeleteModal({ open: false });
    }
  };

  const metricas = useMemo(() => ({
    total: inventario.length,
    emUso: inventario.filter(e => e.status === "em_uso").length,
    disponiveis: inventario.filter(e => e.status === "disponivel").length,
    emManutencao: inventario.filter(e => e.status === "manutencao").length,
  }), [inventario]);

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
      <RequirePermission module="inventory" action="write">
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white" onClick={() => setFormModal({ open: true, mode: "create" })}><Plus className="h-4 w-4" />Novo Item</Button>
      </RequirePermission>
    </>
  );

  return (
    <FeatureGate feature="moduleInventory" featureName="Estoque & Inventário">
    <MainLayout title="Inventário" description="Controle de equipamentos e patrimônio" actions={headerActions}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Total de Itens</span><Package className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2 flex items-baseline justify-between"><span className="text-2xl font-bold text-foreground">{metricas.total}</span></div><p className="text-xs text-muted-foreground mt-1">equipamentos cadastrados</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Em Uso</span><Package className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2 flex items-baseline justify-between"><span className="text-2xl font-bold text-foreground">{metricas.emUso}</span></div><p className="text-xs text-muted-foreground mt-1">em operação</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Em Manutenção</span><Wrench className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2 flex items-baseline justify-between"><span className="text-2xl font-bold text-foreground">{metricas.emManutencao}</span></div><p className="text-xs text-muted-foreground mt-1">equipamentos</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Disponíveis</span><CheckCircle className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2 flex items-baseline justify-between"><span className="text-2xl font-bold text-foreground">{metricas.disponiveis}</span></div><p className="text-xs text-muted-foreground mt-1">prontos para uso</p></CardContent></Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar equipamentos por nome, categoria ou local..." className="pl-10 bg-card border-border" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-[170px] bg-card border-border"><SelectValue placeholder="Todos Categoria" /></SelectTrigger><SelectContent><SelectItem value="all-category">Todos Categoria</SelectItem><SelectItem value="áudio">Áudio</SelectItem><SelectItem value="vídeo">Vídeo</SelectItem><SelectItem value="computador">Computador</SelectItem><SelectItem value="iluminação">Iluminação</SelectItem><SelectItem value="estrutura">Estrutura</SelectItem></SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px] bg-card border-border"><SelectValue placeholder="Todos Status" /></SelectTrigger><SelectContent><SelectItem value="all-status">Todos Status</SelectItem><SelectItem value="em-uso">Em Uso</SelectItem><SelectItem value="disponivel">Disponível</SelectItem><SelectItem value="manutencao">Manutenção</SelectItem></SelectContent></Select>
          <Select value={localFilter} onValueChange={setLocalFilter}><SelectTrigger className="w-[140px] bg-card border-border"><SelectValue placeholder="Todos Local" /></SelectTrigger><SelectContent><SelectItem value="all-local">Todos Local</SelectItem><SelectItem value="estudio1">Estúdio 1</SelectItem><SelectItem value="estudio2">Estúdio 2</SelectItem><SelectItem value="escritorio">Escritório</SelectItem><SelectItem value="estoque">Estoque</SelectItem></SelectContent></Select>
          {hasActiveFilters && <Button variant="outline" onClick={handleClearFilters}>Limpar</Button>}
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Lista de Equipamentos</CardTitle>
              <CardDescription>Inventário completo de equipamentos e instrumentos</CardDescription>
            </div>
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                <Trash2 className="h-3.5 w-3.5" />
                Excluir ({selectedIds.length})
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {filteredEquipamentos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]">
                      <Checkbox
                        checked={selectedIds.length === filteredEquipamentos.length && filteredEquipamentos.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-center">Qtd.</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipamentos.map((item: any) => (
                    <TableRow key={item.id} data-testid={`card-inventario-${item.id}`} className={selectedIds.includes(item.id) ? "bg-muted/20" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          data-testid={`checkbox-inventario-${item.id}`}
                          aria-label={`Selecionar ${item.nome}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-inventario-nome-${item.id}`}>{item.nome}</TableCell>
                      <TableCell>
                        {item.categoria ? <Badge variant="outline" className="text-xs">{item.categoria}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {item.setor ? <Badge variant="secondary" className="text-xs">{item.setor}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-center">{item.quantidade || 1}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.localizacao || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.responsavel || "—"}</TableCell>
                      <TableCell className="text-right text-success font-medium">{item.valor_unitario ? formatCurrency(item.valor_unitario) : "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.dataEntrada ? formatDate(item.dataEntrada) : "—"}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-menu-inventario-${item.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem data-testid={`button-ver-inventario-${item.id}`} onClick={() => setViewModal({ open: true, item })}>
                              <Eye className="h-4 w-4 mr-2" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`button-editar-inventario-${item.id}`} onClick={() => setFormModal({ open: true, mode: "edit", item })}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`button-excluir-inventario-${item.id}`} onClick={() => setDeleteModal({ open: true, item })} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
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
                icon={Package}
                title="Nenhum equipamento cadastrado"
                description="Comece adicionando seu primeiro item ao inventário"
                actionLabel="Novo Item"
                onAction={() => setFormModal({ open: true, mode: "create" })}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <InventarioViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} item={viewModal.item} />
      <InventarioFormModal open={formModal.open} onOpenChange={(open) => setFormModal({ ...formModal, open })} item={formModal.item} mode={formModal.mode} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Item" description={`Tem certeza que deseja excluir "${deleteModal.item?.nome}"?`} onConfirm={handleDelete} />
    </MainLayout>
    </FeatureGate>
  );
}
