import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Clock, FileText, CheckCircle, Target, Search, Check, Loader2, MoreHorizontal, Pencil, Trash2, Plus, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { TarefaMarketingFormModal } from "@/modules/marketing/components/TarefaMarketingFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { MetricCard } from "@/shared/components/MetricCard";
import { useTarefasMarketing } from "@/modules/marketing/hooks/useTarefasMarketing";
import { cn } from "@/shared/lib/utils";

export default function MarketingTarefas() {
  const { tarefas, isLoading, deleteTarefa } = useTarefasMarketing();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTarefa, setSelectedTarefa] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; tarefa?: any }>({ open: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all-pri");
  const [categoriaFilter, setCategoriaFilter] = useState("all-cat");

  const handleNovaTarefa = () => {
    setSelectedTarefa(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleEdit = (tarefa: any) => {
    setSelectedTarefa(tarefa);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (deleteModal.tarefa) {
      deleteTarefa.mutate(deleteModal.tarefa.id);
      setDeleteModal({ open: false });
    }
  };

  const filteredTarefas = tarefas.filter((t: any) => {
    const matchesSearch =
      searchTerm === "" ||
      t.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPrioridade = prioridadeFilter === "all-pri" || t.prioridade === prioridadeFilter;
    const matchesCategoria = categoriaFilter === "all-cat" || t.categoria === categoriaFilter;
    return matchesSearch && matchesStatus && matchesPrioridade && matchesCategoria;
  });

  const hasActiveFilters =
    searchTerm !== "" || statusFilter !== "all" || prioridadeFilter !== "all-pri" || categoriaFilter !== "all-cat";

  // Metrics
  const pendentes = tarefas.filter((t: any) => t.status === "pendente").length;
  const emAndamento = tarefas.filter((t: any) => t.status === "em_andamento").length;
  const concluidas = tarefas.filter((t: any) => t.status === "concluida").length;
  const taxaConclusao = tarefas.length > 0 ? Math.round((concluidas / tarefas.length) * 100) : 0;

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
    <MainLayout
      title="Gestão de Tarefas"
      description="Organize e acompanhe todas as tarefas de marketing"
      actions={
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleNovaTarefa}>
          <Plus className="h-3.5 w-3.5" /> Nova Tarefa
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Pendentes" value={pendentes} description="aguardando execução" icon={Clock} accent={pendentes > 0 ? "warning" : "primary"} />
          <MetricCard title="Em Andamento" value={emAndamento} description="sendo executadas" icon={FileText} accent="primary" />
          <MetricCard title="Concluídas" value={concluidas} description="este mês" icon={CheckCircle} accent="success" />
          <MetricCard title="Taxa de Conclusão" value={`${taxaConclusao}%`} description="no prazo" icon={Target} accent="success" />
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-pri">Todas</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-cat">Todas</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="conteudo">Conteúdo</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground"
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPrioridadeFilter("all-pri"); setCategoriaFilter("all-cat"); }}
            >
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        {/* ── Table Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Lista de Tarefas
              <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredTarefas.length})</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Gerencie todas as tarefas de marketing e seus prazos</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredTarefas.length > 0 ? (
              <div className="divide-y divide-border/60">
                {filteredTarefas.map((tarefa: any) => (
                  <div
                    key={tarefa.id}
                    className="flex items-center gap-4 py-3 first:pt-0 hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors"
                    data-testid={`row-tarefa-${tarefa.id}`}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      tarefa.status === "concluida"
                        ? "bg-success/10 border border-success/20"
                        : "bg-primary/10 border border-primary/20"
                    )}>
                      {tarefa.status === "concluida"
                        ? <Check className="h-4 w-4 text-success" />
                        : <Clock className="h-4 w-4 text-primary" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium leading-tight">{tarefa.titulo}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {tarefa.categoria && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
                            {tarefa.categoria}
                          </span>
                        )}
                        {tarefa.prioridade && (
                          <span className={cn(
                            "text-[10px] border px-1.5 py-0.5 rounded-sm",
                            tarefa.prioridade === "alta"   ? "border-primary/40 text-primary" :
                            tarefa.prioridade === "media"  ? "border-warning/40 text-warning" :
                            "border-success/40 text-success"
                          )}>
                            {tarefa.prioridade}
                          </span>
                        )}
                        <StatusBadge status={tarefa.status} />
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(tarefa)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteModal({ open: true, tarefa })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title={hasActiveFilters ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa cadastrada"}
                description={
                  hasActiveFilters
                    ? "Nenhuma tarefa corresponde aos filtros aplicados."
                    : "Comece criando sua primeira tarefa de marketing."
                }
                actionLabel={hasActiveFilters ? undefined : "Nova Tarefa"}
                onAction={hasActiveFilters ? undefined : handleNovaTarefa}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <TarefaMarketingFormModal open={modalOpen} onOpenChange={setModalOpen} initialData={selectedTarefa} mode={modalMode} />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Tarefa"
        description={`Tem certeza que deseja excluir a tarefa "${deleteModal.tarefa?.titulo}"?`}
        onConfirm={handleDelete}
      />
    </MainLayout>
  );
}
