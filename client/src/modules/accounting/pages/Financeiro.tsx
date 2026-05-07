import { useCallback, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar as CalendarComponent } from "@/shared/ui/calendar";
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  Link as LinkIcon, Download, Plus, Search, Settings,
  Calendar, Upload, MoreHorizontal, Eye, Pencil, Trash2, X,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useMetrics } from "@/shared/hooks/useMetrics";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { TransacaoFormModal } from "@/modules/accounting/components/TransacaoFormModal";
import { TransacaoViewModal } from "@/modules/accounting/components/TransacaoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { MetricCard } from "@/shared/components/MetricCard";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { exportToCSV, CSVColumn } from "@/shared/lib/csv";
import { cn } from "@/shared/lib/utils";
import { FinanceiroSkeleton } from "@/shared/components/PageSkeletons";
import { toast } from "sonner";

type Transacao = Record<string, any>;

const transacaoColumns: CSVColumn[] = [
  { key: "descricao", label: "Descrição" },
  { key: "categoria", label: "Categoria" },
  { key: "status", label: "Status" },
  { key: "data", label: "Data" },
  { key: "valor", label: "Valor" },
  { key: "tipo", label: "Tipo" },
];

export default function Financeiro() {
  const { transacoes, isLoading: transacoesLoading, deleteTransacao, addTransacao } = useTransacoes();
  const { financeiroMetrics, isLoading: metricsLoading } = useMetrics();
  const ofxInputRef = useRef<HTMLInputElement>(null);

  const isLoading = transacoesLoading || metricsLoading;
  const metricas = financeiroMetrics;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; transacao?: Transacao }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; transacao?: Transacao }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; transacao?: Transacao }>({ open: false });

  useEditQueryParam(
    "edit",
    transacoes,
    useCallback((transacao: Transacao) => setFormModal({ open: true, mode: "edit", transacao }), []),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [categoryFilter, setCategoryFilter] = useState("all-category");

  const handleExport = () => exportToCSV(transacoes, transacaoColumns, "transacoes");

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
    return transacoes.filter((transacao) => {
      const matchesSearch =
        transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        typeFilter === "all-type" ||
        (typeFilter === "receita" && transacao.tipo === "receita") ||
        (typeFilter === "despesa" && transacao.tipo === "despesa");
      const matchesStatus = statusFilter === "all-status" || transacao.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesCategory = categoryFilter === "all-category" || transacao.categoria.toLowerCase() === categoryFilter.toLowerCase();
      const transacaoDate = new Date(transacao.data);
      const matchesStartDate = !startDate || transacaoDate >= startDate;
      const matchesEndDate = !endDate || transacaoDate <= endDate;
      return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesStartDate && matchesEndDate;
    });
  }, [transacoes, searchTerm, typeFilter, statusFilter, categoryFilter, startDate, endDate]);

  const hasActiveFilters =
    searchTerm !== "" || typeFilter !== "all-type" || statusFilter !== "all-status" ||
    categoryFilter !== "all-category" || startDate !== undefined || endDate !== undefined;

  const handleClearFilters = () => {
    setSearchTerm(""); setStartDate(undefined); setEndDate(undefined);
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

  if (isLoading) return <FinanceiroSkeleton />;

  return (
    <MainLayout
      title="Accounting"
      description="Controle financeiro e fluxo de caixa"
      actions={
        <>
          <input type="file" ref={ofxInputRef} accept=".ofx" className="hidden" onChange={handleOFXUpload} />
          <Link to="/financeiro/regras">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Regras
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => ofxInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Importar OFX
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" /> Integração Bancária
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFormModal({ open: true, mode: "create" })}>
            <Plus className="h-3.5 w-3.5" /> Nova Transação
          </Button>
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
            value={formatCurrency(metricas.despesasPagas)}
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
            value={formatCurrency(metricas.contasPagar)}
            description={`${metricas.despesasPendentes} pendentes`}
            icon={FileText}
            accent="warning"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar transações…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Date pickers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 text-xs gap-1.5 min-w-[120px]", !startDate && "text-muted-foreground")}
              >
                <Calendar className="h-3.5 w-3.5" />
                {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 text-xs gap-1.5 min-w-[120px]", !endDate && "text-muted-foreground")}
              >
                <Calendar className="h-3.5 w-3.5" />
                {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-type">Todos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-category">Todas</SelectItem>
              <SelectItem value="royalties">Royalties</SelectItem>
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
              {filteredTransacoes.length} de {transacoes.length} transações
            </span>
          )}
        </div>

        {/* ── Transactions Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Transações
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredTransacoes.length})</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Fluxo de receitas e despesas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Bulk select bar */}
            {filteredTransacoes.length > 0 && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <Checkbox
                  checked={selectedIds.length === filteredTransacoes.length && filteredTransacoes.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-xs text-muted-foreground flex-1">
                  {selectedIds.length > 0 ? `${selectedIds.length} selecionada(s)` : "Selecionar todas"}
                </span>
                {selectedIds.length > 0 && (
                  <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir ({selectedIds.length})
                  </Button>
                )}
              </div>
            )}

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
              <div className="divide-y divide-border/60">
                {filteredTransacoes.map((transacao) => (
                  <div
                    key={transacao.id}
                    className="flex items-center gap-4 py-3 first:pt-0 hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors"
                    data-testid={`row-transacao-${transacao.id}`}
                  >
                    <Checkbox
                      checked={selectedIds.includes(transacao.id)}
                      onCheckedChange={() => toggleSelect(transacao.id)}
                      data-testid={`checkbox-transacao-${transacao.id}`}
                      className="shrink-0"
                    />

                    {/* Tipo icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      transacao.tipo === "receita"
                        ? "bg-success/10 border border-success/20"
                        : "bg-destructive/10 border border-destructive/20"
                    )}>
                      {transacao.tipo === "receita"
                        ? <TrendingUp className="h-4 w-4 text-success" />
                        : <TrendingDown className="h-4 w-4 text-destructive" />
                      }
                    </div>

                    {/* Description + badge */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{transacao.descricao}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm font-mono">
                          {transacao.categoria}
                        </span>
                        <StatusBadge status={transacao.status} />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="hidden sm:block text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Data</p>
                      <p className="text-xs font-mono text-foreground">{formatDate(transacao.data)}</p>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0 min-w-[100px]">
                      <p className={cn(
                        "text-sm font-semibold font-mono",
                        transacao.tipo === "receita" ? "text-success" : "text-destructive"
                      )}>
                        {transacao.tipo === "receita" ? "+" : "−"}{formatCurrency(transacao.valor)}
                      </p>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewModal({ open: true, transacao })}>
                          <Eye className="h-3.5 w-3.5 mr-2" /> Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", transacao })}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteModal({ open: true, transacao })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TransacaoViewModal
        open={viewModal.open}
        onOpenChange={(open) => setViewModal({ ...viewModal, open })}
        transacao={viewModal.transacao as any}
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
  );
}
