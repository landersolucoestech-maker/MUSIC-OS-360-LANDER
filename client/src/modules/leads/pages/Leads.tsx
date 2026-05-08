import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  UserPlus, Search, Loader2, Upload, Download, Plus, MoreHorizontal,
  Eye, Pencil, Trash2, LayoutList, Columns3,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { LeadFormModal } from "../components/LeadFormModal";
import { LeadViewModal } from "../components/LeadViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { LeadsKanban } from "../components/LeadsKanban";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { EmptyState } from "@/shared/components/EmptyState";
import { cn } from "@/shared/lib/utils";
import {
  useLeads,
  STATUS_LEAD_OPTIONS,
  ORIGEM_LEAD_OPTIONS,
  PRIORIDADE_OPTIONS,
  STATUS_LABELS,
  ORIGEM_LABELS,
} from "../hooks/useLeads";

type View = "table" | "kanban";

const leadColumns: CSVColumn[] = [
  { key: "nome_contratante", label: "Nome" },
  { key: "sobrenome", label: "Sobrenome" },
  { key: "nome_empresa", label: "Empresa" },
  { key: "cargo", label: "Cargo/Função" },
  { key: "email", label: "Email" },
  { key: "telefone", label: "Telefone" },
  { key: "instagram", label: "Instagram" },
  { key: "website", label: "Website" },
  { key: "tipo_lead", label: "Tipo de Lead" },
  { key: "status_lead", label: "Status" },
  { key: "prioridade", label: "Prioridade" },
  { key: "probabilidade_fechamento", label: "Probabilidade (%)" },
  { key: "origem_lead", label: "Origem" },
  { key: "campanha_marketing", label: "Campanha" },
  { key: "responsavel", label: "Responsável" },
  { key: "artista_interesse", label: "Artista" },
  { key: "genero_musical", label: "Gênero Musical" },
  { key: "tipo_evento", label: "Tipo Evento" },
  { key: "data_evento", label: "Data Evento" },
  { key: "cidade_evento", label: "Cidade Evento" },
  { key: "estado_evento", label: "Estado Evento" },
  { key: "nome_local_evento", label: "Local Evento" },
  { key: "capacidade_publico", label: "Capacidade Público" },
  { key: "orcamento_estimado", label: "Orçamento (R$)" },
  { key: "valor_estimado_cache", label: "Cachê (R$)" },
  { key: "data_proximo_contato", label: "Próximo Contato" },
  { key: "tags", label: "Tags", transform: (r) => Array.isArray(r.tags) ? r.tags.join(", ") : (r.tags || "") },
  { key: "descricao_demanda", label: "Descrição da Demanda" },
  { key: "observacoes", label: "Observações" },
];

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-blue-500",
  qualificado: "bg-cyan-500",
  contato_realizado: "bg-sky-500",
  proposta_enviada: "bg-warning text-warning-foreground",
  negociacao: "bg-purple-500",
  followup: "bg-orange-500",
  confirmado: "bg-emerald-500",
  fechado: "bg-success",
  perdido: "bg-destructive",
  arquivado: "bg-slate-500",
};

const PRIORIDADE_BADGE: Record<string, string> = {
  alta: "bg-destructive/10 text-destructive",
  media: "bg-warning/10 text-warning",
  baixa: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function Leads() {
  const { leads, isLoading, error, deleteLead, addLead, updateLead, refetch } = useLeads();
  const [view, setView] = useState<View>("table");
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; lead?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; lead?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; lead?: any }>({ open: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [origemFilter, setOrigemFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleExport = () => exportToCSV(leads, leadColumns, "leads");
  const handleImport = () => importCSV(async (data) => {
    let importados = 0;
    let ignorados = 0;
    for (const row of data) {
      const nome_contratante = row["Nome"] || row["nome_contratante"] || row["nome"];
      const emailVal = row["Email"] || row["email"];
      if (!nome_contratante || !emailVal) { ignorados++; continue; }
      try {
        const tagsRaw = row["Tags"] || row["tags"] || null;
        await addLead.mutateAsync({
          nome_contratante,
          sobrenome: row["Sobrenome"] || row["sobrenome"] || null,
          nome_empresa: row["Empresa"] || row["nome_empresa"] || null,
          cargo: row["Cargo/Função"] || row["cargo"] || null,
          email: emailVal,
          telefone: row["Telefone"] || row["telefone"] || null,
          status_lead: row["Status"] || row["status_lead"] || "novo",
          prioridade: row["Prioridade"] || row["prioridade"] || "media",
          origem_lead: row["Origem"] || row["origem_lead"] || "outro",
          tags: tagsRaw ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
        } as any);
        importados++;
      } catch { ignorados++; }
    }
    if (importados > 0) toast.success(`${importados} lead(s) importado(s)${ignorados > 0 ? `, ${ignorados} ignorado(s)` : ""}`);
    else toast.error("Nenhum lead válido. Campos obrigatórios: Nome, Email.");
  }, ["Nome", "Email"]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = searchTerm === "" ||
        lead.nome_contratante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.artista_interesse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.cidade_evento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.nome_empresa as string)?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrigem = origemFilter === "all" || lead.origem_lead === origemFilter;
      const matchesPrioridade = prioridadeFilter === "all" || lead.prioridade === prioridadeFilter;
      const matchesStatus = statusFilter === "all" || lead.status_lead === statusFilter;
      return matchesSearch && matchesOrigem && matchesPrioridade && matchesStatus;
    });
  }, [leads, searchTerm, origemFilter, prioridadeFilter, statusFilter]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_LEAD_OPTIONS.forEach(s => { counts[s.value] = 0; });
    leads.forEach(l => { counts[l.status_lead ?? "novo"] = (counts[l.status_lead ?? "novo"] || 0) + 1; });
    return counts;
  }, [leads]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length && filteredLeads.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredLeads.map((l: any) => l.id));
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteLead.mutate(id));
    toast.success(`${selectedIds.length} lead(s) excluído(s)`);
    setSelectedIds([]);
  };

  const handleDelete = () => {
    if (deleteModal.lead) { deleteLead.mutate(deleteModal.lead.id); setDeleteModal({ open: false }); }
  };

  const handleMoveStage = async (lead: any, newStatus: string) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, data: { status_lead: newStatus } as any });
      toast.success(`Lead movido para "${STATUS_LABELS[newStatus] ?? newStatus}"`);
    } catch { toast.error("Erro ao mover lead"); }
  };

  if (isLoading) {
    return (
      <MainLayout title="Leads" description="Captação e gestão de leads">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Leads" description="Captação e gestão de leads">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <h2 className="text-xl font-semibold text-destructive">Erro ao carregar leads</h2>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <Loader2 className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Leads"
      description="Captação e gestão de leads comerciais"
      actions={
        <>
          {/* View toggle */}
          <div className="flex rounded-md overflow-hidden border border-border">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-3 rounded-none text-xs gap-1.5", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              onClick={() => setView("table")}
              data-testid="btn-view-table"
            >
              <LayoutList className="h-3.5 w-3.5" /> Lista
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-3 rounded-none text-xs gap-1.5", view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              onClick={() => setView("kanban")}
              data-testid="btn-view-kanban"
            >
              <Columns3 className="h-3.5 w-3.5" /> Kanban
            </Button>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFormModal({ open: true, mode: "create" })} data-testid="button-new-lead">
            <Plus className="h-3.5 w-3.5" /> Novo Lead
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* ── Pipeline KPIs ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_LEAD_OPTIONS.map((status) => (
            <Card
              key={status.value}
              className={cn(
                "cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all flex-1 min-w-0",
                statusFilter === status.value && "ring-2 ring-primary"
              )}
              onClick={() => setStatusFilter(prev => prev === status.value ? "all" : status.value)}
              data-testid={`kpi-${status.value}`}
            >
              <CardContent className="p-2 text-center">
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${STATUS_COLORS[status.value]}`} />
                <p className="text-xl font-bold">{pipelineCounts[status.value]}</p>
                <p className="text-[9px] text-muted-foreground leading-tight truncate">{status.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, artista, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm bg-card border-border"
              data-testid="input-search-leads"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {STATUS_LEAD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border" data-testid="select-filter-origem">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Origens</SelectItem>
              {ORIGEM_LEAD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm bg-card border-border" data-testid="select-filter-prioridade">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PRIORIDADE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filteredLeads.length} de {leads.length} leads</span>
        </div>

        {/* ── KANBAN VIEW ── */}
        {view === "kanban" && (
          leads.length === 0 ? (
            <EmptyState icon={UserPlus} title="Nenhum lead encontrado" description="Comece adicionando seu primeiro lead." />
          ) : (
            <LeadsKanban
              leads={filteredLeads}
              onView={(lead) => setViewModal({ open: true, lead })}
              onEdit={(lead) => setFormModal({ open: true, mode: "edit", lead })}
              onMoveStage={handleMoveStage}
            />
          )
        )}

        {/* ── TABLE VIEW ── */}
        {view === "table" && (
          leads.length === 0 ? (
            <EmptyState icon={UserPlus} title="Nenhum lead encontrado" description="Comece adicionando seu primeiro lead ou importe de um CSV." />
          ) : (
            <>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedIds.length} lead(s) selecionado(s)</span>
                  <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir ({selectedIds.length})
                  </Button>
                </div>
              )}
              <div className="rounded-md border" data-testid="leads-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <div
                          className={cn("w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer", selectedIds.length === filteredLeads.length && filteredLeads.length > 0 ? "bg-primary" : "")}
                          onClick={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        >
                          {selectedIds.length === filteredLeads.length && filteredLeads.length > 0 && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead className="text-right">Prob.</TableHead>
                      <TableHead>Próx. Contato</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="w-[60px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          Nenhum lead com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => {
                        const overdue = lead.data_proximo_contato && new Date(lead.data_proximo_contato as string) < new Date();
                        return (
                          <TableRow
                            key={lead.id}
                            className="cursor-pointer"
                            onClick={() => setViewModal({ open: true, lead })}
                            data-testid={`row-lead-${lead.id}`}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div
                                className={cn("w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer", selectedIds.includes(lead.id) ? "bg-primary" : "")}
                                onClick={() => toggleSelect(lead.id)}
                                data-testid={`checkbox-lead-${lead.id}`}
                              >
                                {selectedIds.includes(lead.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium max-w-[180px] truncate">
                              {lead.nome_contratante || <span className="text-muted-foreground italic">(sem nome)</span>}
                            </TableCell>
                            <TableCell className="max-w-[140px] truncate text-muted-foreground">{(lead.nome_empresa as string) || "—"}</TableCell>
                            <TableCell className="max-w-[160px] truncate">{lead.artista_interesse || "—"}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs text-white ${STATUS_COLORS[lead.status_lead ?? ""] || "bg-secondary"}`}>
                                {STATUS_LABELS[lead.status_lead ?? ""] || lead.status_lead}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${PRIORIDADE_BADGE[lead.prioridade ?? ""] || ""}`}>
                                {lead.prioridade === "alta" ? "Alta" : lead.prioridade === "media" ? "Média" : "Baixa"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{lead.probabilidade_fechamento ?? 0}%</TableCell>
                            <TableCell className={cn("text-sm", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                              {lead.data_proximo_contato
                                ? new Date(lead.data_proximo_contato as string).toLocaleDateString("pt-BR")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{ORIGEM_LABELS[lead.origem_lead ?? ""] || lead.origem_lead || "—"}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${lead.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setViewModal({ open: true, lead })} data-testid={`button-view-${lead.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> Visualizar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", lead })} data-testid={`button-edit-${lead.id}`}>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteModal({ open: true, lead })} data-testid={`button-delete-${lead.id}`}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )
        )}
      </div>

      <LeadFormModal
        open={formModal.open}
        onOpenChange={(open) => setFormModal({ ...formModal, open })}
        mode={formModal.mode}
        lead={formModal.lead}
      />
      <LeadViewModal
        open={viewModal.open}
        onOpenChange={(open) => setViewModal({ ...viewModal, open })}
        lead={viewModal.lead}
        onEdit={(lead) => setFormModal({ open: true, mode: "edit", lead })}
      />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        onConfirm={handleDelete}
        title="Excluir Lead"
        description={`Tem certeza que deseja excluir "${deleteModal.lead?.nome_contratante}"?`}
      />
    </MainLayout>
  );
}
