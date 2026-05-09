import { useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  BarChart, TrendingUp, TrendingDown, DollarSign, Download, Loader2, PieChart,
} from "lucide-react";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { formatCurrency } from "@/shared/lib/format-utils";
import { exportToCSV } from "@/shared/lib/csv";

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export default function RelatoriosContabil() {
  const { transacoes, isLoading } = useTransacoes();
  const { artistas } = useArtistas();

  const receitas = transacoes.filter((t: any) => t.tipo === "receita");
  const despesas = transacoes.filter((t: any) => t.tipo === "despesa");

  const totalReceitas = receitas.reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
  const totalDespesas = despesas.reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  const porCategoria = useMemo(() => {
    const groups = groupBy(transacoes, (t: any) => t.categoria ?? "Sem categoria");
    return Object.entries(groups)
      .map(([cat, items]) => {
        const receita = items.filter((t: any) => t.tipo === "receita").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
        const despesa = items.filter((t: any) => t.tipo === "despesa").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
        return { categoria: cat, receita, despesa, saldo: receita - despesa };
      })
      .sort((a, b) => Math.abs(b.receita + b.despesa) - Math.abs(a.receita + a.despesa));
  }, [transacoes]);

  const porArtista = useMemo(() => {
    return artistas
      .map((a: any) => {
        const ts = transacoes.filter((t: any) => t.artista_id === a.id);
        const rec = ts.filter((t: any) => t.tipo === "receita").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
        const desp = ts.filter((t: any) => t.tipo === "despesa").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
        return { nome: a.nome_artistico ?? a.nome ?? "—", receita: rec, despesa: desp, saldo: rec - desp };
      })
      .filter((a) => a.receita > 0 || a.despesa > 0)
      .sort((a, b) => b.saldo - a.saldo);
  }, [transacoes, artistas]);

  const handleExport = () => {
    exportToCSV(
      porCategoria,
      [
        { key: "categoria", label: "Categoria" },
        { key: "receita", label: "Receitas (R$)" },
        { key: "despesa", label: "Despesas (R$)" },
        { key: "saldo", label: "Saldo (R$)" },
      ],
      "relatorio-por-categoria",
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const headerActions = (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} data-testid="button-export">
      <Download className="h-4 w-4" /> Exportar
    </Button>
  );

  return (
    <MainLayout title="Relatórios Financeiros" actions={headerActions}>
      <div className="space-y-6">

        {/* Resumo geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receitas</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="metric-receitas">{formatCurrency(totalReceitas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-lg font-bold text-destructive" data-testid="metric-despesas">{formatCurrency(totalDespesas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${lucroLiquido >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                  <DollarSign className={`h-5 w-5 ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                  <p className={`text-lg font-bold ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`} data-testid="metric-lucro">{formatCurrency(lucroLiquido)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margem Líquida</p>
                  <p className="text-lg font-bold text-foreground" data-testid="metric-margem">{margemLiquida.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Por categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receitas vs Despesas por Categoria</CardTitle>
            <CardDescription>Breakdown financeiro por categoria de transação</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receitas</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Despesas</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {porCategoria.map((c, i) => (
                    <tr key={c.categoria} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`} data-testid={`row-cat-${i}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{c.categoria}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-mono">{c.receita > 0 ? formatCurrency(c.receita) : "—"}</td>
                      <td className="px-4 py-3 text-right text-destructive font-mono">{c.despesa > 0 ? formatCurrency(c.despesa) : "—"}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${c.saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                        {c.saldo >= 0 ? "+" : ""}{formatCurrency(c.saldo)}
                      </td>
                    </tr>
                  ))}
                  {porCategoria.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum dado disponível</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Por artista */}
        {porArtista.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resultado por Artista</CardTitle>
              <CardDescription>Receitas, despesas e saldo líquido por artista</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Artista</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receitas</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Despesas</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porArtista.map((a, i) => (
                      <tr key={a.nome} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`} data-testid={`row-artista-${i}`}>
                        <td className="px-4 py-3 font-medium text-foreground">{a.nome}</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-mono">{a.receita > 0 ? formatCurrency(a.receita) : "—"}</td>
                        <td className="px-4 py-3 text-right text-destructive font-mono">{a.despesa > 0 ? formatCurrency(a.despesa) : "—"}</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${a.saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                          {a.saldo >= 0 ? "+" : ""}{formatCurrency(a.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
