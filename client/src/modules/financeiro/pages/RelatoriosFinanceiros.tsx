import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Download, TrendingUp, TrendingDown, BarChart3, PieChart } from "lucide-react";
import { useTransacoes } from "@/modules/financeiro/hooks/useTransacoes";
import { formatCurrency } from "@/shared/lib/format-utils";
import { exportToCSV } from "@/shared/lib/csv";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

type Periodo = "1m" | "3m" | "6m" | "12m";

interface CategoriaItem {
  categoria: string;
  valor: number;
  count: number;
  percentual: number;
}

function RelatorioSkeleton() {
  return (
    <MainLayout title="Relatórios" description="Relatórios financeiros simples">
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-48 w-full" /></CardContent></Card>
        ))}
      </div>
    </MainLayout>
  );
}

function CategoriaBar({ item, max }: { item: CategoriaItem; max: number }) {
  const pct = max > 0 ? (item.valor / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3" data-testid={`categoria-bar-${item.categoria}`}>
      <div className="w-32 shrink-0 text-xs text-muted-foreground truncate capitalize" title={item.categoria}>
        {item.categoria || "Outros"}
      </div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-28 text-right text-xs font-mono font-medium shrink-0">{formatCurrency(item.valor)}</div>
      <Badge variant="outline" className="text-[10px] font-mono shrink-0 w-12 justify-center">{item.percentual}%</Badge>
    </div>
  );
}

export default function RelatoriosFinanceiros() {
  const { transacoes, isLoading } = useTransacoes();
  const [periodo, setPeriodo] = useState<Periodo>("3m");
  const [tipoView, setTipoView] = useState<"receitas" | "despesas">("receitas");

  const { inicio, fim } = useMemo(() => {
    const n = parseInt(periodo);
    return {
      inicio: startOfMonth(subMonths(new Date(), n - 1)),
      fim: endOfMonth(new Date()),
    };
  }, [periodo]);

  const txFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      if (!t.data) return false;
      try {
        const d = parseISO(t.data);
        return isWithinInterval(d, { start: inicio, end: fim });
      } catch { return false; }
    });
  }, [transacoes, inicio, fim]);

  const totais = useMemo(() => {
    const receitas = txFiltradas.filter(t => t.tipo === "receita").reduce((s, t) => s + (t.valor || 0), 0);
    const despesas = txFiltradas.filter(t => t.tipo === "despesa").reduce((s, t) => s + (t.valor || 0), 0);
    return { receitas, despesas, resultado: receitas - despesas, count: txFiltradas.length };
  }, [txFiltradas]);

  const categorias = useMemo<CategoriaItem[]>(() => {
    const tipo = tipoView === "receitas" ? "receita" : "despesa";
    const txTipo = txFiltradas.filter(t => t.tipo === tipo);
    const totalTipo = txTipo.reduce((s, t) => s + (t.valor || 0), 0);

    const map = new Map<string, { valor: number; count: number }>();
    for (const t of txTipo) {
      const cat = (t.categoria as string) || "outros";
      const existing = map.get(cat) ?? { valor: 0, count: 0 };
      map.set(cat, { valor: existing.valor + (t.valor || 0), count: existing.count + 1 });
    }

    return Array.from(map.entries())
      .map(([categoria, { valor, count }]) => ({
        categoria,
        valor,
        count,
        percentual: totalTipo > 0 ? Math.round((valor / totalTipo) * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [txFiltradas, tipoView]);

  const maxCatVal = useMemo(() => Math.max(...categorias.map(c => c.valor), 1), [categorias]);

  const comparativo = useMemo(() => {
    const mesesLabels = [];
    const n = parseInt(periodo);
    for (let i = n - 1; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const mesInicio = startOfMonth(mes);
      const mesFim = endOfMonth(mes);
      const txMes = transacoes.filter(t => {
        if (!t.data) return false;
        try { return isWithinInterval(parseISO(t.data), { start: mesInicio, end: mesFim }); }
        catch { return false; }
      });
      mesesLabels.push({
        label: format(mes, "MMM/yy", { locale: ptBR }),
        receitas: txMes.filter(t => t.tipo === "receita").reduce((s, t) => s + (t.valor || 0), 0),
        despesas: txMes.filter(t => t.tipo === "despesa").reduce((s, t) => s + (t.valor || 0), 0),
      });
    }
    return mesesLabels;
  }, [transacoes, periodo]);

  const handleExportCategorias = () => {
    exportToCSV(
      categorias.map(c => ({ categoria: c.categoria, valor: c.valor.toFixed(2), transacoes: c.count, percentual: `${c.percentual}%` })),
      [
        { key: "categoria", label: "Categoria" },
        { key: "valor", label: "Valor (R$)" },
        { key: "transacoes", label: "Transações" },
        { key: "percentual", label: "% do Total" },
      ],
      `relatorio-${tipoView}-por-categoria`,
    );
  };

  const handleExportComparativo = () => {
    exportToCSV(
      comparativo.map(m => ({ mes: m.label, receitas: m.receitas.toFixed(2), despesas: m.despesas.toFixed(2), resultado: (m.receitas - m.despesas).toFixed(2) })),
      [
        { key: "mes", label: "Mês" },
        { key: "receitas", label: "Receitas (R$)" },
        { key: "despesas", label: "Despesas (R$)" },
        { key: "resultado", label: "Resultado (R$)" },
      ],
      "relatorio-comparativo-mensal",
    );
  };

  if (isLoading) return <RelatorioSkeleton />;

  const periodoLabel = periodo === "1m" ? "este mês" : `últimos ${periodo.replace("m", "")} meses`;

  return (
    <MainLayout
      title="Relatórios"
      description="Análise financeira por período"
      actions={
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">Este mês</SelectItem>
            <SelectItem value="3m">3 meses</SelectItem>
            <SelectItem value="6m">6 meses</SelectItem>
            <SelectItem value="12m">12 meses</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">

        {/* ── Resumo do período ── */}
        <div className="grid gap-4 sm:grid-cols-3" data-testid="relatorio-resumo">
          <Card className="border-t-2 border-t-success">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receitas</p>
              <p className="text-2xl font-mono font-semibold text-success mt-1.5">{formatCurrency(totais.receitas)}</p>
              <p className="text-xs text-muted-foreground mt-1">{periodoLabel}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-destructive">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Despesas</p>
              <p className="text-2xl font-mono font-semibold text-destructive mt-1.5">{formatCurrency(totais.despesas)}</p>
              <p className="text-xs text-muted-foreground mt-1">{periodoLabel}</p>
            </CardContent>
          </Card>
          <Card className={cn("border-t-2", totais.resultado >= 0 ? "border-t-primary" : "border-t-destructive")}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado Líquido</p>
              <p className={cn("text-2xl font-mono font-semibold mt-1.5", totais.resultado >= 0 ? "text-success" : "text-destructive")}>
                {totais.resultado >= 0 ? "+" : ""}{formatCurrency(totais.resultado)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{totais.count} transações</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Breakdown por categoria ── */}
        <Card data-testid="relatorio-categorias">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  Breakdown por Categoria
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">{periodoLabel}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md overflow-hidden border border-border">
                  <button
                    className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tipoView === "receitas" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50")}
                    onClick={() => setTipoView("receitas")}
                    data-testid="tab-receitas"
                  >
                    <TrendingUp className="h-3 w-3 inline mr-1" />Receitas
                  </button>
                  <button
                    className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tipoView === "despesas" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50")}
                    onClick={() => setTipoView("despesas")}
                    data-testid="tab-despesas"
                  >
                    <TrendingDown className="h-3 w-3 inline mr-1" />Despesas
                  </button>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportCategorias}>
                  <Download className="h-3 w-3" /> CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma {tipoView === "receitas" ? "receita" : "despesa"} no período
              </div>
            ) : (
              <div className="space-y-3">
                {categorias.map(item => (
                  <CategoriaBar key={item.categoria} item={item} max={maxCatVal} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Comparativo mensal ── */}
        <Card data-testid="relatorio-comparativo">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Comparativo Mensal
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Receitas x Despesas x Resultado</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportComparativo}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mês</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receitas</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Despesas</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {comparativo.map(m => {
                    const res = m.receitas - m.despesas;
                    const margem = m.receitas > 0 ? Math.round((res / m.receitas) * 100) : 0;
                    return (
                      <tr key={m.label} className="hover:bg-muted/20 transition-colors" data-testid={`comparativo-row-${m.label}`}>
                        <td className="px-4 py-3 text-sm font-medium capitalize">{m.label}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-success">{m.receitas > 0 ? formatCurrency(m.receitas) : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-destructive">{m.despesas > 0 ? formatCurrency(m.despesas) : <span className="text-muted-foreground">—</span>}</td>
                        <td className={cn("px-4 py-3 text-right font-mono text-sm font-medium", res >= 0 ? "text-success" : "text-destructive")}>
                          {res === 0 ? <span className="text-muted-foreground">—</span> : `${res > 0 ? "+" : ""}${formatCurrency(res)}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.receitas > 0 ? (
                            <Badge
                              variant="outline"
                              className={cn("font-mono text-[10px]", margem >= 0 ? "border-success/40 text-success" : "border-destructive/40 text-destructive")}
                            >
                              {margem}%
                            </Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
