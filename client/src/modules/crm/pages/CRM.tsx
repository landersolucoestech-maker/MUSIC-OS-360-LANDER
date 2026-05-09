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
  Users, Download, Plus, Phone, Mail, Search, Eye,
  Pencil, Trash2, MoreHorizontal, UserCheck, UserPlus, FileText,
  X, Building2, Handshake, Package, Upload,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
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

type SegmentoTab = "todos" | "contratante" | "parceiro" | "fornecedor" | "contato";

const SEGMENTO_TABS: { value: SegmentoTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "todos",       label: "Todos",        icon: Users },
  { value: "contratante", label: "Contratantes", icon: Building2 },
  { value: "parceiro",    label: "Parceiros",    icon: Handshake },
  { value: "fornecedor",  label: "Fornecedores", icon: Package },
  { value: "contato",     label: "Contatos",     icon: UserCheck },
];

const SEGMENTO_BADGE: Record<string, string> = {
  contratante: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  parceiro:    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  fornecedor:  "bg-warning/10 text-warning border-warning/20",
  contato:     "bg-muted text-muted-foreground border-border",
};

const SEGMENTO_LABEL: Record<string, string> = {
  contratante: "Contratante",
  parceiro:    "Parceiro",
  fornecedor:  "Fornecedor",
  contato:     "Contato",
};

const temperaturaStyle: Record<string, string> = {
  quente: "bg-destructive/10 text-destructive border-destructive/20",
  morno:  "bg-warning/10 text-warning border-warning/20",
  frio:   "bg-primary/10 text-primary border-primary/20",
};

export default function CRM() {
  const { clientes: rawClientes, isLoading: clientesLoading, deleteCliente, addCliente, updateCliente } = useClientes();
  const { contratos } = useContratos();
  const clientes = rawClientes as Cliente[];
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SegmentoTab>("todos");

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
    total:      clientes.length,
    ativos:     clientes.filter((c) => c.status === "ativo").length,
    comContrato: clientes.filter((c) => contratosPorCliente.has(c.id)).length,
    contratantes: clientes.filter((c) => c.segmento === "contratante").length,
    parceiros:    clientes.filter((c) => c.segmento === "parceiro").length,
    fornecedores: clientes.filter((c) => c.segmento === "fornecedor").length,
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
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredClientes = useMemo(() => {
    return clientes.filter((cliente) => {
      const matchesSearch =
        searchTerm === "" ||
        cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.empresa?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || cliente.status === statusFilter;
      const matchesSegmento =
        activeTab === "todos" ||
        cliente.segmento === activeTab ||
        (activeTab === "contato" && !cliente.segmento);
      return matchesSearch && matchesStatus && matchesSegmento;
    });
  }, [clientes, searchTerm, statusFilter, activeTab]);

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all";

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClientes.length && filteredClientes.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredClientes.map((c: any) => c.id));
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteCliente.mutate(id));
    toast.success(`${selectedIds.length} contato(s) excluído(s)`);
    setSelectedIds([]);
  };

  const handleDelete = () => {
    if (deleteModal.cliente) {
      deleteCliente.mutate(deleteModal.cliente.id);
      setDeleteModal({ open: false });
    }
  };

  const handleSetSegmento = (id: string, segmento: string) => {
    updateCliente.mutate({ id, segmento } as any, {
      onSuccess: () => toast.success(`Segmento atualizado para "${SEGMENTO_LABEL[segmento] ?? segmento}"`),
    });
  };

  const clearFilters = () => { setSearchTerm(""); setStatusFilter("all"); };

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const handleExcelExport = async () => {
    if (filteredClientes.length === 0) { toast.error("Nenhum cliente para exportar"); return; }
    const exportData = filteredClientes.map((c) => ({
      nome: c.nome, segmento: c.segmento || "", tipo: c.tipo || "", email: c.email || "",
      telefone: c.telefone || "", cnpj: c.cnpj || "", cpf: c.cpf || "",
      cidade: c.cidade || "", estado: c.estado || "", status: c.status || "",
    }));
    const XLSX = await getXLSX();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CRM");
    XLSX.writeFile(workbook, `crm_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${filteredClientes.length} contato(s) exportado(s)!`);
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
        const nome = row.nome || row.Nome || row.NOME;
        if (!nome) continue;
        await addCliente.mutateAsync({
          nome,
          segmento: row.segmento || row.Segmento || null,
          email: row.email || row.Email || null,
          telefone: row.telefone || row.Telefone || null,
          cidade: row.cidade || row.Cidade || null,
          estado: row.estado || row.Estado || null,
          status: row.status || row.Status || "lead",
          observacoes: row.observacoes || row.Observações || null,
        });
        importados++;
      }
      toast.success(`${importados} contato(s) importado(s)!`);
    } catch { toast.error("Erro ao importar Excel"); }
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const tabCount = (tab: SegmentoTab) => {
    if (tab === "todos") return clientes.length;
    if (tab === "contato") return clientes.filter(c => !c.segmento).length;
    return clientes.filter(c => c.segmento === tab).length;
  };

  return (
    <MainLayout
      title="CRM"
      description="Gestão de relacionamento comercial"
      actions={
        <>
          <input type="file" ref={csvInputRef} accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFormModal({ open: true, mode: "create" })} data-testid="button-novo-contato">
            <Plus className="h-3.5 w-3.5" /> Novo Contato
          </Button>
        </>
      }
    >
      <div className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total" value={clientesLoading ? "—" : kpis.total} icon={Users} accent="primary" />
          <MetricCard title="Contratantes" value={clientesLoading ? "—" : kpis.contratantes} icon={Building2} accent="primary" />
          <MetricCard title="Parceiros" value={clientesLoading ? "—" : kpis.parceiros} icon={Handshake} accent="success" />
          <MetricCard title="Fornecedores" value={clientesLoading ? "—" : kpis.fornecedores} icon={Package} accent="warning" />
        </div>

        {/* ── Segmento Tabs ── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border" data-testid="crm-tabs">
          {SEGMENTO_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setSelectedIds([]); }}
                data-testid={`tab-${tab.value}`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0 rounded-full min-w-[18px] text-center",
                  isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {tabCount(tab.value)}
                </span>
              </button>
            );
          })}
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredClientes.length} de {clientes.length} contatos
          </span>
        </div>

        {/* ── Contacts List ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {SEGMENTO_TABS.find(t => t.value === activeTab)?.label ?? "Lista"}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredClientes.length})</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {activeTab === "todos"       && "Todos os contatos e empresas cadastradas"}
                  {activeTab === "contratante" && "Empresas e pessoas que contratam shows e serviços"}
                  {activeTab === "parceiro"    && "Gravadoras, distribuidoras e parceiros estratégicos"}
                  {activeTab === "fornecedor"  && "Fornecedores de serviços e plataformas"}
                  {activeTab === "contato"     && "Contatos sem segmento definido"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Bulk selection */}
            {clientes.length > 0 && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <Checkbox
                  checked={selectedIds.length === filteredClientes.length && filteredClientes.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-xs text-muted-foreground flex-1">
                  {selectedIds.length > 0 ? `${selectedIds.length} selecionado(s)` : "Selecionar todos"}
                </span>
                {selectedIds.length > 0 && (
                  <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir ({selectedIds.length})
                  </Button>
                )}
              </div>
            )}

            {clientesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)}
              </div>
            ) : filteredClientes.length === 0 ? (
              <EmptyState
                icon={Users}
                title={hasActiveFilters ? "Nenhum resultado" : `Nenhum ${SEGMENTO_TABS.find(t => t.value === activeTab)?.label.toLowerCase() || "contato"} cadastrado`}
                description={hasActiveFilters ? "Ajuste os filtros ou limpe a busca." : "Adicione o primeiro contato nesta categoria."}
                actionLabel={hasActiveFilters ? undefined : "Novo Contato"}
                onAction={hasActiveFilters ? undefined : () => setFormModal({ open: true, mode: "create" })}
              />
            ) : (
              <div className="space-y-2">
                {filteredClientes.map((cliente) => {
                  const clienteContratos = contratosPorCliente.get(cliente.id) ?? [];
                  const situacao = getContratoSituacao(clienteContratos);
                  return (
                    <div
                      key={cliente.id}
                      data-testid={`row-contato-${cliente.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card hover:border-border hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setViewModal({ open: true, cliente })}
                    >
                      <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                        <Checkbox
                          checked={selectedIds.includes(cliente.id)}
                          onCheckedChange={() => toggleSelect(cliente.id)}
                          data-testid={`checkbox-contato-${cliente.id}`}
                        />
                      </div>

                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                          {getInitials(cliente.nome)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Main content */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">

                        {/* Col 1: Nome + badges */}
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Nome</p>
                          <h3 className="font-semibold text-sm leading-tight truncate" data-testid={`text-nome-${cliente.id}`}>
                            {cliente.nome}
                          </h3>
                          {cliente.empresa && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{cliente.empresa}</p>
                          )}
                          <div className="flex items-center gap-1 flex-wrap mt-1.5">
                            <StatusBadge status={cliente.status || "lead"} />
                            {cliente.segmento && (
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", SEGMENTO_BADGE[cliente.segmento] || "bg-muted text-muted-foreground border-border")}>
                                {SEGMENTO_LABEL[cliente.segmento] ?? cliente.segmento}
                              </Badge>
                            )}
                            {cliente.temperatura && (
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border capitalize", temperaturaStyle[cliente.temperatura] || "bg-muted text-muted-foreground border-border")}>
                                {cliente.temperatura}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Col 2: Contacto */}
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Contacto</p>
                          {cliente.email ? (
                            <p className="text-xs flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{cliente.email}</span>
                            </p>
                          ) : <p className="text-xs text-muted-foreground">—</p>}
                          {cliente.telefone && (
                            <p className="text-xs flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                              {cliente.telefone}
                            </p>
                          )}
                        </div>

                        {/* Col 3: Categoria + Localização */}
                        <div className="hidden sm:block min-w-0">
                          {cliente.tipo && (
                            <>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Categoria</p>
                              <p className="text-xs font-medium truncate">{cliente.tipo}</p>
                            </>
                          )}
                          {cliente.cidade && (
                            <div className={cliente.tipo ? "mt-1.5" : ""}>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Cidade</p>
                              <p className="text-xs font-medium">{cliente.cidade}{cliente.estado ? `/${cliente.estado}` : ""}</p>
                            </div>
                          )}
                          {!cliente.tipo && !cliente.cidade && <p className="text-xs text-muted-foreground">—</p>}
                        </div>

                        {/* Col 4: Contratos + Responsável */}
                        <div className="hidden lg:block min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Contratos</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{clienteContratos.length}</span>
                            <ContratoStatusBadge situacao={situacao} data-testid={`badge-contrato-${cliente.id}`} />
                          </div>
                          {cliente.responsavel && (
                            <div className="mt-1.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Responsável</p>
                              <p className="text-xs font-medium truncate">{cliente.responsavel}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" data-testid={`button-menu-${cliente.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem data-testid={`button-ver-${cliente.id}`} onClick={() => setViewModal({ open: true, cliente })}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`button-editar-${cliente.id}`} onClick={() => setFormModal({ open: true, mode: "edit", cliente })}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSetSegmento(cliente.id, "contratante")}>
                              <Building2 className="h-3.5 w-3.5 mr-2 text-blue-500" /> Marcar como Contratante
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetSegmento(cliente.id, "parceiro")}>
                              <Handshake className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Marcar como Parceiro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetSegmento(cliente.id, "fornecedor")}>
                              <Package className="h-3.5 w-3.5 mr-2 text-warning" /> Marcar como Fornecedor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" data-testid={`button-excluir-${cliente.id}`} onClick={() => setDeleteModal({ open: true, cliente })}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
        title="Excluir Contato"
        description="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
      />
    </MainLayout>
  );
}
