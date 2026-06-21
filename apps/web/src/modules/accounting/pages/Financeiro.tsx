import { useCallback, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { MainLayout } from "@/shared/components/MainLayout";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  Plus, Search, Upload, Tags,
  Eye, Pencil, Trash2, X, MoreHorizontal,
} from "lucide-react";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { formatCategoryLabel } from "@/shared/lib/category-labels";
import { TransacaoFormModal } from "@/modules/accounting/components/TransacaoFormModal";
import { TransacaoViewModal } from "@/modules/accounting/components/TransacaoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { MetricCard } from "@/shared/components/MetricCard";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { cn } from "@/shared/lib/utils";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { toast } from "sonner";
import { FeatureGate } from '@/shared/components/FeatureGate';

type Transacao = Record<string, any>;

export default function Financeiro() {
  const { transacoes, deleteTransacao, addTransacao } = useTransacoes();
  const ofxInputRef = useRef<HTMLInputElement>(null);

  const safeTransacoes = useMemo(() => Array.isArray(transacoes) ? transacoes : [], [transacoes]);
  const metricas = useMemo(() => {
    const receitasPagas = safeTransacoes
      .filter((t) => t.tipo === "receita" && t.status === "pago")
      .reduce((acc, t) => acc + Number(t.valor ?? 0), 0);
    const despesasPagas = safeTransacoes
      .filter((t) => t.tipo === "despesa" && t.status === "pago")
      .reduce((acc, t) => acc + Number(t.valor ?? 0), 0);
    const contasReceber = safeTransacoes
      .filter((t) => t.tipo === "receita" && t.status === "pendente")
      .reduce((acc, t) => acc + Number(t.valor ?? 0), 0);
    const contasPagar = safeTransacoes
      .filter((t) => t.tipo === "despesa" && t.status === "pendente")
      .reduce((acc, t) => acc + Number(t.valor ?? 0), 0);
    const lucroLiquido = receitasPagas - despesasPagas;
    const margem = receitasPagas > 0 ? Math.round((lucroLiquido / receitasPagas) * 100) : 0;

    return {
      receitasPagas,
      despesasPagas,
      lucroLiquido,
      contasReceber,
      contasPagar,
      margem,
      receitasPendentes: safeTransacoes.filter((t) => t.tipo === "receita" && t.status === "pendente").length,
      despesasPendentes: safeTransacoes.filter((t) => t.tipo === "despesa" && t.status === "pendente").length,
    };
  }, [safeTransacoes]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; transacao?: Transacao }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; transactionId?: string }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; transacao?: Transacao }>({ open: false });

  useEditQueryParam(
    "edit",
    transacoes,
    useCallback((transacao: Transacao) => setFormModal({ open: true, mode: "edit", transacao }), []),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [categoryFilter, setCategoryFilter] = useState("all-category");

  const handleOFXUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".ofx")) {
      toast.error("Por favor, selecione um arquivo OFX válido");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const transactions = parseOFXContent(content);
        if (transactions.length === 0) {
          toast.error("Nenhuma transação encontrada no arquivo OFX");
          return;
        }
        let successCount = 0;
        let errorCount = 0;
        for (const tx of transactions) {
          try {
            await addTransacao.mutateAsync(tx);
            successCount++;
          } catch {
            errorCount++;
          }
        }
        if (successCount > 0) toast.success(`${successCount} transação(ões) importada(s) com sucesso!`);
        if (errorCount > 0) toast.error(`${errorCount} transação(ões) falharam ao importar`);
      } catch {
        toast.error("Erro ao processar arquivo OFX");
      }
    };
    reader.readAsText(file);
    if (ofxInputRef.current) ofxInputRef.current.value = "";
  };

  const parseOFXContent = (content: string): Array<{
    descricao: string; valor: number; data: string; tipo: string;
    categoria: string; status: string; artista_id: string | null;
    cliente_id: string | null; origem: any; venda_id: string | null;
  }> => {
    const transactions: Array<{
      descricao: string; valor: number; data: string; tipo: string;
      categoria: string; status: string; artista_id: string | null;
      cliente_id: string | null; origem: any; venda_id: string | null;
    }> = [];
    const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    while ((match = stmttrnRegex.exec(content)) !== null) {
      const block = match[1];
      const trnamt = block.match(/<TRNAMT>([^<\n]+)/i)?.[1]?.trim();
      const dtposted = block.match(/<DTPOSTED>([^<\n]+)/i)?.[1]?.trim();
      const memo = block.match(/<MEMO>([^<\n]+)/i)?.[1]?.trim() ||
        block.match(/<NAME>([^<\n]+)/i)?.[1]?.trim() || "Transação importada";
      if (trnamt && dtposted) {
        const valor = parseFloat(trnamt.replace(",", "."));
        const year = dtposted.substring(0, 4);
        const month = dtposted.substring(4, 6);
        const day = dtposted.substring(6, 8);
        transactions.push({
          descricao: memo, valor: Math.abs(valor),
          data: `${year}-${month}-${day}`,
          tipo: valor >= 0 ? "receita" : "despesa",
          categoria: "outros", status: "pago",
          artista_id: null, cliente_id: null,
          origem: "manual" as any, venda_id: null,
        });
      }
    }
    return transactions;
  };

  const filteredTransacoes = useMemo(() => {
    return safeTransacoes.filter((transacao) => {
      const descricao = String(transacao.descricao ?? "");
      const categoria = String(transacao.categoria ?? "");
      const status = String(transacao.status ?? "");
      const data = String(transacao.data ?? "");
      const matchesSearch =
        descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        typeFilter === "all-type" ||
        (typeFilter === "receita" && transacao.tipo === "receita") ||
        (typeFilter === "despesa" && transacao.tipo === "despesa");
      const matchesStatus = statusFilter === "all-status" || status.toLowerCase() === statusFilter.toLowerCase();
      const matchesCategory = categoryFilter === "all-category" || categoria.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStartDate = !startDate || data >= startDate;
      const matchesEndDate = !endDate || data <= endDate;
      return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesStartDate && matchesEndDate;
    });
  }, [safeTransacoes, searchTerm, typeFilter, statusFilter, categoryFilter, startDate, endDate]);

  const hasActiveFilters =
    searchTerm !== "" || typeFilter !== "all-type" || statusFilter !== "all-status" ||
    categoryFilter !== "all-category" || startDate !== "" || endDate !== "";

  const { page, pageSize, total, pageItems, setPage, setPageSize } = usePagination(filteredTransacoes, 10);

  const handleClearFilters = () => {
    setSearchTerm(""); setStartDate(""); setEndDate("");
    setTypeFilter("all-type"); setStatusFilter("all-status"); setCategoryFilter("all-category");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransacoes.length && filteredTransacoes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransacoes.map((t: any) => t.id));
    }
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteTransacao.mutate(id));
    toast.success(`${selectedIds.length} transação(ões) excluída(s) com sucesso`);
    setSelectedIds([]);
  };

  const handleDelete = () => {
    if (deleteModal.transacao) {
      deleteTransacao.mutate(deleteModal.transacao.id);
      setDeleteModal({ open: false });
    }
  };

  return (
    <FeatureGate feature="moduleAccounting" featureName="Financeiro">
    <MainLayout
      title="Financeiro"
      description="Controle financeiro e fluxo de caixa"
      actions={
        <>
          <input type="file" ref={ofxInputRef} accept=".ofx" className="hidden" onChange={handleOFXUpload} />
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => ofxInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Importar OFX
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link to="/accounting/rules">
              <FileText className="h-3.5 w-3.5" /> Regras
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link to="/accounting/categorias">
              <Tags className="h-3.5 w-3.5" /> Categorias Financeiras
            </Link>
          </Button>
          <RequirePermission module="accounting" action="write">
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFormModal({ open: true, mode: "create" })}>
              <Plus className="h-3.5 w-3.5" /> Nova Transação
            </Button>
          </RequirePermission>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Receita Mensal"
            value={formatCurrency(metricas.receitasPagas)}
            description="receitas pagas"
            icon={TrendingUp}
            accent="success"
          />
          <MetricCard
            title="Despesas Mensais"
            value={formatCurrency(-metricas.despesasPagas)}
            description="despesas pagas"
            icon={TrendingDown}
            accent="destructive"
          />
          <MetricCard
            title="Lucro Líquido"
            value={formatCurrency(metricas.lucroLiquido)}
            description={`margem ${metricas.margem}%`}
            icon={DollarSign}
            accent={metricas.lucroLiquido >= 0 ? "success" : "destructive"}
          />
          <MetricCard
            title="Contas a Receber"
            value={formatCurrency(metricas.contasReceber)}
            description={`${metricas.receitasPendentes} pendentes`}
            icon={TrendingUp}
            accent="warning"
          />
          <MetricCard
            title="Contas a Pagar"
            value={formatCurrency(-metricas.contasPagar)}
            description={`${metricas.despesasPendentes} pendentes`}
            icon={FileText}
            accent="warning"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 p-3">
          {/* Seletor de datas — sempre imediatamente à esquerda da busca */}
          <DatePickerField
            value={startDate}
            onChange={setStartDate}
            placeholder="Data início"
            className="h-8 text-xs w-[150px]"
            data-testid="datepicker-start-date"
          />
          <DatePickerField
            value={endDate}
            onChange={setEndDate}
            placeholder="Data fim"
            className="h-8 text-xs w-[150px]"
            data-testid="datepicker-end-date"
          />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar transações…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-type">Todos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-auto min-w-[140px] max-w-[200px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-category">Todas</SelectItem>
              <SelectItem value="recebimentos externos de direitos">Recebimentos externos de direitos</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="shows">Shows</SelectItem>
              <SelectItem value="licenciamento">Licenciamento</SelectItem>
              <SelectItem value="operacional">Operacional</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={handleClearFilters}>
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredTransacoes.length} de {safeTransacoes.length} transações
            </span>
          )}
        </div>

        {/* ── Transactions Card ── */}
        <Card>
          <CardContent className="pt-0">
            <ListSectionHeader
              title="Transações"
              count={filteredTransacoes.length}
              description="Fluxo de receitas e despesas"
              action={
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Checkbox
                    checked={selectedIds.length === filteredTransacoes.length && filteredTransacoes.length > 0}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                    aria-label="Selecionar todos"
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.length > 0 ? `${selectedIds.length} selecionada(s)` : "Selecionar todos"}
                  </span>
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir ({selectedIds.length})
                    </Button>
                  )}
                </div>
              }
            />

            {filteredTransacoes.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title={hasActiveFilters ? "Nenhuma transação encontrada" : "Nenhuma transação cadastrada"}
                description={
                  hasActiveFilters
                    ? "Nenhuma transação corresponde aos filtros aplicados."
                    : "Crie sua primeira transação ou importe um arquivo OFX."
                }
                actionLabel={hasActiveFilters ? undefined : "Nova Transação"}
                onAction={hasActiveFilters ? undefined : () => setFormModal({ open: true, mode: "create" })}
              />
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]"></TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((transacao) => {
                    const tipo = transacao.tipo === "receita" ? "receita" : "despesa";
                    const descricao = String(transacao.descricao ?? "Transação sem descrição");
                    const categoria = String(transacao.categoria ?? "sem_categoria");
                    const data = String(transacao.data ?? "");
                    const valor = Number(transacao.valor ?? 0);

                    return (
                    <TableRow key={transacao.id} data-testid={`row-transacao-${transacao.id}`} className={selectedIds.includes(transacao.id) ? "bg-muted/20" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(transacao.id)}
                          onCheckedChange={() => toggleSelect(transacao.id)}
                          data-testid={`checkbox-transacao-${transacao.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center",
                          tipo === "receita"
                            ? "bg-success/10 border border-success/20"
                            : "bg-destructive/10 border border-destructive/20"
                        )}>
                          {tipo === "receita"
                            ? <TrendingUp className="h-3.5 w-3.5 text-success" />
                            : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                          }
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{descricao}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatCategoryLabel(categoria)}</TableCell>
                      <TableCell><StatusBadge status={transacao.status ?? "pendente"} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{data ? formatDate(data) : "—"}</TableCell>
                      <TableCell className={cn(
                        "text-right text-sm",
                        valor === 0 ? "text-muted-foreground" : tipo === "receita" ? "text-success" : "text-destructive"
                      )}>
                        {valor === 0 ? "" : tipo === "receita" ? "+" : "−"}{formatCurrency(valor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              aria-label="Ações da transação"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewModal({ open: true, transactionId: transacao.id })}>
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", transacao })}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteModal({ open: true, transacao })}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
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
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="transações"
              />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <TransacaoViewModal
        open={viewModal.open}
        onOpenChange={(open) => setViewModal(open ? viewModal : { open: false })}
        transactionId={viewModal.transactionId}
      />
      <TransacaoFormModal
        open={formModal.open}
        onOpenChange={(open) => setFormModal({ ...formModal, open })}
        transacao={formModal.transacao as any}
        mode={formModal.mode}
      />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Transação"
        description="Tem certeza que deseja excluir esta transação?"
        onConfirm={handleDelete}
      />
    </MainLayout>
    </FeatureGate>
  );
}
