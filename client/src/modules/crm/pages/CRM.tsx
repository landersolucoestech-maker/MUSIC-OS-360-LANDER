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
  Mic2, Video, Globe, BarChart3, MoreHorizontal, UserPlus,
  ArrowRight,
} from "lucide-react";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useLeads } from "@/modules/crm/hooks/useLeads";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { ContratoStatusBadge, getContratoSituacao } from "@/shared/components/ContratoStatusBadge";
import { EmptyState } from "@/shared/components/EmptyState";
import { CRMFormModal } from "@/modules/crm/components/CRMFormModal";
import { CRMViewModal } from "@/modules/crm/components/CRMViewModal";
import { LeadFormModal } from "@/modules/crm/components/LeadFormModal";
import { LeadViewModal } from "@/modules/crm/components/LeadViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

const getXLSX = () => import("xlsx");

type Cliente = Record<string, any>;
type ActiveView = "contatos" | "leads";

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

const STATUS_LEAD_COLOR: Record<string, string> = {
  novo:               "bg-blue-500/10 text-blue-500 border-blue-500/20",
  qualificado:        "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  contato_realizado:  "bg-sky-500/10 text-sky-500 border-sky-500/20",
  proposta_enviada:   "bg-warning/10 text-warning border-warning/20",
  negociacao:         "bg-purple-500/10 text-purple-500 border-purple-500/20",
  followup:           "bg-orange-500/10 text-orange-500 border-orange-500/20",
  confirmado:         "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  fechado:            "bg-success/10 text-success border-success/20",
  perdido:            "bg-destructive/10 text-destructive border-destructive/20",
  arquivado:          "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const STATUS_LEAD_LABEL: Record<string, string> = {
  novo:               "Novo",
  qualificado:        "Qualificado",
  contato_realizado:  "Contato Realizado",
  proposta_enviada:   "Proposta Enviada",
  negociacao:         "Negociação",
  followup:           "Follow-up",
  confirmado:         "Confirmado",
  fechado:            "Fechado",
  perdido:            "Perdido",
  arquivado:          "Arquivado",
};

export default function CRM() {
  const { clientes: rawClientes, isLoading: clientesLoading, deleteCliente, addCliente, updateCliente } = useClientes();
  const { leads, isLoading: leadsLoading, deleteLead } = useLeads();
  const { contratos } = useContratos();
  const clientes = rawClientes as Cliente[];
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [activeView, setActiveView] = useState<ActiveView>("contatos");

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
    totalLeads:   leads.length,
  }), [clientes, contratos, leads, contratosPorCliente]);

  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; cliente?: Cliente }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; cliente?: Cliente }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; cliente?: Cliente }>({ open: false });
  const [leadFormModal, setLeadFormModal] = useState<{ open: boolean; mode: "create" | "edit"; lead?: any }>({ open: false, mode: "create" });
  const [leadViewModal, setLeadViewModal] = useState<{ open: boolean; lead?: any }>({ open: false });
  const [deleteLeadModal, setDeleteLeadModal] = useState<{ open: boolean; lead?: any }>({ open: false });

  useEditQueryParam(
    "edit",
    clientes,
    useCallback((cliente: Cliente) => setFormModal({ open: true, mode: "edit", cliente }), []),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");

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
      return matchesSearch && matchesStatus;
    });
  }, [clientes, searchTerm, statusFilter]);

  const filteredLeads = useMemo(() => {
    return (leads as any[]).filter((lead) => {
      const q = leadSearch.toLowerCase();
      const matchesSearch =
        q === "" ||
        lead.nome_contratante?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.telefone?.toLowerCase().includes(q) ||
        lead.nome_empresa?.toLowerCase().includes(q) ||
        lead.artista_interesse?.toLowerCase().includes(q) ||
        lead.cidade_evento?.toLowerCase().includes(q);
      const matchesStatus = leadStatusFilter === "all" || lead.status_lead === leadStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, leadSearch, leadStatusFilter]);

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all";
  const hasLeadFilters = leadSearch !== "" || leadStatusFilter !== "all";

  const handleDelete = () => {
    if (deleteModal.cliente) {
      deleteCliente.mutate(deleteModal.cliente.id);
      setDeleteModal({ open: false });
    }
  };

  const handleDeleteLead = () => {
    if (deleteLeadModal.lead) {
      deleteLead.mutate(deleteLeadModal.lead.id);
      setDeleteLeadModal({ open: false });
    }
  };

  const handleSetSegmento = (id: string, segmento: string) => {
    updateCliente.mutate({ id, segmento } as any, {
      onSuccess: () => toast.success(`Segmento atualizado para "${SEGMENTO_LABEL[segmento] ?? segmento}"`),
    });
  };

  const clearFilters = () => { setSearchTerm(""); setStatusFilter("all"); };
  const clearLeadFilters = () => { setLeadSearch(""); setLeadStatusFilter("all"); };

  const getInitials = (nome: string) =>
    nome?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() ?? "?";

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

  return (
    <MainLayout
      title="CRM"
      description="Central de relacionamento operacional"
      actions={
        <>
          <input type="file" ref={csvInputRef} accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          {activeView === "contatos" ? (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFormModal({ open: true, mode: "create" })} data-testid="button-novo-contato">
              <Plus className="h-3.5 w-3.5" /> Novo Contato
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setLeadFormModal({ open: true, mode: "create" })} data-testid="button-novo-lead">
              <Plus className="h-3.5 w-3.5" /> Novo Lead
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Contatos",  value: kpis.total,        icon: Users,     accent: "text-foreground" },
            { label: "Ativos",          value: kpis.ativos,       icon: UserCheck, accent: "text-emerald-500" },
            { label: "Com Contrato",    value: kpis.comContrato,  icon: FileText,  accent: "text-primary" },
            { label: "Contratantes",    value: kpis.contratantes, icon: Building2, accent: "text-blue-500" },
            { label: "Parceiros",       value: kpis.parceiros,    icon: Handshake, accent: "text-emerald-500" },
            { label: "Pipeline Leads",  value: kpis.totalLeads,   icon: UserPlus,  accent: "text-orange-500" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-card border border-border/60 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground leading-tight">{label}</span>
                <Icon className={cn("h-3.5 w-3.5 shrink-0", accent)} />
              </div>
              <span className={cn("text-2xl font-bold tracking-tight", accent)}>{clientesLoading || leadsLoading ? "—" : value}</span>
            </div>
          ))}
        </div>

        {/* ── View Toggle ── */}
        <div className="flex items-center gap-1 border-b border-border pb-0">
          <button
            onClick={() => setActiveView("contatos")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeView === "contatos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-contatos"
          >
            <Users className="h-3.5 w-3.5" />
            Contatos
            <span className={cn(
              "text-[10px] font-mono px-1.5 rounded-full",
              activeView === "contatos" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {clientes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveView("leads")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeView === "leads"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-leads"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Pipeline de Leads
            <span className={cn(
              "text-[10px] font-mono px-1.5 rounded-full",
              activeView === "leads" ? "bg-orange-500/15 text-orange-500" : "bg-muted text-muted-foreground"
            )}>
              {leads.length}
            </span>
          </button>
        </div>

        {/* ── CONTATOS VIEW ── */}
        {activeView === "contatos" && (
          <>
            {/* Filter Bar */}
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

            {/* Cards */}
            {clientesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
                ))}
              </div>
            ) : filteredClientes.length === 0 ? (
              <EmptyState
                icon={Users}
                title={hasActiveFilters ? "Nenhum resultado" : "Nenhum contato cadastrado"}
                description={hasActiveFilters ? "Ajuste os filtros ou limpe a busca." : "Adicione o primeiro contato."}
                actionLabel={hasActiveFilters ? undefined : "Novo Contato"}
                onAction={hasActiveFilters ? undefined : () => setFormModal({ open: true, mode: "create" })}
              />
            ) : (
              <div className="space-y-3">
                {filteredClientes.map((cliente) => {
                  const clienteContratos = contratosPorCliente.get(cliente.id) ?? [];
                  const situacao = getContratoSituacao(clienteContratos);
                  return (
                    <div
                      key={cliente.id}
                      data-testid={`row-contato-${cliente.id}`}
                      className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center gap-6 min-w-0">

                        {/* BLOCO 1 — avatar + nome + categoria + cidade */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                            <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl">
                              {getInitials(cliente.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h3
                              className="font-semibold text-sm leading-snug cursor-pointer hover:text-primary transition-colors truncate"
                              data-testid={`text-nome-${cliente.id}`}
                              onClick={() => setViewModal({ open: true, cliente })}
                            >
                              {cliente.nome}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {(cliente.categoria || cliente.segmento) && (
                                <Badge variant="outline" className={cn(
                                  "text-[10px] px-1.5 py-0 h-4 border font-medium",
                                  cliente.categoria
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : SEGMENTO_COLOR[cliente.segmento] || "bg-muted text-muted-foreground border-border"
                                )}>
                                  {cliente.categoria || SEGMENTO_LABEL[cliente.segmento] || cliente.segmento}
                                </Badge>
                              )}
                              {cliente.cidade && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  {cliente.cidade}{cliente.estado ? `/${cliente.estado}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* BLOCO 2 — telefone + email */}
                        <div className="hidden md:flex flex-col gap-0.5 shrink-0">
                          {cliente.telefone ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />{cliente.telefone}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                          {cliente.email && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 max-w-[200px] truncate">
                              <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{cliente.email}</span>
                            </span>
                          )}
                        </div>

                        {/* BLOCO 3 — responsável + cargo */}
                        <div className="hidden lg:flex flex-col gap-0.5 shrink-0 min-w-[120px]">
                          {cliente.responsavel ? (
                            <>
                              <span className="text-xs font-medium text-foreground truncate">{cliente.responsavel}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {cliente.responsavel_email || "Responsável"}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>

                        {/* BLOCO 4 — status + ações */}
                        <div className="flex items-center gap-2 shrink-0">
                          <ContratoStatusBadge situacao={situacao} data-testid={`badge-contrato-${cliente.id}`} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-menu-${cliente.id}`}>
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
          </>
        )}

        {/* ── LEADS VIEW ── */}
        {activeView === "leads" && (
          <>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nome, email, empresa, artista, cidade…"
                  className="pl-9 h-8 text-sm bg-card border-border"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  data-testid="input-search-leads"
                />
              </div>
              <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                <SelectTrigger className="w-[180px] h-8 text-sm bg-card border-border" data-testid="select-lead-status">
                  <SelectValue placeholder="Etapa do Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Etapas</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="contato_realizado">Contato Realizado</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
              {hasLeadFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={clearLeadFilters}>
                  <X className="h-3 w-3" /> Limpar
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredLeads.length} de {leads.length} leads
              </span>
            </div>

            {/* Lead Cards */}
            {leadsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title={hasLeadFilters ? "Nenhum lead encontrado" : "Nenhum lead no pipeline"}
                description={hasLeadFilters ? "Ajuste os filtros ou limpe a busca." : "Adicione o primeiro lead."}
                actionLabel={hasLeadFilters ? undefined : "Novo Lead"}
                onAction={hasLeadFilters ? undefined : () => setLeadFormModal({ open: true, mode: "create" })}
              />
            ) : (
              <div className="space-y-3">
                {filteredLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    data-testid={`row-lead-${lead.id}`}
                    className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-orange-500/30 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-6 min-w-0">

                      {/* BLOCO 1 — avatar + nome + pipeline + cidade */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                          <AvatarFallback className="bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold rounded-xl">
                            {getInitials(lead.nome_contratante || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3
                            className="font-semibold text-sm leading-snug cursor-pointer hover:text-orange-500 transition-colors truncate"
                            data-testid={`text-lead-nome-${lead.id}`}
                            onClick={() => setLeadViewModal({ open: true, lead })}
                          >
                            {lead.nome_contratante}{lead.sobrenome ? ` ${lead.sobrenome}` : ""}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {lead.status_lead && (
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-1.5 py-0 h-4 border font-medium",
                                STATUS_LEAD_COLOR[lead.status_lead] || "bg-muted text-muted-foreground border-border"
                              )}>
                                {STATUS_LEAD_LABEL[lead.status_lead] || lead.status_lead}
                              </Badge>
                            )}
                            {lead.cidade_evento && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {lead.cidade_evento}{lead.estado_evento ? `/${lead.estado_evento}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BLOCO 2 — telefone + email */}
                      <div className="hidden md:flex flex-col gap-0.5 shrink-0">
                        {lead.telefone ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />{lead.telefone}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                        {lead.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 max-w-[200px] truncate">
                            <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{lead.email}</span>
                          </span>
                        )}
                      </div>

                      {/* BLOCO 3 — empresa + tipo evento */}
                      <div className="hidden lg:flex flex-col gap-0.5 shrink-0 min-w-[120px]">
                        {lead.nome_empresa ? (
                          <>
                            <span className="text-xs font-medium text-foreground truncate">{lead.nome_empresa}</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {lead.tipo_evento || lead.cargo || "Empresa"}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* BLOCO 4 — prioridade + ações */}
                      <div className="flex items-center gap-2 shrink-0">
                        {lead.prioridade && (
                          <Badge variant="outline" className={cn(
                            "text-[10px] px-1.5 h-5 border font-medium hidden sm:flex",
                            lead.prioridade === "alta" ? "bg-destructive/10 text-destructive border-destructive/20" :
                            lead.prioridade === "media" ? "bg-warning/10 text-warning border-warning/20" :
                            "bg-muted text-muted-foreground border-border"
                          )}>
                            {lead.prioridade === "alta" ? "Alta" : lead.prioridade === "media" ? "Média" : "Baixa"}
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-menu-lead-${lead.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLeadViewModal({ open: true, lead })}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLeadFormModal({ open: true, mode: "edit", lead })}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteLeadModal({ open: true, lead })}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* Contatos Modals */}
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

      {/* Leads Modals */}
      <LeadFormModal
        open={leadFormModal.open}
        onOpenChange={(open) => setLeadFormModal({ ...leadFormModal, open })}
        lead={leadFormModal.lead}
        mode={leadFormModal.mode}
      />
      <LeadViewModal
        open={leadViewModal.open}
        onOpenChange={(open) => setLeadViewModal({ ...leadViewModal, open })}
        lead={leadViewModal.lead}
      />
      <DeleteConfirmModal
        open={deleteLeadModal.open}
        onOpenChange={(open) => setDeleteLeadModal({ ...deleteLeadModal, open })}
        title="Excluir Lead"
        description="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteLead}
      />
    </MainLayout>
  );
}
