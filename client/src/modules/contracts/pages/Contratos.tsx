import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { FileText, Clock, CheckCircle, Upload, Download, Plus, Search, FileStack, Loader2, MoreHorizontal, Eye, Pencil, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { ContratoFormModal } from "@/modules/contracts/components/ContratoFormModal";
import { ContratoViewModal } from "@/modules/contracts/components/ContratoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { formatCurrency, formatDate } from "@/shared/lib/utils-format";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatusBadge } from "@/shared/components/StatusBadge";

const contratoColumns: CSVColumn[] = [
  { key: "titulo", label: "Título" },
  { key: "tipo", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "artista", label: "Artista", transform: (r) => r.artistas?.nome_artistico || "" },
  { key: "cliente", label: "Cliente", transform: (r) => r.clientes?.nome || "" },
  { key: "data_inicio", label: "Data Início" },
  { key: "data_fim", label: "Data Fim" },
  { key: "valor", label: "Valor (R$)" },
  { key: "exclusivo", label: "Exclusivo" },
  { key: "assinado_em", label: "Assinado Em" },
  { key: "observacoes", label: "Observações" },
];

export default function Contratos() {
  const navigate = useNavigate();
  const { contratos, isLoading, deleteContrato, addContrato } = useContratos();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContratos.length && filteredContratos.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContratos.map((c: any) => c.id));
    }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteContrato.mutate(id));
    toast.success(`${selectedIds.length} contrato(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; contrato?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; contrato?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; contrato?: any }>({ open: false });

  useEditQueryParam(
    "edit",
    contratos,
    useCallback((contrato) => setFormModal({ open: true, mode: "edit", contrato }), []),
  );

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");

  // Filter logic
  const filteredContratos = contratos.filter((contrato) => {
    const matchesSearch = searchTerm === "" || 
      contrato.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.artistas?.nome_artistico?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all-type" || contrato.tipo === typeFilter;
    
    const matchesStatus = statusFilter === "all-status" || contrato.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all-type");
    setStatusFilter("all-status");
  };

  const handleExport = () => exportToCSV(contratos, contratoColumns, "contratos");
  const handleImport = () => importCSV(async (data) => {
    let importados = 0;
    for (const row of data) {
      const titulo = row["Título"] || row["titulo"] || row["TITULO"];
      if (!titulo) continue;
      try {
        await addContrato.mutateAsync({
          titulo,
          tipo: row["Tipo"] || row["tipo"] || "distribuicao",
          status: row["Status"] || row["status"] || "rascunho",
          data_inicio: row["Data Início"] || row["data_inicio"] || null,
          data_fim: row["Data Fim"] || row["data_fim"] || null,
          valor: row["Valor (R$)"] || row["Valor"] || row["valor"] ? Number(row["Valor (R$)"] || row["Valor"] || row["valor"]) : null,
          exclusivo: row["Exclusivo"] ? (row["Exclusivo"] === "true" || row["Exclusivo"] === "1") : null,
          assinado_em: row["Assinado Em"] || row["assinado_em"] || null,
          observacoes: row["Observações"] || row["observacoes"] || null,
        } as any);
        importados++;
      } catch {}
    }
    if (importados > 0) toast.success(`${importados} contrato(s) importado(s) com sucesso!`);
    else toast.error("Nenhum contrato válido encontrado no arquivo");
  }, ["Título", "Tipo", "Status", "Data Início"]);

  const handleDelete = () => {
    if (deleteModal.contrato) {
      deleteContrato.mutate(deleteModal.contrato.id);
      setDeleteModal({ open: false });
    }
  };

  // Metrics — calculated from real contract dates, not status strings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const currentYear = today.getFullYear();

  const contratosVigentes = contratos.filter(c => {
    const start = c.data_inicio ? new Date(c.data_inicio) : null;
    const end   = c.data_fim   ? new Date(c.data_fim)   : null;
    return start && end && start <= today && end >= today;
  });

  const contratosAtivos = contratosVigentes.length;

  const contratosVencendo = contratos.filter(c => {
    const end = c.data_fim ? new Date(c.data_fim) : null;
    return end && end >= today && end <= in30Days;
  }).length;

  const assinadosEsteAno = contratos.filter(c => {
    const start = c.data_inicio ? new Date(c.data_inicio) : null;
    return start && start.getFullYear() === currentYear;
  }).length;

  const valorTotal = contratosVigentes.reduce((acc, c) => acc + (c.valor || 0), 0);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const headerActions = (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleImport}><Upload className="h-4 w-4" />Importar</Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}><Download className="h-4 w-4" />Exportar</Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/contratos/templates")}><FileStack className="h-4 w-4" />Templates</Button>
      <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white" onClick={() => setFormModal({ open: true, mode: "create" })}><Plus className="h-4 w-4" />Novo Contrato</Button>
    </>
  );

  return (
    <MainLayout title="Contratos" description="Gerencie contratos e documentação legal" actions={headerActions}>
      <div className="space-y-6 pt-[10px] pb-[10px]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Contratos Vigentes</span><FileText className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2"><span className="text-2xl font-bold text-foreground">{contratosAtivos}</span></div><p className="text-xs text-muted-foreground mt-1">ativos no momento</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Vencendo em 30 dias</span><Clock className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2"><span className="text-2xl font-bold text-foreground">{contratosVencendo}</span></div><p className="text-xs text-muted-foreground mt-1">precisam renovação</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Assinados este ano</span><CheckCircle className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2"><span className="text-2xl font-bold text-foreground">{assinadosEsteAno}</span></div><p className="text-xs text-muted-foreground mt-1">contratos assinados</p></CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Valor Total</span><FileText className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2"><span className="text-2xl font-bold text-foreground">{formatCurrency(valorTotal)}</span></div><p className="text-xs text-muted-foreground mt-1">contratos vigentes</p></CardContent></Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar contratos por artista, tipo ou valor..." 
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border"><SelectValue placeholder="Todos Tipo de..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all-type">Todos Tipo de...</SelectItem>
              <SelectItem value="agenciamento">Agenciamento</SelectItem>
              <SelectItem value="distribuicao">Distribuição</SelectItem>
              <SelectItem value="licenciamento">Licenciamento</SelectItem>
              <SelectItem value="edicao">Edição</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border"><SelectValue placeholder="Todos Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="vencendo">Vencendo</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
            </SelectContent>
          </Select>
          {(searchTerm !== "" || typeFilter !== "all-type" || statusFilter !== "all-status") && (
            <Button variant="outline" onClick={handleClearFilters}>Limpar</Button>
          )}
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Lista de Contratos ({filteredContratos.length})</CardTitle><CardDescription>Acompanhe todos os contratos e seus vencimentos</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {contratos.length > 0 && (
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer" onClick={toggleSelectAll}>
                  {selectedIds.length === filteredContratos.length && filteredContratos.length > 0 && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="text-sm text-muted-foreground flex-1">Selecionar todos</span>
                {selectedIds.length > 0 && (
                  <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir ({selectedIds.length})
                  </Button>
                )}
              </div>
            )}

            {filteredContratos.length > 0 ? (
              <div className="space-y-3">
                {filteredContratos.map((contrato) => (
                  <div key={contrato.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className={`w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer ${selectedIds.includes(contrato.id) ? 'bg-primary' : ''}`} onClick={() => toggleSelect(contrato.id)}>
                      {selectedIds.includes(contrato.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{contrato.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {contrato.artistas?.nome_artistico || contrato.clientes?.nome || "Sem vínculo"}
                      </p>
                      <StatusBadge status={contrato.status} />
                    </div>
                    <div className="hidden lg:flex items-center gap-8 text-sm">
                      <div><span className="text-muted-foreground text-xs">Período</span><p className="text-foreground">{formatDate(contrato.data_inicio)} - {formatDate(contrato.data_fim)}</p></div>
                      {contrato.valor && <div><span className="text-muted-foreground text-xs">Valor</span><p className="text-foreground">{formatCurrency(contrato.valor)}</p></div>}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">Ações</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewModal({ open: true, contrato })}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", contrato })}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteModal({ open: true, contrato })} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="Nenhum contrato cadastrado"
                description="Comece criando seu primeiro contrato"
                actionLabel="Novo Contrato"
                onAction={() => setFormModal({ open: true, mode: "create" })}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ContratoViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} contrato={viewModal.contrato} />
      <ContratoFormModal open={formModal.open} onOpenChange={(open) => setFormModal({ ...formModal, open })} contrato={formModal.contrato} mode={formModal.mode} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Contrato" description={`Tem certeza que deseja excluir o contrato "${deleteModal.contrato?.titulo}"?`} onConfirm={handleDelete} />
    </MainLayout>
  );
}
