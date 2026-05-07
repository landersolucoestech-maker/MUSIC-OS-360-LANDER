import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  CheckCircle2, Circle, Search, TrendingUp, TrendingDown,
  Filter, CheckSquare, AlertTriangle, X,
} from "lucide-react";
import { useTransacoes } from "@/modules/financeiro/hooks/useTransacoes";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { EmptyState } from "@/shared/components/EmptyState";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";
import { toast } from "sonner";

type FiltroStatus = "todos" | "pendente" | "conciliado";

function ConciliacaoSkeleton() {
  return (
    <MainLayout title="Conciliação" description="Conciliação manual de transações">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    </MainLayout>
  );
}

export default function Conciliacao() {
  const { transacoes, isLoading, updateTransacao } = useTransacoes();

  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const filtered = useMemo(() => {
    return transacoes.filter(t => {
      const matchSearch =
        !search ||
        t.descricao?.toLowerCase().includes(search.toLowerCase()) ||
        (t.categoria as string)?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "conciliado" && !!t.conciliado) ||
        (filtroStatus === "pendente" && !t.conciliado);

      const matchTipo =
        filtroTipo === "todos" ||
        t.tipo === filtroTipo;

      return matchSearch && matchStatus && matchTipo;
    });
  }, [transacoes, search, filtroStatus, filtroTipo]);

  const stats = useMemo(() => {
    const total = transacoes.length;
    const conciliadas = transacoes.filter(t => t.conciliado).length;
    const pendentes = total - conciliadas;
    const valorPendente = transacoes
      .filter(t => !t.conciliado)
      .reduce((s, t) => s + (t.valor || 0), 0);
    return { total, conciliadas, pendentes, valorPendente };
  }, [transacoes]);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () => {
    const notConciliados = filtered.filter(t => !t.conciliado).map(t => t.id);
    if (selectedIds.length === notConciliados.length && notConciliados.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notConciliados);
    }
  };

  const handleMarcarConciliado = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsUpdating(true);
    try {
      await Promise.all(ids.map(id => updateTransacao.mutateAsync({ id, data: { conciliado: true } as any })));
      setSelectedIds([]);
      toast.success(`${ids.length} transação(ões) marcada(s) como conciliada(s)`);
    } catch {
      toast.error("Erro ao conciliar transações");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDesmarcarConciliado = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsUpdating(true);
    try {
      await Promise.all(ids.map(id => updateTransacao.mutateAsync({ id, data: { conciliado: false } as any })));
      setSelectedIds([]);
      toast.success(`${ids.length} transação(ões) desmarcada(s)`);
    } catch {
      toast.error("Erro ao desmarcar transações");
    } finally {
      setIsUpdating(false);
    }
  };

  const hasFilters = search || filtroStatus !== "todos" || filtroTipo !== "todos";

  if (isLoading) return <ConciliacaoSkeleton />;

  const notConciliadosFiltered = filtered.filter(t => !t.conciliado);

  return (
    <MainLayout
      title="Conciliação"
      description="Conciliação manual de transações financeiras"
    >
      <div className="space-y-6">

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-3" data-testid="conciliacao-kpis">
          <Card className="border-t-2 border-t-success">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conciliadas</p>
                  <p className="text-3xl font-mono font-semibold text-foreground mt-1">{stats.conciliadas}</p>
                  <p className="text-xs text-muted-foreground mt-1">de {stats.total} transações</p>
                </div>
                <div className="p-2.5 bg-success/10 border border-success/20 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-warning">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pendentes</p>
                  <p className="text-3xl font-mono font-semibold text-foreground mt-1">{stats.pendentes}</p>
                  <p className="text-xs text-muted-foreground mt-1">aguardando conciliação</p>
                </div>
                <div className="p-2.5 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-muted">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor Pendente</p>
                  <p className="text-2xl font-mono font-semibold text-foreground mt-1">{formatCurrency(stats.valorPendente)}</p>
                  <p className="text-xs text-muted-foreground mt-1">a conciliar</p>
                </div>
                <div className="p-2.5 bg-muted border border-border rounded-lg">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Filtros ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar descrição ou categoria…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-busca"
            />
          </div>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="conciliado">Conciliadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[130px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground"
              onClick={() => { setSearch(""); setFiltroStatus("todos"); setFiltroTipo("todos"); }}
            >
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} de {transacoes.length} transações
          </span>
        </div>

        {/* ── Lista de transações ── */}
        <Card data-testid="conciliacao-lista">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Transações</CardTitle>
                <CardDescription className="text-xs mt-0.5">Marque as transações como conciliadas manualmente</CardDescription>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedIds.length} selecionada(s)</span>
                  <Button
                    size="sm" className="h-7 text-xs gap-1.5"
                    onClick={() => handleMarcarConciliado(selectedIds)}
                    disabled={isUpdating}
                    data-testid="btn-conciliar-selecionadas"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Conciliar ({selectedIds.length})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filtered.length > 0 && notConciliadosFiltered.length > 0 && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <Checkbox
                  checked={selectedIds.length === notConciliadosFiltered.length && notConciliadosFiltered.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-xs text-muted-foreground">Selecionar pendentes</span>
              </div>
            )}

            {filtered.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nenhuma transação encontrada"
                description={hasFilters ? "Ajuste os filtros para ver mais resultados." : "Nenhuma transação cadastrada."}
              />
            ) : (
              <div className="divide-y divide-border/60">
                {filtered.map(t => {
                  const isReceita = t.tipo === "receita";
                  const isConciliado = !!t.conciliado;
                  const isSelected = selectedIds.includes(t.id);

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center gap-3 py-3 first:pt-0 -mx-1 px-1 rounded-md transition-colors",
                        isConciliado ? "opacity-60" : "hover:bg-muted/30",
                        isSelected && "bg-primary/5",
                      )}
                      data-testid={`row-conciliacao-${t.id}`}
                    >
                      {!isConciliado ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(t.id)}
                          data-testid={`checkbox-${t.id}`}
                          className="shrink-0"
                        />
                      ) : (
                        <div className="w-4 h-4 shrink-0" />
                      )}

                      {/* Tipo icon */}
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        isReceita ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
                      )}>
                        {isReceita
                          ? <TrendingUp className="h-3.5 w-3.5 text-success" />
                          : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{t.descricao}</p>
                          {isConciliado && (
                            <Badge className="bg-success/10 text-success border-success/30 text-[10px] shrink-0">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Conciliado
                            </Badge>
                          )}
                          {t.origem === "ofx" && !isConciliado && (
                            <Badge variant="outline" className="text-[10px] shrink-0">OFX</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm font-mono">
                            {(t.categoria as string) || "—"}
                          </span>
                          {t.data && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(t.data)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Valor */}
                      <div className="text-right shrink-0 min-w-[90px]">
                        <p className={cn(
                          "text-sm font-semibold font-mono",
                          isReceita ? "text-success" : "text-destructive"
                        )}>
                          {isReceita ? "+" : "−"}{formatCurrency(t.valor)}
                        </p>
                      </div>

                      {/* Ação */}
                      <div className="shrink-0">
                        {isConciliado ? (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground"
                            onClick={() => handleDesmarcarConciliado([t.id])}
                            disabled={isUpdating}
                            data-testid={`btn-desmarcar-${t.id}`}
                          >
                            <Circle className="h-3 w-3 mr-1" /> Desmarcar
                          </Button>
                        ) : (
                          <Button
                            variant="outline" size="sm" className="h-7 text-[10px] gap-1"
                            onClick={() => handleMarcarConciliado([t.id])}
                            disabled={isUpdating}
                            data-testid={`btn-conciliar-${t.id}`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Conciliar
                          </Button>
                        )}
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
