import { useCallback, useState, useMemo, useRef } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Users, Download, Plus, Phone, Mail, Search, Eye, Upload,
  Pencil, Trash2, MoreHorizontal, UserCheck, UserPlus, FileText, X,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { ContratoStatusBadge, getContratoSituacao } from "@/shared/components/ContratoStatusBadge";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { MetricCard } from "@/shared/components/MetricCard";
import { EmptyState } from "@/shared/components/EmptyState";
import { CRMFormModal } from "@/modules/crm/components/CRMFormModal";
import { CRMViewModal } from "@/modules/crm/components/CRMViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { ListItemSkeleton } from "@/shared/components/PageSkeletons";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

const getXLSX = () => import("xlsx");

type Cliente = Record<string, any>;

// Enterprise tinted temperature/priority badges
const temperaturaStyle: Record<string, string> = {
  quente: "bg-destructive/10 text-destructive border-destructive/20",
  morno:  "bg-warning/10 text-warning border-warning/20",
  frio:   "bg-primary/10 text-primary border-primary/20",
};

export default function CRM() {
  const { clientes: rawClientes, isLoading: clientesLoading, deleteCliente, addCliente } = useClientes();
  const { contratos } = useContratos();
  const clientes = rawClientes as Cliente[];
  const csvInputRef = useRef<HTMLInputElement>(null);

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
    ativos: clientes.filter((c) => c.status === "ativo").length,
    leads: clientes.filter((c) => c.status === "lead").length,
    comContrato: clientes.filter((c) => contratosPorCliente.has(c.id)).length,
  }), [clientes, contratosPorCliente]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; cliente?: Cliente }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; cliente?: Cliente }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; cliente?: Cliente }>({ open: false });

  useEditQueryParam(
    "edit",
    clientes,
    useCallback((cliente: Cliente) => setFormModal({ open: true, mode: "edit", cliente }), []),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [tipoPessoaFilter, setTipoPessoaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredClientes = useMemo(() => {
    return clientes.filter((cliente) => {
      const matchesSearch =
        searchTerm === "" ||
        cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.responsavel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipoPessoa = tipoPessoaFilter === "all" || cliente.tipo_pessoa === tipoPessoaFilter;
      const matchesStatus = statusFilter === "all" || cliente.status === statusFilter;
      return matchesSearch && matchesTipoPessoa && matchesStatus;
    });
  }, [clientes, searchTerm, tipoPessoaFilter, statusFilter]);

  const hasActiveFilters = searchTerm !== "" || tipoPessoaFilter !== "all" || statusFilter !== "all";

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClientes.length && filteredClientes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClientes.map((c: any) => c.id));
    }
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteCliente.mutate(id));
    toast.success(`${selectedIds.length} contato(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };

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

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const handleExcelExport = async () => {
    if (filteredClientes.length === 0) {
      toast.error("Nenhum cliente para exportar");
      return;
    }
    const exportData = filteredClientes.map((c) => ({
      nome: c.nome, tipo: c.tipo || "", email: c.email || "",
      telefone: c.telefone || "", cpf: c.cpf || "", cnpj: c.cnpj || "",
      endereco: c.endereco || "", cidade: c.cidade || "", estado: c.estado || "",
      cep: c.cep || "", status: c.status || "", observacoes: c.observacoes || "",
    }));
    const XLSX = await getXLSX();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CRM");
    XLSX.writeFile(workbook, `clientes_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${filteredClientes.length} cliente(s) exportado(s) com sucesso!`);
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await getXLSX();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
      if (data.length === 0) { toast.error("Arquivo Excel vazio"); return; }
      let importados = 0;
      for (const row of data) {
        const nome = row.nome || row.Nome || row.NOME || row.name || row.Name;
        if (!nome) continue;
        await addCliente.mutateAsync({
          nome,
          tipo: row.tipo || row.Tipo || null,
          email: row.email || row.Email || row.EMAIL || null,
          telefone: row.telefone || row.Telefone || row.TELEFONE || null,
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
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  return (
    <MainLayout
      title="CRM"
      description="Gestão de relacionamento com clientes"
      actions={
        <>
          <input
            type="file"
            ref={csvInputRef}
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            data-testid="button-importar-crm"
            onClick={() => csvInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Importar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            data-testid="button-exportar-crm"
            onClick={handleExcelExport}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            data-testid="button-novo-contato"
            onClick={() => setFormModal({ open: true, mode: "create" })}
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Contato
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de Contatos"
            value={clientesLoading ? "—" : kpis.total}
            icon={Users}
            accent="primary"
          />
          <MetricCard
            title="Clientes Ativos"
            value={clientesLoading ? "—" : kpis.ativos}
            icon={UserCheck}
            accent="success"
          />
          <MetricCard
            title="Leads"
            value={clientesLoading ? "—" : kpis.leads}
            icon={UserPlus}
            accent="warning"
          />
          <MetricCard
            title="Com Contrato"
            value={clientesLoading ? "—" : kpis.comContrato}
            icon={FileText}
            accent="primary"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou responsável…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-crm"
            />
          </div>
          <Select value={tipoPessoaFilter} onValueChange={setTipoPessoaFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border" data-testid="select-tipo-pessoa">
              <SelectValue placeholder="Tipo Pessoa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
              <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-3 w-3" />
              Limpar
            </Button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredClientes.length} de {clientes.length} contatos
            </span>
          )}
        </div>

        {/* ── Contacts List ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Lista de Contatos
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredClientes.length})</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Todos os contatos e prospects em acompanhamento</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Bulk selection bar */}
            {clientes.length > 0 && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <Checkbox
                  checked={selectedIds.length === filteredClientes.length && filteredClientes.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-xs text-muted-foreground flex-1">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selecionado(s)`
                    : "Selecionar todos"}
                </span>
                {selectedIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleBulkDelete}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir ({selectedIds.length})
                  </Button>
                )}
              </div>
            )}

            {clientesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ListItemSkeleton key={i} />
                ))}
              </div>
            ) : filteredClientes.length === 0 ? (
              <EmptyState
                icon={Users}
                title={hasActiveFilters ? "Nenhum resultado" : "Nenhum contato cadastrado"}
                description={
                  hasActiveFilters
                    ? "Nenhum contato corresponde aos filtros aplicados."
                    : "Adicione seu primeiro cliente ou prospect."
                }
                actionLabel={hasActiveFilters ? undefined : "Novo Contato"}
                onAction={hasActiveFilters ? undefined : () => setFormModal({ open: true, mode: "create" })}
              />
            ) : (
              <div className="divide-y divide-border/60">
                {filteredClientes.map((cliente) => {
                  const clienteContratos = contratosPorCliente.get(cliente.id) ?? [];
                  const situacao = getContratoSituacao(clienteContratos);

                  return (
                    <div
                      key={cliente.id}
                      data-testid={`row-contato-${cliente.id}`}
                      className="flex items-center gap-3 py-3 first:pt-0 hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.includes(cliente.id)}
                        onCheckedChange={() => toggleSelect(cliente.id)}
                        data-testid={`checkbox-contato-${cliente.id}`}
                        className="shrink-0"
                      />

                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                          {getInitials(cliente.nome)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name + badges */}
                      <div className="min-w-0 w-36 shrink-0">
                        <h3
                          className="font-medium text-sm leading-tight truncate"
                          data-testid={`text-nome-${cliente.id}`}
                        >
                          {cliente.nome}
                        </h3>
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <StatusBadge status={cliente.status || "lead"} />
                          {cliente.temperatura && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-4 border",
                                temperaturaStyle[cliente.temperatura] || "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {cliente.temperatura}
                            </Badge>
                          )}
                          <ContratoStatusBadge
                            situacao={situacao}
                            data-testid={`badge-contrato-${cliente.id}`}
                          />
                        </div>
                      </div>

                      {/* Contact info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0 text-xs text-muted-foreground">
                        {cliente.telefone && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Phone className="h-3 w-3" />
                            {cliente.telefone}
                          </span>
                        )}
                        {cliente.email && (
                          <span className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{cliente.email}</span>
                          </span>
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="hidden lg:flex items-center gap-6 text-xs shrink-0">
                        {cliente.empresa && (
                          <div>
                            <p className="text-muted-foreground mb-0.5">Empresa</p>
                            <p className="font-medium text-foreground truncate max-w-[100px]">{cliente.empresa}</p>
                          </div>
                        )}
                        {cliente.cidade && (
                          <div>
                            <p className="text-muted-foreground mb-0.5">Cidade</p>
                            <p className="font-medium text-foreground">{cliente.cidade}/{cliente.estado}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            data-testid={`button-menu-${cliente.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            data-testid={`button-ver-${cliente.id}`}
                            onClick={() => setViewModal({ open: true, cliente })}
                          >
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid={`button-editar-${cliente.id}`}
                            onClick={() => setFormModal({ open: true, mode: "edit", cliente })}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid={`button-excluir-${cliente.id}`}
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteModal({ open: true, cliente })}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CRMFormModal
        open={formModal.open}
        onOpenChange={(open) => setFormModal({ ...formModal, open })}
        cliente={formModal.cliente as any}
        mode={formModal.mode}
      />
      <CRMViewModal
        open={viewModal.open}
        onOpenChange={(open) => setViewModal({ ...viewModal, open })}
        cliente={viewModal.cliente as any}
      />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
      />
    </MainLayout>
  );
}
