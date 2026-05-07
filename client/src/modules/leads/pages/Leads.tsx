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
  Eye, Pencil, Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { LeadFormModal } from "../components/LeadFormModal";
import { LeadViewModal } from "../components/LeadViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  useLeads,
  STATUS_LEAD_OPTIONS,
  ORIGEM_LEAD_OPTIONS,
  PRIORIDADE_OPTIONS,
  STATUS_LABELS,
  ORIGEM_LABELS,
} from "../hooks/useLeads";

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
  const { leads, isLoading, error, deleteLead, addLead, refetch } = useLeads();
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; lead?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; lead?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; lead?: any }>({ open: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [origemFilter, setOrigemFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all");

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
        const leadData: any = {
          nome_contratante,
          sobrenome: row["Sobrenome"] || row["sobrenome"] || null,
          nome_empresa: row["Empresa"] || row["nome_empresa"] || null,
          cargo: row["Cargo/Função"] || row["Cargo"] || row["cargo"] || null,
          email: emailVal,
          telefone: row["Telefone"] || row["telefone"] || null,
          instagram: row["Instagram"] || row["instagram"] || null,
          website: row["Website"] || row["website"] || null,
          tipo_lead: row["Tipo de Lead"] || row["tipo_lead"] || null,
          status_lead: row["Status"] || row["status_lead"] || "novo",
          prioridade: row["Prioridade"] || row["prioridade"] || "media",
          probabilidade_fechamento: row["Probabilidade (%)"] || row["probabilidade_fechamento"] ? Number(row["Probabilidade (%)"] || row["probabilidade_fechamento"]) : null,
          origem_lead: row["Origem"] || row["origem_lead"] || "outro",
          campanha_marketing: row["Campanha"] || row["campanha_marketing"] || null,
          responsavel: row["Responsável"] || row["responsavel"] || null,
          artista_interesse: row["Artista"] || row["artista_interesse"] || null,
          genero_musical: row["Gênero Musical"] || row["genero_musical"] || null,
          tipo_evento: row["Tipo Evento"] || row["tipo_evento"] || null,
          data_evento: row["Data Evento"] || row["data_evento"] || null,
          cidade_evento: row["Cidade Evento"] || row["cidade_evento"] || null,
          estado_evento: row["Estado Evento"] || row["estado_evento"] || null,
          nome_local_evento: row["Local Evento"] || row["nome_local_evento"] || null,
          capacidade_publico: row["Capacidade Público"] || row["capacidade_publico"] ? Number(row["Capacidade Público"] || row["capacidade_publico"]) : null,
          orcamento_estimado: row["Orçamento (R$)"] || row["Orçamento"] || row["orcamento_estimado"] ? Number(row["Orçamento (R$)"] || row["Orçamento"] || row["orcamento_estimado"]) : null,
          valor_estimado_cache: row["Cachê (R$)"] || row["Cachê"] || row["valor_estimado_cache"] ? Number(row["Cachê (R$)"] || row["Cachê"] || row["valor_estimado_cache"]) : null,
          tags: tagsRaw ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
          descricao_demanda: row["Descrição da Demanda"] || row["descricao_demanda"] || null,
          observacoes: row["Observações"] || row["observacoes"] || null,
        };
        await addLead.mutateAsync(leadData);
        importados++;
      } catch { ignorados++; }
    }
    if (importados > 0) toast.success(`${importados} lead(s) importado(s)${ignorados > 0 ? `, ${ignorados} ignorado(s)` : ""}`);
    else toast.error("Nenhum lead válido encontrado. Campos obrigatórios: Nome, Email.");
  }, ["Nome", "Email", "Status"]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = searchTerm === "" ||
        lead.nome_contratante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.artista_interesse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.cidade_evento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.nome_empresa?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrigem = origemFilter === "all" || lead.origem_lead === origemFilter;
      const matchesPrioridade = prioridadeFilter === "all" || lead.prioridade === prioridadeFilter;
      return matchesSearch && matchesOrigem && matchesPrioridade;
    });
  }, [leads, searchTerm, origemFilter, prioridadeFilter]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_LEAD_OPTIONS.forEach(s => { counts[s.value] = 0; });
    leads.forEach(l => { counts[l.status_lead] = (counts[l.status_lead] || 0) + 1; });
    return counts;
  }, [leads]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l: any) => l.id));
    }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteLead.mutate(id));
    toast.success(`${selectedIds.length} lead(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };

  const handleDelete = () => {
    if (deleteModal.lead) {
      deleteLead.mutate(deleteModal.lead.id);
      setDeleteModal({ open: false });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-destructive" data-testid="text-error-title">Erro ao carregar leads</h2>
            <p className="text-muted-foreground max-w-md" data-testid="text-error-message">
              Não foi possível carregar os dados de leads. Verifique se a tabela foi criada no banco de dados.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2" data-testid="button-retry">
            <Loader2 className="h-4 w-4" />Tentar novamente
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold tracking-tight text-[18px]" data-testid="text-page-title">Leads</h1>
            <p className="text-muted-foreground">Captação e gestão de leads de booking & eventos</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleImport} data-testid="button-import-leads">
              <Upload className="h-4 w-4" />Importar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} data-testid="button-export-leads">
              <Download className="h-4 w-4" />Exportar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setFormModal({ open: true, mode: "create" })} data-testid="button-new-lead">
              <Plus className="h-4 w-4" />Novo Lead
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_LEAD_OPTIONS.map((status) => (
            <Card
              key={status.value}
              className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all flex-1 min-w-0"
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, artista, cidade, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-leads"
            />
          </div>
          <div className="flex gap-2">
            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-origem">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Origens</SelectItem>
                {ORIGEM_LEAD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-prioridade">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PRIORIDADE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {leads.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Nenhum lead encontrado"
            description="Comece adicionando seu primeiro lead ou importe de um CSV."
          />
        ) : (
          <>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">{selectedIds.length} lead(s) selecionado(s)</span>
              <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                <Trash2 className="h-3.5 w-3.5" />
                Excluir ({selectedIds.length})
              </Button>
            </div>
          )}
          <div className="rounded-md border" data-testid="leads-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <div
                      className={`w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer ${selectedIds.length === filteredLeads.length && filteredLeads.length > 0 ? 'bg-primary' : ''}`}
                      onClick={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    >
                      {selectedIds.length === filteredLeads.length && filteredLeads.length > 0 && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Artista de interesse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="text-right">Probabilidade</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-[60px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum lead encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => setViewModal({ open: true, lead })}
                      data-testid={`row-lead-${lead.id}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div
                          className={`w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-primary' : ''}`}
                          onClick={() => toggleSelect(lead.id)}
                          data-testid={`checkbox-lead-${lead.id}`}
                        >
                          {selectedIds.includes(lead.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {lead.nome_contratante || <span className="text-muted-foreground italic">(sem nome)</span>}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{lead.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.telefone || "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{lead.artista_interesse || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs text-white ${STATUS_COLORS[lead.status_lead] || "bg-secondary"}`}>
                          {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${PRIORIDADE_BADGE[lead.prioridade] || ""}`}>
                          {lead.prioridade === "alta" ? "Alta" : lead.prioridade === "media" ? "Média" : "Baixa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{lead.probabilidade_fechamento ?? 0}%</TableCell>
                      <TableCell className="text-muted-foreground">{ORIGEM_LABELS[lead.origem_lead] || lead.origem_lead || "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${lead.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewModal({ open: true, lead })} data-testid={`button-view-${lead.id}`}>
                              <Eye className="mr-2 h-4 w-4" />Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", lead })} data-testid={`button-edit-${lead.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteModal({ open: true, lead })} data-testid={`button-delete-${lead.id}`}>
                              <Trash2 className="mr-2 h-4 w-4" />Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </>
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
        description={`Tem certeza que deseja excluir o lead "${deleteModal.lead?.nome_contratante}"? Esta ação não pode ser desfeita.`}
      />

    </MainLayout>
  );
}
