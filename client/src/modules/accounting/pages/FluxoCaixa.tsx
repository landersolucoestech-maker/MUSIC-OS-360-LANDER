import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Download, Loader2 } from "lucide-react";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { formatCurrency } from "@/shared/lib/format-utils";
import { exportToCSV } from "@/shared/lib/csv";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const HOJE = new Date();

function mesLabel(ano: number, mes: number) {
  return `${MESES[mes - 1]} ${ano}`;
}

function parseAnoMes(data: string): { ano: number; mes: number } | null {
  const m = (data ?? "").match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return { ano: parseInt(m[1]), mes: parseInt(m[2]) };
}

export default function FluxoCaixa() {
  const { transacoes, isLoading } = useTransacoes();
  const [periodoFilter, setPeriodoFilter] = useState("ultimos6");

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    transacoes.forEach((t: any) => {
      const p = parseAnoMes(t.data);
      if (p) set.add(`${p.ano}-${String(p.mes).padStart(2, "0")}`);
    });
    return Array.from(set).sort().reverse();
  }, [transacoes]);

  const fluxo = useMemo(() => {
    const now = HOJE;
    const mesesSelecionados: string[] = [];

    if (periodoFilter === "ultimos3" || periodoFilter === "ultimos6" || periodoFilter === "ultimos12") {
      const n = periodoFilter === "ultimos3" ? 3 : periodoFilter === "ultimos6" ? 6 : 12;
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        mesesSelecionados.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    } else {
      mesesSelecionados.push(periodoFilter);
    }

    return mesesSelecionados.map((chave) => {
      const [ano, mes] = chave.split("-").map(Number);
      const doMes = transacoes.filter((t: any) => {
        const p = parseAnoMes(t.data);
        return p && p.ano === ano && p.mes === mes;
      });
      const receitas = doMes.filter((t: any) => t.tipo === "receita").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
      const despesas = doMes.filter((t: any) => t.tipo === "despesa").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
      return { chave, label: mesLabel(ano, mes), receitas, despesas, saldo: receitas - despesas };
    });
  }, [transacoes, periodoFilter]);

  const totalReceitas = fluxo.reduce((s, m) => s + m.receitas, 0);
  const totalDespesas = fluxo.reduce((s, m) => s + m.despesas, 0);
  const saldoGeral = totalReceitas - totalDespesas;

  const maxValor = Math.max(...fluxo.map((m) => Math.max(m.receitas, m.despesas)), 1);

  const handleExport = () => {
    exportToCSV(
      fluxo,
      [
        { key: "label", label: "Mês" },
        { key: "receitas", label: "Receitas (R$)" },
        { key: "despesas", label: "Despesas (R$)" },
        { key: "saldo", label: "Saldo (R$)" },
      ],
      "fluxo-caixa",
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
    <MainLayout title="Fluxo de Caixa" actions={headerActions}>
      <div className="space-y-6">

        {/* Período */}
        <div className="flex items-center gap-3">
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-52" data-testid="select-periodo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ultimos3">Últimos 3 meses</SelectItem>
              <SelectItem value="ultimos6">Últimos 6 meses</SelectItem>
              <SelectItem value="ultimos12">Últimos 12 meses</SelectItem>
              {mesesDisponiveis.map((m) => {
                const [ano, mes] = m.split("-").map(Number);
                return <SelectItem key={m} value={m}>{mesLabel(ano, mes)}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Receitas</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="metric-receitas">{formatCurrency(totalReceitas)}</p>
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
                  <p className="text-sm text-muted-foreground">Total Despesas</p>
                  <p className="text-xl font-bold text-destructive" data-testid="metric-despesas">{formatCurrency(totalDespesas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${saldoGeral >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                  <DollarSign className={`h-5 w-5 ${saldoGeral >= 0 ? "text-primary" : "text-destructive"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo do Período</p>
                  <p className={`text-xl font-bold ${saldoGeral >= 0 ? "text-primary" : "text-destructive"}`} data-testid="metric-saldo">{formatCurrency(saldoGeral)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de barras simples */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal</CardTitle>
            <CardDescription>Receitas vs Despesas por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fluxo.map((m) => (
                <div key={m.chave} className="space-y-1.5" data-testid={`row-mes-${m.chave}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{m.label}</span>
                    <Badge variant={m.saldo >= 0 ? "default" : "destructive"} className="text-xs">
                      {m.saldo >= 0 ? "+" : ""}{formatCurrency(m.saldo)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 text-right">{formatCurrency(m.receitas)}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: `${(m.receitas / maxValor) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Receita</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 text-right">{formatCurrency(m.despesas)}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-destructive"
                          style={{ width: `${(m.despesas / maxValor) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-destructive font-medium">Despesa</span>
                    </div>
                  </div>
                </div>
              ))}
              {fluxo.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum dado para o período selecionado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela resumo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo por Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mês</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receitas</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Despesas</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxo.map((m, i) => (
                    <tr key={m.chave} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{m.label}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-mono">{formatCurrency(m.receitas)}</td>
                      <td className="px-4 py-3 text-right text-destructive font-mono">{formatCurrency(m.despesas)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${m.saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                        {m.saldo >= 0 ? "+" : ""}{formatCurrency(m.saldo)}
                      </td>
                    </tr>
                  ))}
                  {fluxo.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum dado disponível
                      </td>
                    </tr>
                  )}
                </tbody>
                {fluxo.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td className="px-4 py-3 font-bold text-foreground">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 font-mono">{formatCurrency(totalReceitas)}</td>
                      <td className="px-4 py-3 text-right font-bold text-destructive font-mono">{formatCurrency(totalDespesas)}</td>
                      <td className={`px-4 py-3 text-right font-bold font-mono ${saldoGeral >= 0 ? "text-primary" : "text-destructive"}`}>
                        {saldoGeral >= 0 ? "+" : ""}{formatCurrency(saldoGeral)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
