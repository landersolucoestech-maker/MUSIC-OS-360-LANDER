import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  FileText, Clock, CheckCircle, FileEdit, Search, Loader2,
  MoreHorizontal, Pencil, Trash2, Plus, X, List,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { BriefingFormModal } from "@/modules/marketing/components/BriefingFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { MetricCard } from "@/shared/components/MetricCard";
import { useBriefings } from "@/modules/marketing/hooks/useBriefings";
import { cn } from "@/shared/lib/utils";
import { FeatureGate } from '@/shared/components/FeatureGate';

export default function MarketingBriefing() {
  const { briefings, isLoading, deleteBriefing } = useBriefings();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedBriefing, setSelectedBriefing] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; briefing?: any }>({ open: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all");

  const handleNovoBriefing = () => {
    setSelectedBriefing(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleEdit = (briefing: any) => {
    setSelectedBriefing(briefing);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (deleteModal.briefing) {
      deleteBriefing.mutate(deleteModal.briefing.id);
      setDeleteModal({ open: false });
    }
  };

  const filteredBriefings = briefings.filter((b: any) => {
    const matchesSearch =
      searchTerm === "" ||
      b.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesPrioridade = prioridadeFilter === "all" || b.prioridade === prioridadeFilter;
    return matchesSearch && matchesStatus && matchesPrioridade;
  });

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || prioridadeFilter !== "all";

  // Metrics
  const briefingsAtivos = briefings.filter((b: any) => b.status === "ativo").length;
  const pendentesAprovacao = briefings.filter((b: any) => b.status === "pendente").length;
  const aprovados = briefings.filter((b: any) => b.status === "aprovado").length;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <FeatureGate feature="moduleMarketing" featureName="Marketing & Campanhas">
    <MainLayout
      title="Central de Briefing"
      description="Gerencie briefings e diretrizes para campanhas de marketing"
      actions={
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleNovoBriefing}>
          <Plus className="h-3.5 w-3.5" /> Novo Briefing
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Briefings Ativos" value={briefingsAtivos} description="em desenvolvimento" icon={FileText} accent="primary" />
          <MetricCard title="Pendentes Aprovação" value={pendentesAprovacao} description="aguardando review" icon={Clock} accent={pendentesAprovacao > 0 ? "warning" : "primary"} />
          <MetricCard title="Aprovados" value={aprovados} description="prontos para execução" icon={CheckCircle} accent="success" />
          <MetricCard title="Total" value={briefings.length} description="no sistema" icon={List} accent="primary" />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou descrição…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground"
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPrioridadeFilter("all"); }}
            >
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        {/* ── Table Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Briefings de Marketing
              <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredBriefings.length})</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Todos os briefings e diretrizes de campanhas</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredBriefings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBriefings.map((briefing: any) => (
                    <TableRow key={briefing.id} data-testid={`row-briefing-${briefing.id}`}>
                      <TableCell className="font-medium">{briefing.titulo}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[260px] truncate">{briefing.descricao || "—"}</TableCell>
                      <TableCell>
                        {briefing.prioridade ? (
                          <span className={cn(
                            "text-[10px] border px-1.5 py-0.5 rounded-sm capitalize",
                            briefing.prioridade === "alta"  ? "border-primary/40 text-primary" :
                            briefing.prioridade === "media" ? "border-warning/40 text-warning" :
                            "border-success/40 text-success"
                          )}>
                            {briefing.prioridade}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={briefing.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-acoes-briefing-${briefing.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(briefing)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteModal({ open: true, briefing })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
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
                icon={FileEdit}
                title={hasActiveFilters ? "Nenhum resultado" : "Nenhum briefing cadastrado"}
                description={
                  hasActiveFilters
                    ? "Nenhum briefing corresponde aos filtros aplicados."
                    : "Comece a criar briefings para suas campanhas."
                }
                actionLabel={hasActiveFilters ? undefined : "Novo Briefing"}
                onAction={hasActiveFilters ? undefined : handleNovoBriefing}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <BriefingFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={selectedBriefing}
        mode={modalMode}
      />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Briefing"
        description={`Tem certeza que deseja excluir o briefing "${deleteModal.briefing?.titulo}"?`}
        onConfirm={handleDelete}
      />
    </MainLayout>
    </FeatureGate>
  );
}
