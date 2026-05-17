import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Search, FileText, Loader2, Plus, Edit2, Archive, Settings } from "lucide-react";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { TemplateContratoFormModal } from "@/modules/contracts/components/TemplateContratoFormModal";
import { TemplateContratoViewModal } from "@/modules/contracts/components/TemplateContratoViewModal";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  useTemplatesContratos,
  type TemplateContrato,
  type TemplateContratoInsert,
} from "@/modules/contracts/hooks/useTemplatesContratos";
import {
  useContractServiceTypes,
  type ContractServiceType,
  type ContractServiceTypeInsert,
} from "@/modules/contracts/hooks/useContractServiceTypes";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { ServiceTypeFormModal } from "@/modules/contracts/components/ServiceTypeFormModal";

const CLIENT_TYPE_LABELS: Record<string, string> = {
  artista: "Artista",
  pessoa_fisica: "Pessoa Física",
  pessoa_juridica: "Pessoa Jurídica",
};


export default function TemplatesContratos() {
  const { templates, isLoading, addTemplate, updateTemplate, deleteTemplate } = useTemplatesContratos();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateContrato | null>(null);

  const {
    allServiceTypes,
    isLoading: isTypesLoading,
    create: createType,
    update: updateType,
    archive: archiveType,
    isSlugInUse,
  } = useContractServiceTypes();
  const activeServiceTypes = allServiceTypes.filter((t) => t.active);
  const { contratos } = useContratos();
  const [isTypeFormOpen, setIsTypeFormOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ContractServiceType | null>(null);

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

  const handleAddType = () => { setSelectedType(null); setIsTypeFormOpen(true); };
  const handleEditType = (t: ContractServiceType) => { setSelectedType(t); setIsTypeFormOpen(true); };
  const handleArchiveClick = (t: ContractServiceType) => { setSelectedType(t); setIsArchiveOpen(true); };
  const handleArchiveConfirm = () => {
    if (selectedType) { archiveType.mutate(selectedType.id); setIsArchiveOpen(false); setSelectedType(null); }
  };
  const handleSaveType = (data: ContractServiceTypeInsert) => {
    if (selectedType) { updateType.mutate({ id: selectedType.id, ...data }); }
    else { createType.mutate(data); }
    setIsTypeFormOpen(false);
    setSelectedType(null);
  };

  if (isLoading) {
    return (
      <MainLayout
        title="Templates de Contratos"
        description="Gerencie modelos de contratos personalizáveis"
      >
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const ativos   = templates.filter((t) => t.ativo).length;
  const inativos = templates.filter((t) => !t.ativo).length;
  const tiposUnicos = new Set(templates.map((t) => t.tipo_servico)).size;

  return (
    <MainLayout
      title="Templates de Contratos"
      description="Gerencie modelos de contratos personalizáveis"
    >
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

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="tipos" className="gap-2" data-testid="tab-tipos-contrato">
              <Settings className="h-4 w-4" />
              Tipos de Contrato
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Templates ── */}
          <TabsContent value="templates" className="space-y-4 mt-4">
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
                  {activeServiceTypes.map((tipo) => (
                    <SelectItem key={tipo.slug} value={tipo.name}>{tipo.name}</SelectItem>
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
          </TabsContent>

          {/* ── Tab: Tipos de Contrato ── */}
          <TabsContent value="tipos" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground max-w-xl">
                Configure os tipos de serviço disponíveis ao criar contratos. Os tipos definem quais campos financeiros aparecem no formulário.
              </p>
              <Button size="sm" className="gap-2" onClick={handleAddType} data-testid="button-novo-tipo-contrato">
                <Plus className="h-4 w-4" />
                Novo Tipo
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {isTypesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : allServiceTypes.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Settings}
                      title="Nenhum tipo de contrato cadastrado"
                      description="Crie tipos de contrato para organizar seus serviços."
                      action={{ label: "Novo Tipo", onClick: handleAddType }}
                    />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo de Cliente</TableHead>
                        <TableHead>Campos Financeiros</TableHead>
                        <TableHead>Envolvidos</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allServiceTypes.map((t) => (
                        <TableRow
                          key={t.id}
                          data-testid={`row-service-type-${t.id}`}
                          className={!t.active ? "opacity-50" : ""}
                        >
                          <TableCell className="text-muted-foreground text-xs">{t.sort_order}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{t.name}</p>
                              {t.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {t.category ? (
                              <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {t.client_types.map((ct) => (
                                <Badge key={ct} variant="outline" className="text-xs">
                                  {CLIENT_TYPE_LABELS[ct] ?? ct}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {t.requires_royalties && <Badge variant="outline" className="text-xs">Royalties</Badge>}
                              {t.requires_fixed_value && <Badge variant="outline" className="text-xs">Valor Fixo</Badge>}
                              {t.requires_advance && <Badge variant="outline" className="text-xs">Adiantamento</Badge>}
                              {t.requires_financial_support && <Badge variant="outline" className="text-xs">Suporte Fin.</Badge>}
                              {t.allow_installments && <Badge variant="outline" className="text-xs">Parcelamento</Badge>}
                              {!t.requires_royalties && !t.requires_fixed_value && !t.requires_advance &&
                               !t.requires_financial_support && !t.allow_installments && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {t.participants && t.participants.length > 0 ? (
                              <span className="text-sm">{t.participants.length} envolvido{t.participants.length !== 1 ? "s" : ""}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.active ? "default" : "secondary"}>
                              {t.active ? "Ativo" : "Arquivado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditType(t)}
                                data-testid={`button-edit-type-${t.id}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              {t.active && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleArchiveClick(t)}
                                  disabled={isSlugInUse(t.slug, contratos as Array<Record<string, unknown>>)}
                                  title={
                                    isSlugInUse(t.slug, contratos as Array<Record<string, unknown>>)
                                      ? "Tipo em uso em contratos — não pode ser arquivado"
                                      : "Arquivar tipo"
                                  }
                                  data-testid={`button-archive-type-${t.id}`}
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Modais Templates ── */}
        <TemplateContratoFormModal
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          template={selectedTemplate}
          onSave={handleSave}
          tiposServico={activeServiceTypes}
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

        {/* ── Modais Tipos de Contrato ── */}
        <ServiceTypeFormModal
          open={isTypeFormOpen}
          onOpenChange={setIsTypeFormOpen}
          serviceType={selectedType}
          onSave={handleSaveType}
          existingSlugs={allServiceTypes.filter((t) => t.id !== selectedType?.id).map((t) => t.slug)}
        />
        <DeleteConfirmModal
          open={isArchiveOpen}
          onOpenChange={setIsArchiveOpen}
          onConfirm={handleArchiveConfirm}
          title="Arquivar Tipo de Contrato"
          description={`Tem certeza que deseja arquivar o tipo "${selectedType?.name}"? Ele não aparecerá mais na lista ao criar contratos.`}
        />
      </div>
    </MainLayout>
  );
}
