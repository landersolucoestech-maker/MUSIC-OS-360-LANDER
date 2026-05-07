import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { CheckCircle2, Circle, Search, TrendingUp, TrendingDown, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useTransacoes } from "@/modules/financeiro/hooks/useTransacoes";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

type FilterConciliado = "todos" | "pendente" | "conciliado";

export default function Conciliacao() {
  const { transacoes, isLoading, updateTransacao } = useTransacoes();
  const [search, setSearch] = useState("");
  const [filterConciliado, setFilterConciliado] = useState<FilterConciliado>("todos");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return transacoes.filter(t => {
      const matchSearch =
        t.descricao.toLowerCase().includes(search.toLowerCase()) ||
        (t.categoria ?? "").toLowerCase().includes(search.toLowerCase());
      const isConciliado = !!t.conciliado;
      if (filterConciliado === "conciliado" && !isConciliado) return false;
      if (filterConciliado === "pendente" && isConciliado) return false;
      return matchSearch;
    });
  }, [transacoes, search, filterConciliado]);

  const counts = useMemo(() => ({
    total: transacoes.length,
    conciliados: transacoes.filter(t => t.conciliado).length,
    pendentes: transacoes.filter(t => !t.conciliado).length,
  }), [transacoes]);

  const handleToggle = async (id: string, current: boolean) => {
    setLoadingId(id);
    try {
      await updateTransacao.mutateAsync({ id, conciliado: !current });
      toast.success(!current ? "Transação marcada como conciliada" : "Conciliação removida");
    } catch {
      toast.error("Erro ao atualizar conciliação");
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarcarTodos = async () => {
    const pendentes = filtered.filter(t => !t.conciliado);
    if (pendentes.length === 0) return;
    for (const t of pendentes) {
      await updateTransacao.mutateAsync({ id: t.id, conciliado: true });
    }
    toast.success(`${pendentes.length} transação(ões) conciliada(s)`);
  };

  return (
    <MainLayout
      title="Conciliação"
      description="Confirme e reconcilie lançamentos com o extrato bancário"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleMarcarTodos}
          disabled={filterConciliado === "conciliado" || counts.pendentes === 0}
          data-testid="button-marcar-todos"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Conciliar visíveis
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            onClick={() => setFilterConciliado("todos")}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              filterConciliado === "todos"
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card hover:border-border/80"
            )}
            data-testid="kpi-todos"
          >
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold text-foreground">{counts.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">transações</p>
          </button>
          <button
            onClick={() => setFilterConciliado("conciliado")}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              filterConciliado === "conciliado"
                ? "border-success/40 bg-success/5"
                : "border-border bg-card hover:border-border/80"
            )}
            data-testid="kpi-conciliados"
          >
            <p className="text-xs text-muted-foreground mb-1">Conciliadas</p>
            <p className="text-2xl font-bold text-success">{counts.conciliados}</p>
            <p className="text-xs text-muted-foreground mt-0.5">confirmadas</p>
          </button>
          <button
            onClick={() => setFilterConciliado("pendente")}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              filterConciliado === "pendente"
                ? "border-warning/40 bg-warning/5"
                : "border-border bg-card hover:border-border/80"
            )}
            data-testid="kpi-pendentes"
          >
            <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
            <p className="text-2xl font-bold text-warning">{counts.pendentes}</p>
            <p className="text-xs text-muted-foreground mt-0.5">aguardando</p>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar descrição ou categoria..."
              className="pl-9 h-8 text-sm bg-card border-border"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select value={filterConciliado} onValueChange={v => setFilterConciliado(v as FilterConciliado)}>
            <SelectTrigger className="w-[160px] h-8 text-sm bg-card border-border" data-testid="select-filter-conciliado">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="conciliado">Conciliadas</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {filtered.length} de {transacoes.length}
          </span>
        </div>

        {/* List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Transações</CardTitle>
            <CardDescription className="text-xs">
              Clique no ícone para marcar/desmarcar como conciliado
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma transação encontrada.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {filtered.map(t => {
                  const isConciliado = !!t.conciliado;
                  const isPending = loadingId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center gap-4 py-3 -mx-1 px-1 rounded-md transition-colors",
                        isConciliado ? "bg-success/5 hover:bg-success/10" : "hover:bg-muted/30"
                      )}
                      data-testid={`row-conciliacao-${t.id}`}
                    >
                      {/* Toggle button */}
                      <button
                        onClick={() => handleToggle(t.id, isConciliado)}
                        disabled={isPending}
                        className={cn(
                          "shrink-0 transition-colors",
                          isConciliado ? "text-success hover:text-success/70" : "text-muted-foreground hover:text-foreground"
                        )}
                        data-testid={`btn-toggle-${t.id}`}
                        title={isConciliado ? "Remover conciliação" : "Marcar como conciliado"}
                      >
                        {isPending ? (
                          <Circle className="h-5 w-5 animate-pulse" />
                        ) : isConciliado ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      {/* Tipo icon */}
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        t.tipo === "receita"
                          ? "bg-success/10 border border-success/20"
                          : "bg-destructive/10 border border-destructive/20"
                      )}>
                        {t.tipo === "receita"
                          ? <TrendingUp className="h-3.5 w-3.5 text-success" />
                          : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium leading-tight truncate",
                          isConciliado && "text-muted-foreground"
                        )}>
                          {t.descricao}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm font-mono">
                            {t.categoria ?? "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{formatDate(t.data)}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      {isConciliado && (
                        <Badge className="bg-success/15 text-success border-success/30 text-[10px] shrink-0">
                          Conciliado
                        </Badge>
                      )}

                      {/* Value */}
                      <div className="text-right shrink-0 min-w-[90px]">
                        <span className={cn(
                          "text-sm font-semibold font-mono",
                          t.tipo === "receita" ? "text-success" : "text-destructive"
                        )}>
                          {t.tipo === "receita" ? "+" : "−"}{formatCurrency(t.valor)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
