import { useCallback, useState, useMemo, useRef } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import {
  Users, Plus, Phone, Mail, Search, Eye,
  Pencil, Trash2, UserCheck, FileText,
  X, Building2, Handshake, Package, MapPin,
  Star, Radio, Newspaper, TrendingUp, Scale, Music2,
  Mic2, Video, Globe, BarChart3, MoreHorizontal, Clock, Disc3,
} from "lucide-react";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { ContratoStatusBadge, getContratoSituacao } from "@/shared/components/ContratoStatusBadge";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { EmptyState } from "@/shared/components/EmptyState";
import { CRMFormModal } from "@/modules/crm/components/CRMFormModal";
import { CRMViewModal } from "@/modules/crm/components/CRMViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
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

const SEGMENTO_LABEL: Record<string, string> = {
  contratante: "Contratante",
  parceiro:    "Parceiro",
  fornecedor:  "Fornecedor",
  contato:     "Contato",
};

const TIPO_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  distribuidora: { color: "bg-violet-500/10 text-violet-500 border-violet-500/20", icon: Globe },
  editora:       { color: "bg-blue-500/10 text-blue-500 border-blue-500/20",       icon: FileText },
  artista:       { color: "bg-primary/10 text-primary border-primary/20",           icon: Music2 },
  produtor:      { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: Mic2 },
  radio:         { color: "bg-orange-500/10 text-orange-500 border-orange-500/20",  icon: Radio },
  imprensa:      { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",  icon: Newspaper },
  marca:         { color: "bg-pink-500/10 text-pink-500 border-pink-500/20",        icon: Star },
  juridico:      { color: "bg-slate-500/10 text-slate-500 border-slate-500/20",     icon: Scale },
  investidor:    { color: "bg-teal-500/10 text-teal-500 border-teal-500/20",        icon: TrendingUp },
  streaming:     { color: "bg-green-500/10 text-green-500 border-green-500/20",     icon: BarChart3 },
  influencer:    { color: "bg-rose-500/10 text-rose-500 border-rose-500/20",        icon: Users },
  sync:          { color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",  icon: Video },
  agregadora:    { color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",        icon: Package },
};

const SEGMENTO_COLOR: Record<string, string> = {
  contratante: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  parceiro:    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  fornecedor:  "bg-warning/10 text-warning border-warning/20",
  contato:     "bg-muted text-muted-foreground border-border",
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
    total:        clientes.length,
    ativos:       clientes.filter((c) => c.status === "ativo").length,
    comContrato:  clientes.filter((c) => contratosPorCliente.has(c.id)).length,
    contratantes: clientes.filter((c) => c.segmento === "contratante").length,
    parceiros:    clientes.filter((c) => c.segmento === "parceiro").length,
    fornecedores: clientes.filter((c) => c.segmento === "fornecedor").length,
  }), [clientes, contratosPorCliente]);

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
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        q === "" ||
        cliente.nome?.toLowerCase().includes(q) ||
        cliente.email?.toLowerCase().includes(q) ||
        cliente.telefone?.toLowerCase().includes(q) ||
        cliente.empresa?.toLowerCase().includes(q) ||
        cliente.responsavel?.toLowerCase().includes(q) ||
        cliente.cidade?.toLowerCase().includes(q) ||
        cliente.tipo?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || cliente.status === statusFilter;
      const matchesSegmento =
        activeTab === "todos" ||
        cliente.segmento === activeTab ||
        (activeTab === "contato" && !cliente.segmento);
      return matchesSearch && matchesStatus && matchesSegmento;
    });
  }, [clientes, searchTerm, statusFilter, activeTab]);

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all";

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
    nome?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() ?? "?";

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
      description="Central de relacionamento operacional"
      actions={
        <>
          <input type="file" ref={csvInputRef} accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExcelExport}>
            Exportar
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFormModal({ open: true, mode: "create" })} data-testid="button-novo-contato">
            <Plus className="h-3.5 w-3.5" /> Novo Contato
          </Button>
        </>
      }
    >
      <div className="space-y-6">

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total de Contatos", value: kpis.total,        icon: Users,     accent: "text-foreground" },
            { label: "Ativos",            value: kpis.ativos,       icon: UserCheck, accent: "text-emerald-500" },
            { label: "Com Contrato",      value: kpis.comContrato,  icon: FileText,  accent: "text-primary" },
            { label: "Contratantes",      value: kpis.contratantes, icon: Building2, accent: "text-blue-500" },
            { label: "Parceiros",         value: kpis.parceiros,    icon: Handshake, accent: "text-emerald-500" },
            { label: "Fornecedores",      value: kpis.fornecedores, icon: Package,   accent: "text-warning" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-card border border-border/60 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground leading-tight">{label}</span>
                <Icon className={cn("h-3.5 w-3.5 shrink-0", accent)} />
              </div>
              <span className={cn("text-2xl font-bold tracking-tight", accent)}>{clientesLoading ? "—" : value}</span>
            </div>
          ))}
        </div>

        {/* ── Segmento Tabs ── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-px border-b border-border" data-testid="crm-tabs">
          {SEGMENTO_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
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
              placeholder="Nome, email, telefone, empresa, cidade…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-crm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm bg-card border-border" data-testid="select-status">
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

        {/* ── Smart Relationship Cards ── */}
        {clientesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
            ))}
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
          <div className="space-y-3">
            {filteredClientes.map((cliente) => {
              const clienteContratos = contratosPorCliente.get(cliente.id) ?? [];
              const situacao = getContratoSituacao(clienteContratos);
              const tipoKey = cliente.tipo?.toLowerCase();
              const tipoConfig = tipoKey ? TIPO_CONFIG[tipoKey] : undefined;
              const TipoIcon = tipoConfig?.icon;

              return (
                <div
                  key={cliente.id}
                  data-testid={`row-contato-${cliente.id}`}
                  className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-0 min-w-0">

                    {/* 1. [Avatar] Nome */}
                    <div className="flex items-center gap-3 min-w-0 w-52 shrink-0 pr-4">
                      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                        <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-lg">
                          {getInitials(cliente.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <h3
                        className="font-semibold text-sm leading-tight cursor-pointer hover:text-primary transition-colors truncate"
                        data-testid={`text-nome-${cliente.id}`}
                        onClick={() => setViewModal({ open: true, cliente })}
                      >
                        {cliente.nome}
                      </h3>
                    </div>

                    {/* 2. badge(categoria) */}
                    <div className="hidden sm:flex items-center shrink-0 border-l border-border/60 px-4 w-36">
                      {(cliente.categoria || cliente.segmento) ? (
                        <Badge variant="outline" className={cn(
                          "text-[10px] px-2 py-0 h-5 border font-medium",
                          cliente.categoria
                            ? "bg-primary/10 text-primary border-primary/20"
                            : SEGMENTO_COLOR[cliente.segmento] || "bg-muted text-muted-foreground border-border"
                        )}>
                          {cliente.categoria || SEGMENTO_LABEL[cliente.segmento] || cliente.segmento}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* 3. cidade/estado */}
                    <div className="hidden md:flex items-center shrink-0 border-l border-border/60 px-4 w-36">
                      {cliente.cidade ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{cliente.cidade}{cliente.estado ? `/${cliente.estado}` : ""}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* 4. contatos (telefone + email) */}
                    <div className="flex-1 hidden lg:flex flex-col gap-0.5 border-l border-border/60 px-4 min-w-0">
                      {cliente.telefone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3 shrink-0" />{cliente.telefone}
                        </span>
                      )}
                      {cliente.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{cliente.email}</span>
                        </span>
                      )}
                      {!cliente.telefone && !cliente.email && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* 5. responsável */}
                    <div className="hidden xl:flex flex-col gap-0.5 shrink-0 border-l border-border/60 px-4 w-44">
                      {cliente.responsavel ? (
                        <p className="text-xs font-medium text-foreground truncate">{cliente.responsavel}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">—</p>
                      )}
                      {cliente.responsavel && <ContratoStatusBadge situacao={situacao} data-testid={`badge-contrato-${cliente.id}`} />}
                    </div>

                    {/* 6. ações */}
                    <div className="pl-2 shrink-0 ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-menu-${cliente.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-testid={`button-ver-${cliente.id}`} onClick={() => setViewModal({ open: true, cliente })}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Abrir
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
                </div>
              );
            })}
          </div>
        )}
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
