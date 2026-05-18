import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import {
  Loader2, Plus, Trash2, FileText, Sparkles, Eye,
  ChevronRight, Pencil,
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

function TemplateCard({
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
    <Card
      className="group hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onView}
      data-testid={`card-template-${template.id}`}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isSemantic ? "bg-primary/10" : "bg-muted"
              }`}
            >
              {isSemantic ? (
                <Sparkles className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{template.nome}</p>
              {template.descricao && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                  {template.descricao}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons — visible on hover */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onView(); }}
              title="Visualizar"
              data-testid={`button-view-template-${template.id}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title="Editar"
              data-testid={`button-edit-template-${template.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Excluir"
              data-testid={`button-delete-template-${template.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex flex-wrap gap-1">
          {isSemantic && varCount > 0 && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {varCount} variáveis
            </Badge>
          )}
          {clauseTypes.slice(0, 3).map((ct) => (
            <Badge key={ct} variant="outline" className="text-[10px]">
              {ct}
            </Badge>
          ))}
          {clauseTypes.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground border-border">
              +{clauseTypes.length - 3}
            </span>
          )}
          {!isSemantic && (
            <Badge variant="outline" className="text-[10px]">
              {template.tipo_servico ? formatSlug(template.tipo_servico) : "Padrão"}
            </Badge>
          )}
          <Badge variant={template.ativo ? "default" : "secondary"} className="text-[10px]">
            {template.ativo ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(template.created_at)}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
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

        {/* Toolbar */}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Contract Intelligence Engine</p>
          <p className="text-xs text-muted-foreground max-w-xl">
            Importe qualquer contrato (PDF, DOCX ou texto) e o sistema detecta automaticamente
            todas as variáveis dinâmicas com análise semântica e jurídica contextual.
          </p>
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard
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
