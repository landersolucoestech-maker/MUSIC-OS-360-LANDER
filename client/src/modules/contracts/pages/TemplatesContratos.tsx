import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Search, FileText, Loader2, Plus, Layers } from "lucide-react";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { TemplateContratoFormModal } from "@/modules/contracts/components/TemplateContratoFormModal";
import { TemplateContratoViewModal } from "@/modules/contracts/components/TemplateContratoViewModal";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  useTemplatesContratos,
  type TemplateContrato,
  type TemplateContratoInsert,
} from "@/modules/contracts/hooks/useTemplatesContratos";
import { CONTRACT_TYPES } from "@/modules/contracts/constants/contract-types";
import { useDocumentTemplates, useCreateTemplate } from "@/modules/contracts-v2/hooks/useDocumentEngine";
import { TEMPLATE_CATEGORY_LABEL, SIGNER_ROLE_LABEL } from "@/modules/contracts-v2/types";
import type { TemplateCategory, SignerRole } from "@/modules/contracts-v2/types";
import { createTemplateSchema } from "@/modules/contracts-v2/lib/schemas";
import type { CreateTemplateInput } from "@/modules/contracts-v2/lib/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Textarea } from "@/shared/ui/textarea";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TIPOS_SERVICO = [
  ...[
    ...CONTRACT_TYPES.SERVICOS,
    ...CONTRACT_TYPES.COLABORADORES,
    ...CONTRACT_TYPES.ARTISTICOS,
    ...CONTRACT_TYPES.FONOGRAFICOS,
    ...CONTRACT_TYPES.EDITORIAIS,
    ...CONTRACT_TYPES.LICENCIAMENTO,
    ...CONTRACT_TYPES.SHOWS,
    ...CONTRACT_TYPES.DISTRIBUICAO,
    ...CONTRACT_TYPES.PARCERIAS,
    ...CONTRACT_TYPES.MARCAS_PUBLICIDADE,
    ...CONTRACT_TYPES.JURIDICOS,
    ...CONTRACT_TYPES.RESCISAO,
  ].sort((a, b) => a.localeCompare(b, "pt-BR")),
  "Outros",
];

const CATEGORY_OPTIONS: TemplateCategory[] = [
  "gravacao", "distribuicao", "publishing", "show", "producao", "licenciamento", "outros",
];

const SIGNER_ROLE_OPTIONS: SignerRole[] = [
  "artista", "label", "testemunha", "procurador", "produtor", "advogado",
];

// ─── Template card v2 ────────────────────────────────────────────────────────

function TemplateCardV2({ name, category, variables, signer_roles, version }: {
  name: string;
  category: TemplateCategory;
  variables: { key: string }[];
  signer_roles: SignerRole[];
  version: number;
}) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{TEMPLATE_CATEGORY_LABEL[category]}</p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">v{version}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {signer_roles.map((r) => (
            <Badge key={r} variant="outline" className="text-[10px] font-normal">{SIGNER_ROLE_LABEL[r]}</Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{variables.length} variável{variables.length !== 1 ? "is" : ""}</p>
      </CardContent>
    </Card>
  );
}

// ─── New template form v2 ─────────────────────────────────────────────────────

function NewTemplateFormV2({ onSuccess }: { onSuccess: () => void }) {
  const createMut = useCreateTemplate();
  const [selectedRoles, setSelectedRoles] = useState<SignerRole[]>(["artista", "label"]);

  const form = useForm<CreateTemplateInput>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name:         "",
      description:  "",
      category:     "gravacao",
      content:      "",
      variables:    [],
      signer_roles: ["artista", "label"],
    },
  });

  function toggleRole(role: SignerRole) {
    setSelectedRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role];
      form.setValue("signer_roles", next);
      return next;
    });
  }

  async function onSubmit(data: CreateTemplateInput) {
    try {
      await createMut.mutateAsync({ ...data, signer_roles: selectedRoles });
      toast.success("Template criado com sucesso!");
      form.reset();
      onSuccess();
    } catch {
      toast.error("Erro ao criar template.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Template</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Contrato de Gravação Exclusiva" {...field} data-testid="input-template-v2-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-template-v2-category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{TEMPLATE_CATEGORY_LABEL[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição (opcional)</FormLabel>
            <FormControl>
              <Input placeholder="Breve descrição do template" {...field} data-testid="input-template-v2-description" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="content" render={({ field }) => (
          <FormItem>
            <FormLabel>Conteúdo HTML do Template</FormLabel>
            <FormControl>
              <Textarea
                placeholder={`<h1>CONTRATO DE GRAVAÇÃO</h1>\n<p>Entre {{NOME_LABEL}} e {{NOME_ARTISTA}}…</p>\n<p>[ASSIN_ARTISTA]</p>`}
                className="font-mono text-xs min-h-[180px]"
                {...field}
                data-testid="textarea-template-v2-content"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">{"{{VARIAVEL}}"}</code> para variáveis e{" "}
              <code className="bg-muted px-1 rounded">[ASSIN_ROLE]</code> para âncoras de assinatura.
            </p>
            <FormMessage />
          </FormItem>
        )} />

        <div>
          <p className="text-sm font-medium mb-2">Roles de Signatários</p>
          <div className="flex flex-wrap gap-2">
            {SIGNER_ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                data-testid={`toggle-role-v2-${role}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedRoles.includes(role)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/50"
                }`}
              >
                {SIGNER_ROLE_LABEL[role]}
              </button>
            ))}
          </div>
          {selectedRoles.length === 0 && (
            <p className="text-xs text-destructive mt-1">Selecione pelo menos 1 signatário</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            size="sm"
            className="gap-1.5"
            disabled={createMut.isPending || selectedRoles.length === 0}
            data-testid="btn-salvar-template-v2"
          >
            <Save className="h-4 w-4" />
            {createMut.isPending ? "Salvando…" : "Salvar Template"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Aba: Templates Simples (v1) ─────────────────────────────────────────────

function TabTemplatesSimples() {
  const { templates, isLoading, addTemplate, updateTemplate, deleteTemplate } = useTemplatesContratos();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateContrato | null>(null);

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tpl.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "todos" || tpl.tipo_servico === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const handleAdd = () => { setSelectedTemplate(null); setIsFormOpen(true); };
  const handleEdit = (template: TemplateContrato) => { setSelectedTemplate(template); setIsFormOpen(true); };
  const handleView = (template: TemplateContrato) => { setSelectedTemplate(template); setIsViewOpen(true); };
  const handleDeleteClick = (template: TemplateContrato) => { setSelectedTemplate(template); setIsDeleteOpen(true); };
  const handleDeleteConfirm = () => {
    if (selectedTemplate) { deleteTemplate.mutate(selectedTemplate.id); setIsDeleteOpen(false); setSelectedTemplate(null); }
  };
  const handleSave = (data: TemplateContratoInsert) => {
    if (selectedTemplate) { updateTemplate.mutate({ id: selectedTemplate.id, ...data }); }
    else { addTemplate.mutate(data); }
    setIsFormOpen(false);
    setSelectedTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ativos   = templates.filter((t) => t.ativo).length;
  const inativos = templates.filter((t) => !t.ativo).length;
  const tiposUnicos = new Set(templates.map((t) => t.tipo_servico)).size;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: "Total de Templates", value: templates.length, color: "text-foreground" },
          { title: "Ativos",             value: ativos,           color: "text-success"     },
          { title: "Inativos",           value: inativos,         color: "text-muted-foreground" },
          { title: "Tipos de Serviço",   value: tiposUnicos,      color: "text-foreground"  },
        ].map(({ title, value, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions + Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[200px] bg-card border-border">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_SERVICO.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(searchTerm !== "" || filterTipo !== "todos") && (
          <Button variant="outline" onClick={() => { setSearchTerm(""); setFilterTipo("todos"); }}>
            Limpar
          </Button>
        )}
        <Button size="sm" className="gap-2 ml-auto" onClick={handleAdd} data-testid="button-novo-template">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTemplates.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="Nenhum template encontrado"
                description="Crie templates de contratos para agilizar a geração de documentos."
                action={{ label: "Novo Template", onClick: handleAdd }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo de Serviço</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualização</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.nome}</p>
                        {template.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{template.descricao}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.tipo_servico ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {(template.variaveis as string[] | null)?.length ?? 0} variáveis
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.ativo ? "default" : "secondary"}>
                        {template.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.updated_at ? new Date(template.updated_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleView(template)}>Ver</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(template)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteClick(template)}>Excluir</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TemplateContratoFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        template={selectedTemplate}
        onSave={handleSave}
        tiposServico={TIPOS_SERVICO}
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
    </div>
  );
}

// ─── Aba: Templates com Variáveis (v2) ───────────────────────────────────────

function TabTemplatesVariaveis() {
  const [showForm, setShowForm] = useState(false);
  const { data: templates = [], isLoading } = useDocumentTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Templates com variáveis dinâmicas e roles de signatários — usados no wizard de assinatura digital.
        </p>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowForm((v) => !v)}
          data-testid="btn-novo-template-v2"
        >
          {showForm ? (
            <><Trash2 className="h-4 w-4" /> Cancelar</>
          ) : (
            <><Plus className="h-4 w-4" /> Novo Template</>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="py-4 px-5 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Novo Template com Variáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <NewTemplateFormV2 onSuccess={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Templates disponíveis ({templates.length})</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum template criado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} data-testid={`card-template-v2-${tpl.id}`}>
                <TemplateCardV2
                  name={tpl.name}
                  category={tpl.category}
                  variables={tpl.variables}
                  signer_roles={tpl.signer_roles}
                  version={tpl.version}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesContratos() {
  return (
    <MainLayout
      title="Templates de Contratos"
      description="Gerencie modelos de contratos personalizáveis"
    >
      <Tabs defaultValue="simples" className="space-y-6">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger
            value="simples"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm font-medium"
            data-testid="tab-templates-simples"
          >
            Templates Simples
          </TabsTrigger>
          <TabsTrigger
            value="variaveis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm font-medium"
            data-testid="tab-templates-variaveis"
          >
            Templates com Variáveis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simples" className="mt-0">
          <TabTemplatesSimples />
        </TabsContent>

        <TabsContent value="variaveis" className="mt-0">
          <TabTemplatesVariaveis />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
