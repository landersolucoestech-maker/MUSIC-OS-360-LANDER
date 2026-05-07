import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { useTransacoes } from "@/modules/financeiro/hooks/useTransacoes";
import { formatCurrency } from "@/shared/lib/format-utils";
import { cn } from "@/shared/lib/utils";

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default function FluxoCaixa() {
  const { transacoes, isLoading } = useTransacoes();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const years = useMemo(() => {
    const y = today.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const { dailyRows, totals } = useMemo(() => {
    const filtered = transacoes.filter(t => {
      const d = new Date(t.data + "T12:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const byDay: Record<string, { receitas: number; despesas: number; items: typeof filtered }> = {};
    for (const t of filtered) {
      const day = t.data.slice(0, 10);
      if (!byDay[day]) byDay[day] = { receitas: 0, despesas: 0, items: [] };
      if (t.tipo === "receita") byDay[day].receitas += t.valor;
      else byDay[day].despesas += t.valor;
      byDay[day].items.push(t);
    }

    const sortedDays = Object.keys(byDay).sort();
    let balance = 0;
    const rows = sortedDays.map(day => {
      const { receitas, despesas, items } = byDay[day];
      const net = receitas - despesas;
      balance += net;
      return { day, receitas, despesas, net, balance, items };
    });

    const totalReceitas = filtered.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
    const totalDespesas = filtered.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);

    return { dailyRows: rows, totals: { receitas: totalReceitas, despesas: totalDespesas, saldo: totalReceitas - totalDespesas } };
  }, [transacoes, month, year]);

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  };

  return (
    <MainLayout
      title="Fluxo de Caixa"
      description="Movimentação diária de entradas e saídas"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Entradas</p>
                <p className="text-base font-semibold text-success font-mono">{formatCurrency(totals.receitas)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Saídas</p>
                <p className="text-base font-semibold text-destructive font-mono">{formatCurrency(totals.despesas)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "border-border",
            totals.saldo >= 0 ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"
          )}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                totals.saldo >= 0 ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
              )}>
                <DollarSign className={cn("h-4 w-4", totals.saldo >= 0 ? "text-success" : "text-destructive")} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo do Período</p>
                <p className={cn(
                  "text-base font-semibold font-mono",
                  totals.saldo >= 0 ? "text-success" : "text-destructive"
                )}>{formatCurrency(totals.saldo)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((n, i) => (
                <SelectItem key={i} value={String(i)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-8 text-sm bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-1">
            {MONTH_NAMES[month]} {year} — {dailyRows.length} dia(s) com movimentação
          </span>
        </div>

        {/* Daily Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Movimentação Diária</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : dailyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma transação em {MONTH_NAMES[month]} {year}.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Data</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-muted-foreground">Entradas</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-muted-foreground">Saídas</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-muted-foreground">Líquido</th>
                    <th className="text-right py-2 pl-4 text-xs font-semibold text-muted-foreground">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dailyRows.map(row => (
                    <tr
                      key={row.day}
                      className="hover:bg-muted/30 transition-colors"
                      data-testid={`row-fluxo-${row.day}`}
                    >
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground">{formatDay(row.day)}</td>
                      <td className="py-2.5 px-4 text-right">
                        {row.receitas > 0 ? (
                          <span className="font-mono text-xs text-success">+{formatCurrency(row.receitas)}</span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {row.despesas > 0 ? (
                          <span className="font-mono text-xs text-destructive">−{formatCurrency(row.despesas)}</span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={cn(
                          "font-mono text-xs font-medium",
                          row.net >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {row.net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(row.net))}
                        </span>
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        <span className={cn(
                          "font-mono text-xs font-semibold",
                          row.balance >= 0 ? "text-foreground" : "text-destructive"
                        )}>
                          {formatCurrency(row.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {dailyRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td className="py-2.5 pr-4 text-xs font-semibold text-foreground">TOTAL</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-success">
                        +{formatCurrency(totals.receitas)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-destructive">
                        −{formatCurrency(totals.despesas)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold">
                        <span className={totals.saldo >= 0 ? "text-success" : "text-destructive"}>
                          {totals.saldo >= 0 ? "+" : "−"}{formatCurrency(Math.abs(totals.saldo))}
                        </span>
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono text-xs font-semibold">
                        {dailyRows.length > 0 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[11px]",
                              dailyRows[dailyRows.length - 1].balance >= 0
                                ? "border-success/40 text-success"
                                : "border-destructive/40 text-destructive"
                            )}
                          >
                            {formatCurrency(dailyRows[dailyRows.length - 1].balance)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
