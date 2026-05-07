import { useCallback, useState, useMemo, useRef } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Users, Download, Plus, Phone, Mail, Search, Eye, Upload, Pencil, Trash2, MoreHorizontal, UserCheck, UserPlus, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { ContratoStatusBadge, getContratoSituacao } from "@/shared/components/ContratoStatusBadge";
import { CRMFormModal } from "@/modules/crm/components/CRMFormModal";
import { CRMViewModal } from "@/modules/crm/components/CRMViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { ListItemSkeleton } from "@/shared/components/PageSkeletons";
import { toast } from "sonner";
const getXLSX = () => import("xlsx");

type Cliente = Record<string, any>;

const temperaturaBadge: Record<string, string> = {
  quente: "bg-warning text-warning-foreground",
  frio: "bg-blue-500 text-white",
  morno: "bg-orange-400 text-white",
};

const prioridadeBadge: Record<string, string> = {
  alta: "bg-destructive text-white",
  media: "bg-warning text-warning-foreground",
  baixa: "bg-success text-success-foreground",
};

export default function CRM() {
  const { clientes: rawClientes, isLoading: clientesLoading, deleteCliente, addCliente } = useClientes();
  const { contratos } = useContratos();
  const clientes = rawClientes as Cliente[];
  const csvInputRef = useRef<HTMLInputElement>(null);

  const isLoading = clientesLoading;

  const contratosPorCliente = useMemo(() => {
    const map = new Map<string, Array<{ status?: string | null; data_fim?: string | null }>>();
    for (const c of contratos as Array<{ cliente_id?: string | null; status?: string | null; data_fim?: string | null }>) {
      if (!c.cliente_id) continue;
      const arr = map.get(c.cliente_id) ?? [];
      arr.push({ status: c.status, data_fim: c.data_fim });
      map.set(c.cliente_id, arr);
    }
    return map;
  }, [contratos]);

  const kpis = useMemo(() => ({
    total: clientes.length,
    ativos: clientes.filter(c => c.status === "ativo").length,
    leads: clientes.filter(c => c.status === "lead").length,
    comContrato: clientes.filter(c => contratosPorCliente.has(c.id)).length,
  }), [clientes, contratosPorCliente]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClientes.length && filteredClientes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClientes.map((c: any) => c.id));
    }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteCliente.mutate(id));
    toast.success(`${selectedIds.length} contato(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    cliente?: Cliente;
  }>({
    open: false,
    mode: "create"
  });
  const [viewModal, setViewModal] = useState<{
    open: boolean;
    cliente?: Cliente;
  }>({
    open: false
  });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    cliente?: Cliente;
  }>({
    open: false
  });

  useEditQueryParam(
    "edit",
    clientes,
    useCallback((cliente: Cliente) => setFormModal({ open: true, mode: "edit", cliente }), []),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [tipoPessoaFilter, setTipoPessoaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredClientes = useMemo(() => {
    return clientes.filter(cliente => {
      const matchesSearch = searchTerm === "" || 
        cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        cliente.responsavel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipoPessoa = tipoPessoaFilter === "all" || cliente.tipo_pessoa === tipoPessoaFilter;
      const matchesStatus = statusFilter === "all" || cliente.status === statusFilter;
      return matchesSearch && matchesTipoPessoa && matchesStatus;
    });
  }, [clientes, searchTerm, tipoPessoaFilter, statusFilter]);

  const hasActiveFilters = searchTerm !== "" || tipoPessoaFilter !== "all" || statusFilter !== "all";

  const handleDelete = () => {
    if (deleteModal.cliente) {
      deleteCliente.mutate(deleteModal.cliente.id);
      setDeleteModal({ open: false });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTipoPessoaFilter("all");
    setStatusFilter("all");
  };

  const getInitials = (nome: string) => {
    return nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleExcelExport = async () => {
    if (filteredClientes.length === 0) {
      toast.error("Nenhum cliente para exportar");
      return;
    }
    const exportData = filteredClientes.map(c => ({
      nome: c.nome,
      tipo: c.tipo || "",
      email: c.email || "",
      telefone: c.telefone || "",
      cpf: c.cpf || "",
      cnpj: c.cnpj || "",
      endereco: c.endereco || "",
      cidade: c.cidade || "",
      estado: c.estado || "",
      cep: c.cep || "",
      status: c.status || "",
      observacoes: c.observacoes || "",
    }));
    const XLSX = await getXLSX();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CRM");
    XLSX.writeFile(workbook, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${filteredClientes.length} cliente(s) exportado(s) com sucesso!`);
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await getXLSX();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        toast.error("Arquivo Excel vazio");
        return;
      }

      let importados = 0;
      for (const row of data) {
        const nome = row.nome || row.Nome || row.NOME || row.name || row.Name;
        if (!nome) continue;

        await addCliente.mutateAsync({
          nome,
          tipo: row.tipo || row.Tipo || null,
          email: row.email || row.Email || row.EMAIL || null,
          telefone: row.telefone || row.Telefone || row.TELEFONE || row.phone || row.Phone || null,
          cpf: row.cpf || row.CPF || null,
          cnpj: row.cnpj || row.CNPJ || null,
          cep: row.cep || row.CEP || null,
          status: row.status || row.Status || "lead",
          cidade: row.cidade || row.Cidade || null,
          estado: row.estado || row.Estado || row.uf || row.UF || null,
          endereco: row.endereco || row.Endereço || row.Endereco || null,
          observacoes: row.observacoes || row.Observações || row.Observacoes || null,
        });
        importados++;
      }

      toast.success(`${importados} cliente(s) importado(s) com sucesso!`);
    } catch {
      toast.error("Erro ao importar Excel");
    }

    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  };

  const headerActions = (
    <>
      <input
        type="file"
        ref={csvInputRef}
        accept=".xlsx,.xls"
        onChange={handleExcelUpload}
        className="hidden"
      />
      <Button variant="outline" size="sm" className="gap-2" data-testid="button-importar-crm" onClick={() => csvInputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        Importar
      </Button>
      <Button variant="outline" size="sm" className="gap-2" data-testid="button-exportar-crm" onClick={handleExcelExport}>
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      <Button size="sm" className="gap-2 bg-primary" data-testid="button-novo-contato" onClick={() => setFormModal({
        open: true,
        mode: "create"
      })}>
        <Plus className="h-4 w-4" />
        Novo Contato
      </Button>
    </>
  );

  return (
    <MainLayout title="CRM" description="Gestão de relacionamento com clientes" actions={headerActions}>
      <div className="space-y-6 pt-[10px] pb-[10px]">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card data-testid="kpi-total-contatos">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Contatos</p>
                  <p className="text-3xl font-bold mt-1">{isLoading ? "—" : kpis.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-clientes-ativos">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-3xl font-bold mt-1 text-success">{isLoading ? "—" : kpis.ativos}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-leads">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Leads</p>
                  <p className="text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">{isLoading ? "—" : kpis.leads}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="kpi-com-contrato">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Com Contrato</p>
                  <p className="text-3xl font-bold mt-1 text-purple-600 dark:text-purple-400">{isLoading ? "—" : kpis.comContrato}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou responsável..." className="pl-10 bg-card border-border" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} data-testid="input-search-crm" />
          </div>

          <Select value={tipoPessoaFilter} onValueChange={setTipoPessoaFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border" data-testid="select-tipo-pessoa">
              <SelectValue placeholder="Tipo Pessoa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
              <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">Limpar</Button>}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Lista de Contatos</CardTitle>
                <CardDescription>Todos os contatos e prospects em acompanhamento</CardDescription>
              </div>
              {clientes.length > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer"
                    onClick={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  >
                    {selectedIds.length === filteredClientes.length && filteredClientes.length > 0 && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
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
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)
            ) : filteredClientes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum cliente encontrado</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setFormModal({
                  open: true,
                  mode: "create"
                })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar primeiro cliente
                </Button>
              </div>
            ) : (
              filteredClientes.map(cliente => {
                const clienteContratos = contratosPorCliente.get(cliente.id) ?? [];
                const situacao = getContratoSituacao(clienteContratos);
                return (
                  <div key={cliente.id} data-testid={`row-contato-${cliente.id}`} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                    <div className={`w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer flex-shrink-0 ${selectedIds.includes(cliente.id) ? 'bg-primary' : ''}`} onClick={() => toggleSelect(cliente.id)} data-testid={`checkbox-contato-${cliente.id}`}>
                      {selectedIds.includes(cliente.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>

                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-muted-foreground/20 text-foreground text-sm">
                        {getInitials(cliente.nome)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 w-36 flex-shrink-0">
                      <h3 className="font-semibold text-sm truncate" data-testid={`text-nome-${cliente.id}`}>{cliente.nome}</h3>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        {cliente.cargo && (
                          <Badge variant="outline" className="text-[10px] py-0 no-default-hover-elevate no-default-active-elevate">{cliente.cargo}</Badge>
                        )}
                        {cliente.temperatura && (
                          <Badge className={`text-[10px] py-0 no-default-hover-elevate no-default-active-elevate ${temperaturaBadge[cliente.temperatura] || "bg-muted text-muted-foreground"}`}>
                            {cliente.temperatura}
                          </Badge>
                        )}
                        {cliente.prioridade && (
                          <Badge className={`text-[10px] py-0 no-default-hover-elevate no-default-active-elevate ${prioridadeBadge[cliente.prioridade] || "bg-muted text-muted-foreground"}`}>
                            {cliente.prioridade}
                          </Badge>
                        )}
                        <ContratoStatusBadge
                          situacao={situacao}
                          className="no-default-hover-elevate no-default-active-elevate"
                          data-testid={`badge-contrato-${cliente.id}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1 min-w-0 text-xs text-muted-foreground">
                      {cliente.telefone && (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{cliente.telefone}</span>
                        </span>
                      )}
                      {cliente.email && (
                        <span className="flex items-center gap-1 min-w-0">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{cliente.email}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                      {cliente.empresa && (
                        <div className="text-center">
                          <p className="text-muted-foreground">Empresa</p>
                          <p className="font-medium text-foreground truncate max-w-[100px]">{cliente.empresa}</p>
                        </div>
                      )}
                      {cliente.cargo && (
                        <div className="text-center">
                          <p className="text-muted-foreground">Cargo</p>
                          <p className="font-medium text-foreground truncate max-w-[80px]">{cliente.cargo}</p>
                        </div>
                      )}
                      {cliente.cidade && (
                        <div className="text-center">
                          <p className="text-muted-foreground">Cidade</p>
                          <p className="font-medium text-foreground truncate max-w-[100px]">{cliente.cidade}/{cliente.estado}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">Ações</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${cliente.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid={`button-ver-${cliente.id}`} onClick={() => setViewModal({ open: true, cliente })}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid={`button-editar-${cliente.id}`} onClick={() => setFormModal({ open: true, mode: "edit", cliente })}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid={`button-excluir-${cliente.id}`} className="text-destructive" onClick={() => setDeleteModal({ open: true, cliente })}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <CRMFormModal 
        open={formModal.open} 
        onOpenChange={open => setFormModal({ ...formModal, open })} 
        cliente={formModal.cliente as any} 
        mode={formModal.mode} 
      />

      <CRMViewModal 
        open={viewModal.open} 
        onOpenChange={open => setViewModal({ ...viewModal, open })} 
        cliente={viewModal.cliente as any} 
      />

      <DeleteConfirmModal 
        open={deleteModal.open} 
        onOpenChange={open => setDeleteModal({ ...deleteModal, open })} 
        title="Excluir Cliente" 
        description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita." 
        onConfirm={handleDelete} 
      />
    </MainLayout>
  );
}
