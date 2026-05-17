import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Loader2, Plus, Edit2, Archive, Settings } from "lucide-react";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
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
  const {
    allServiceTypes,
    isLoading,
    create: createType,
    update: updateType,
    archive: archiveType,
    isSlugInUse,
  } = useContractServiceTypes();
  const { contratos } = useContratos();

  const [isTypeFormOpen, setIsTypeFormOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ContractServiceType | null>(null);

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
        title="Tipos de Contrato"
        description="Configure os tipos de contrato disponíveis no sistema"
      >
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const ativos    = allServiceTypes.filter((t) => t.active).length;
  const arquivados = allServiceTypes.filter((t) => !t.active).length;

  return (
    <MainLayout
      title="Tipos de Contrato"
      description="Configure os tipos de contrato disponíveis no sistema"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Total de Tipos",  value: allServiceTypes.length, color: "text-foreground" },
            { title: "Ativos",          value: ativos,                 color: "text-success"    },
            { title: "Arquivados",      value: arquivados,             color: "text-muted-foreground" },
          ].map(({ title, value, color }) => (
            <Card key={title}>
              <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <p className="text-sm font-medium">{title}</p>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="px-6 pb-6">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground max-w-xl">
            Configure os tipos de serviço disponíveis ao criar contratos. Os tipos definem quais campos financeiros aparecem no formulário.
          </p>
          <Button size="sm" className="gap-2" onClick={handleAddType} data-testid="button-novo-tipo-contrato">
            <Plus className="h-4 w-4" />
            Novo Tipo
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
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
      </div>

      {/* Modais */}
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
    </MainLayout>
  );
}
