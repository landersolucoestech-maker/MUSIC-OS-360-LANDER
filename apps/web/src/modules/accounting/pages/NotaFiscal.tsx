import { useCallback, useMemo, useState } from "react";
import { runBulkAction, reportBulkResult } from "@/shared/hooks/useBulkAction";
import { MainLayout } from "@/shared/components/MainLayout";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  MoreHorizontal,
} from "lucide-react";
import { NotaFiscalFormModal } from "@/modules/accounting/components/NotaFiscalFormModal";
import { NotaFiscalViewModal } from "@/modules/accounting/components/NotaFiscalViewModal";
import { useNotasFiscais } from "@/modules/accounting/hooks/useNotasFiscais";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { Badge } from "@/shared/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseTipoOperacao, type TipoOperacaoNF } from "@/modules/accounting/lib/nota-fiscal-type";
import { formatCurrency, getCurrencyToneClass, getMonetarySemanticClass } from "@/shared/lib/format-utils";

type TipoFilter = "all" | TipoOperacaoNF;

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getNotaPartyName(nota: any): string {
  return (
    nota.clientes?.nome ||
    nota.tomador_razao_social ||
    nota.tomador_nome ||
    "-"
  );
}

function getNotaDisplayValue(nota: any): number | null {
  return numberValue(nota.valor_liquido, nota.valor_servicos, nota.valor, nota.valor_total);
}

export default function NotaFiscal() {
  const { notasFiscais, isLoading, deleteNotaFiscal } = useNotasFiscais();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [createTipo, setCreateTipo] = useState<TipoOperacaoNF>("saida");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isViewOpen, setIsViewOpen] = useState(false);

  // Enriquecimento: anota cada nota com o type derivado das observações
  const notasFiscaisComTipo = useMemo(
    () =>
      notasFiscais.map((n: any) => ({
        ...n,
        _tipoOperacao: parseTipoOperacao(n.observacoes).type,
      })),
    [notasFiscais],
  );

  const handleView = (nota: any) => {
    setSelectedNota(nota);
    setIsViewOpen(true);
  };

  const handleEdit = useCallback((nota: any) => {
    setSelectedNota(nota);
    setModalMode("edit");
    setIsModalOpen(true);
  }, []);

  useEditQueryParam("edit", notasFiscais, handleEdit, "notas_fiscais");

  const handleDelete = (nota: any) => {
    setSelectedNota(nota);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedNota) {
      deleteNotaFiscal.mutate(selectedNota.id);
    }
    setDeleteModalOpen(false);
    setSelectedNota(null);
  };

  const handleCreate = (type: TipoOperacaoNF) => {
    setSelectedNota(null);
    setCreateTipo(type);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ids = selectedIds;
    setSelectedIds([]);
    const result = await runBulkAction(ids, (id) => deleteNotaFiscal.mutateAsync(id));
    reportBulkResult(result, "excluída", "nota fiscal");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotas.length && filteredNotas.length > 0) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredNotas.map((nota: any) => nota.id));
  };

  // Filtros
  const filteredNotas = notasFiscaisComTipo.filter((nota: any) => {
    const partyName = getNotaPartyName(nota).toLowerCase();
    const rawSearch = searchTerm.toLowerCase();
    const matchesSearch =
      (nota.numero || "").toLowerCase().includes(rawSearch) ||
      partyName.includes(rawSearch) ||
      (nota.tomador_cnpj || "").toLowerCase().includes(rawSearch) ||
      (nota.tomador_email || "").toLowerCase().includes(rawSearch);
    const matchesStatus = statusFilter === "all" || nota.status === statusFilter;
    const matchesTipo = tipoFilter === "all" || nota._tipoOperacao === tipoFilter;
    const emissao = String(nota.data_emissao ?? "").slice(0, 10);
    const matchesStart = !startDate || (emissao && emissao >= startDate);
    const matchesEnd = !endDate || (emissao && emissao <= endDate);
    return matchesSearch && matchesStatus && matchesTipo && matchesStart && matchesEnd;
  });

  const { page, pageSize, total, pageItems, setPage, setPageSize } = usePagination(filteredNotas, 10);

  // Métricas
  const totalRegistradas = notasFiscaisComTipo.length;
  const saidas = notasFiscaisComTipo.filter((n: any) => n._tipoOperacao === "saida");
  const entradas = notasFiscaisComTipo.filter((n: any) => n._tipoOperacao === "entrada");
  const valorSaidas = saidas.reduce((acc: number, n: any) => acc + (getNotaDisplayValue(n) ?? 0), 0);
  const valorEntradas = entradas.reduce((acc: number, n: any) => acc + (getNotaDisplayValue(n) ?? 0), 0);
  const saldo = valorSaidas - valorEntradas;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      emitida: { variant: "default", label: "Emitida" },
      pendente: { variant: "secondary", label: "Pendente" },
      paga: { variant: "outline", label: "Paga" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTipoBadge = (type: TipoOperacaoNF) =>
    type === "entrada" ? (
      <Badge variant="secondary" className="gap-1" data-testid="badge-type-entrada">
        <ArrowDownLeft className="h-3 w-3" />
        Entrada
      </Badge>
    ) : (
      <Badge variant="default" className="gap-1" data-testid="badge-type-saida">
        <ArrowUpRight className="h-3 w-3" />
        Saída
      </Badge>
    );


  const headerActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2" data-testid="button-registrar-nota">
          <Plus className="h-4 w-4" />
          Registrar Nota
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleCreate("saida")} data-testid="menu-registrar-saida">
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Registrar Saída
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCreate("entrada")} data-testid="menu-registrar-entrada">
          <ArrowDownLeft className="h-4 w-4 mr-2" />
          Registrar Entrada
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MainLayout title="Notas Fiscais" description="Registro e controle de notas fiscais de entrada e saída" actions={headerActions}>
      <div className="space-y-6">
        {/* Metrics — padrão do sistema */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-foreground" data-testid="metric-total-registradas">{totalRegistradas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg"><ArrowUpRight className="h-5 w-5 text-green-500" /></div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Saídas</p>
                  <p className="text-xl font-bold text-foreground" data-testid="metric-saidas-qtd">{saidas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg"><ArrowDownLeft className="h-5 w-5 text-yellow-500" /></div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Entradas</p>
                  <p className="text-xl font-bold text-foreground" data-testid="metric-entradas-qtd">{entradas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg"><ArrowUpRight className="h-5 w-5 text-green-500" /></div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Valor Saídas</p>
                  <p className={`text-base font-bold leading-tight ${getMonetarySemanticClass("positive")}`} data-testid="metric-valor-saidas">{formatCurrency(valorSaidas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg"><ArrowDownLeft className="h-5 w-5 text-yellow-500" /></div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Valor Entradas</p>
                  <p className={`text-base font-bold leading-tight ${getMonetarySemanticClass("negative")}`} data-testid="metric-valor-entradas">{formatCurrency(-valorEntradas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${saldo >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <Scale className={`h-5 w-5 ${saldo >= 0 ? "text-green-500" : "text-red-500"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-base font-bold leading-tight ${getCurrencyToneClass(saldo)}`} data-testid="metric-saldo">
                    {saldo >= 0 ? "+" : ""}{formatCurrency(saldo)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 p-3">
          {/* Seletor de datas — sempre imediatamente à esquerda da busca */}
          <DatePickerField
            value={startDate}
            onChange={setStartDate}
            placeholder="Data início"
            className="h-8 text-xs w-[150px] shrink-0"
            data-testid="datepicker-start-date"
          />
          <DatePickerField
            value={endDate}
            onChange={setEndDate}
            placeholder="Data fim"
            className="h-8 text-xs w-[150px] shrink-0"
            data-testid="datepicker-end-date"
          />
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou fornecedor…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-busca-nf"
            />
          </div>
          <Select value={tipoFilter} onValueChange={(value) => setTipoFilter(value as TipoFilter)}>
            <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border shrink-0" data-testid="select-type-filter">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="filter-type-all">Todas</SelectItem>
              <SelectItem value="saida" data-testid="filter-type-saida">Saída</SelectItem>
              <SelectItem value="entrada" data-testid="filter-type-entrada">Entrada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="emitida">Emitida</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table or Empty State */}
        {filteredNotas.length > 0 ? (
          <Card>
            <CardContent>
              <ListSectionHeader
                title="Lista de Notas Fiscais"
                count={filteredNotas.length}
                description="Registro de notas de entrada e saída"
                action={
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <Checkbox
                      checked={selectedIds.length === filteredNotas.length && filteredNotas.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todas as notas fiscais"
                      data-testid="checkbox-select-all-notas"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.length > 0 ? `${selectedIds.length} nota(s) selecionada(s)` : "Selecionar todos"}
                    </span>
                    {selectedIds.length > 0 && (
                      <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete-notas">
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir ({selectedIds.length})
                      </Button>
                    )}
                  </div>
                }
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente / Fornecedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PDF</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((nota: any) => {
                      const displayValue = getNotaDisplayValue(nota);
                      return (
                      <TableRow key={nota.id} data-testid={`row-nota-${nota.id}`}>
                        <TableCell className="py-3">
                          <Checkbox
                            checked={selectedIds.includes(nota.id)}
                            onCheckedChange={() => setSelectedIds(prev => prev.includes(nota.id) ? prev.filter(x => x !== nota.id) : [...prev, nota.id])}
                            aria-label="Selecionar nota fiscal"
                            data-testid={`checkbox-nota-${nota.id}`}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-medium">{nota.numero}</span>
                          {nota.serie && <span className="text-muted-foreground text-xs ml-1">/{nota.serie}</span>}
                        </TableCell>
                        <TableCell className="py-3">{getTipoBadge(nota._tipoOperacao)}</TableCell>
                        <TableCell className="py-3 text-sm">{getNotaPartyName(nota)}</TableCell>
                        <TableCell className={`py-3 text-sm ${getMonetarySemanticClass("neutral")}`}>
                          {displayValue !== null ? formatCurrency(displayValue) : "-"}
                        </TableCell>
                        <TableCell className="py-3 text-sm">
                          {nota.data_emissao ? format(new Date(nota.data_emissao), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell className="py-3">{getStatusBadge(nota.status)}</TableCell>
                        <TableCell className="py-3">
                          {nota.url_pdf ? (
                            <Button variant="ghost" size="sm" onClick={() => window.open(nota.url_pdf, "_blank")}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Ações da nota fiscal" data-testid={`button-actions-nota-${nota.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(nota)} data-testid={`menu-view-nota-${nota.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(nota)} data-testid={`menu-edit-nota-${nota.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(nota)} data-testid={`menu-delete-nota-${nota.id}`}>
                                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="notas fiscais"
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm || statusFilter !== "all" || tipoFilter !== "all"
                  ? "Nenhuma nota encontrada"
                  : "Nenhuma nota fiscal registrada"}
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== "all" || tipoFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Registre notas fiscais de entrada (recebidas) e saída (emitidas) para controle interno"}
              </p>
              {!searchTerm && statusFilter === "all" && tipoFilter === "all" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="gap-2" data-testid="button-registrar-primeira-nota">
                      <Plus className="h-4 w-4" />
                      Registrar Primeira Nota
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={() => handleCreate("saida")}>
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Registrar Saída
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCreate("entrada")}>
                      <ArrowDownLeft className="h-4 w-4 mr-2" />
                      Registrar Entrada
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <NotaFiscalFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        mode={modalMode}
        notaFiscal={selectedNota}
        defaultTipoOperacao={createTipo}
      />

      <NotaFiscalViewModal
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        notaFiscal={selectedNota}
        onEdit={() => { setIsViewOpen(false); setModalMode("edit"); setIsModalOpen(true); }}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Excluir Nota Fiscal"
        description={`Tem certeza que deseja excluir a nota fiscal ${selectedNota?.numero}?`}
      />
    </MainLayout>
  );
}
