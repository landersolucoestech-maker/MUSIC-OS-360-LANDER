import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Loader2, Plus, Trash2, FileText, Sparkles, Eye, Pencil, Search, X,
} from "lucide-react";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  useTemplatesContratos,
  type TemplateContrato,
  type TemplateContratoInsert,
  type TemplateContratoUpdate,
} from "@/modules/contracts/hooks/useTemplatesContratos";
import { ContractImportWorkspace } from "@/modules/contracts/components/ContractImportWorkspace";
import { TemplateContratoViewModal } from "@/modules/contracts/components/TemplateContratoViewModal";
import type { SemanticTemplateManifest } from "@/modules/contracts/types/contracts.types";

function parseManifest(template: TemplateContrato): SemanticTemplateManifest | null {
  const raw = template["variables_manifest"];
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed as SemanticTemplateManifest;
  } catch {
    return null;
  }
}

function countVariables(template: TemplateContrato): number {
  return parseManifest(template)?.variables?.length ?? 0;
}

function getClauseTypes(template: TemplateContrato): string[] {
  return parseManifest(template)?.clauseTypes ?? [];
}

function formatSlug(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const COL = "grid grid-cols-[1fr_180px_110px_130px_100px] items-center gap-4 px-4";

function TemplateTableHeader() {
  return (
    <div className={`${COL} py-2 border-b border-border`}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de Criação</span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Ações</span>
    </div>
  );
}

function TemplateRow({
  template,
  onDelete,
  onView,
  onEdit,
}: {
  template: TemplateContrato;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
}) {
  const varCount = countVariables(template);
  const clauseTypes = getClauseTypes(template);
  const isSemantic = template.tipo_servico === "semantico";

  return (
    <div
      className={`${COL} group py-3 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50 last:border-0`}
      onClick={onView}
      data-testid={`row-template-${template.id}`}
    >
      {/* Nome */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${isSemantic ? "bg-primary/10" : "bg-muted"}`}>
          {isSemantic
            ? <Sparkles className="h-3.5 w-3.5 text-primary" />
            : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate leading-tight">{template.nome}</p>
          {template.descricao && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{template.descricao}</p>
          )}
        </div>
      </div>

      {/* Categoria */}
      <div className="flex items-center gap-1 flex-wrap">
        {isSemantic ? (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-2.5 w-2.5" />Semântico IA
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {template.tipo_servico ? formatSlug(template.tipo_servico) : "Padrão"}
          </Badge>
        )}
        {clauseTypes.slice(0, 1).map((ct) => (
          <Badge key={ct} variant="outline" className="text-[10px]">{ct}</Badge>
        ))}
        {clauseTypes.length > 1 && (
          <span className="text-[10px] px-1 py-0.5 rounded border text-muted-foreground border-border">
            +{clauseTypes.length - 1}
          </span>
        )}
        {isSemantic && varCount > 0 && (
          <span className="text-[10px] text-muted-foreground">{varCount} vars</span>
        )}
      </div>

      {/* Status */}
      <div>
        <Badge variant={template.ativo ? "default" : "secondary"} className="text-[10px]">
          {template.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      {/* Data de Criação */}
      <span className="text-xs text-muted-foreground">{formatDate(template.created_at)}</span>

      {/* Ações */}
      <div className="flex items-center gap-1 justify-end">
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onView(); }} title="Visualizar"
          data-testid={`button-view-template-${template.id}`}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar"
          data-testid={`button-edit-template-${template.id}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Excluir"
          data-testid={`button-delete-template-${template.id}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function TemplatesContratos() {
  const { templates, isLoading, addTemplate, updateTemplate, deleteTemplate } =
    useTemplatesContratos();

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen]       = useState(false);
  const [isViewOpen, setIsViewOpen]           = useState(false);
  const [isEditOpen, setIsEditOpen]           = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateContrato | null>(null);

  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState<"all" | "semantico" | "padrao">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "ativo" | "inativo">("all");

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (q && !t.nome.toLowerCase().includes(q) && !(t.descricao ?? "").toLowerCase().includes(q)) return false;
      if (filterType === "semantico" && t.tipo_servico !== "semantico") return false;
      if (filterType === "padrao"    && t.tipo_servico === "semantico") return false;
      if (filterStatus === "ativo"   && !t.ativo)  return false;
      if (filterStatus === "inativo" && t.ativo)   return false;
      return true;
    });
  }, [templates, search, filterType, filterStatus]);

  const hasActiveFilters = search.trim() !== "" || filterType !== "all" || filterStatus !== "all";

  const handleSave = (data: TemplateContratoInsert) => {
    addTemplate.mutate(data);
  };

  const handleEditSave = (id: string, data: TemplateContratoUpdate) => {
    updateTemplate.mutate({ id, ...data });
  };

  const handleDeleteClick = (t: TemplateContrato) => {
    setSelectedTemplate(t);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedTemplate) {
      deleteTemplate.mutate(selectedTemplate.id);
      setIsDeleteOpen(false);
      setSelectedTemplate(null);
    }
  };

  const handleViewClick = (t: TemplateContrato) => {
    setSelectedTemplate(t);
    setIsViewOpen(true);
  };

  const handleEditClick = (t: TemplateContrato) => {
    setSelectedTemplate(t);
    setIsEditOpen(true);
  };

  const semanticCount = templates.filter((t) => t.tipo_servico === "semantico").length;
  const activeCount   = templates.filter((t) => t.ativo).length;
  const totalVars     = templates.reduce((acc, t) => acc + countVariables(t), 0);

  if (isLoading) {
    return (
      <MainLayout
        title="Templates de Contrato"
        description="Motor semântico de templates contratuais"
      >
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Templates de Contrato"
      description="Transforme qualquer contrato em template reutilizável com inteligência semântica"
      actions={
        <Button
          className="gap-2"
          onClick={() => setIsWorkspaceOpen(true)}
          data-testid="button-novo-template"
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { title: "Total de Templates", value: templates.length,  sub: "todos os tipos",         icon: FileText  },
            { title: "Semânticos (IA)",     value: semanticCount,    sub: "gerados por IA",          icon: Sparkles  },
            { title: "Ativos",              value: activeCount,      sub: "disponíveis",             icon: FileText  },
            { title: "Variáveis Mapeadas",  value: totalVars,        sub: "em todos os templates",   icon: Sparkles  },
          ].map(({ title, value, sub, icon: Icon }) => (
            <Card key={title}>
              <div className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
                <p className="text-sm font-medium">{title}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="px-5 pb-5">
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Buscar por nome ou descrição…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-templates"
            />
            {search && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="h-9 w-[160px] text-sm" data-testid="select-filter-type">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="semantico">Semântico (IA)</SelectItem>
              <SelectItem value="padrao">Padrão</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="h-9 w-[140px] text-sm" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground"
              onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }}
              data-testid="button-clear-filters"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}

        </div>

        {/* Template grid */}
        {templates.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={Sparkles}
                title="Nenhum template criado ainda"
                description="Clique em 'Novo Template' para importar um contrato e gerar um template inteligente com detecção automática de variáveis."
                action={{ label: "Novo Template", onClick: () => setIsWorkspaceOpen(true) }}
              />
            </CardContent>
          </Card>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={Search}
                title="Nenhum template encontrado"
                description="Tente ajustar os filtros ou limpar a busca para ver todos os templates."
                action={{ label: "Limpar filtros", onClick: () => { setSearch(""); setFilterType("all"); setFilterStatus("all"); } }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <TemplateTableHeader />
            {filteredTemplates.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                onView={() => handleViewClick(t)}
                onEdit={() => handleEditClick(t)}
                onDelete={() => handleDeleteClick(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ContractImportWorkspace
        open={isWorkspaceOpen}
        onOpenChange={setIsWorkspaceOpen}
        onSave={handleSave}
      />

      <ContractImportWorkspace
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSave={handleSave}
        template={selectedTemplate}
        onEdit={handleEditSave}
      />

      <TemplateContratoViewModal
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        template={selectedTemplate}
      />

      <DeleteConfirmModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Excluir Template"
        description={`Tem certeza que deseja excluir o template "${selectedTemplate?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </MainLayout>
  );
}
