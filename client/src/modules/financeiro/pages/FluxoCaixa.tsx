import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Download, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useTransacoes } from "@/modules/financeiro/hooks/useTransacoes";
import { formatCurrency } from "@/shared/lib/format-utils";
import { exportToCSV } from "@/shared/lib/csv";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

type Periodo = "3m" | "6m" | "12m" | "24m";

interface MesData {
  label: string;
  mesKey: string;
  receitas: number;
  despesas: number;
  resultado: number;
  saldoAcumulado: number;
}

function FluxoSkeleton() {
  return (
    <MainLayout title="Fluxo de Caixa" description="Visão mensal do fluxo financeiro">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    </MainLayout>
  );
}

export default function FluxoCaixa() {
  const { transacoes, isLoading } = useTransacoes();
  const [periodo, setPeriodo] = useState<Periodo>("6m");

  const meses = useMemo<MesData[]>(() => {
    const n = parseInt(periodo);
    const hoje = new Date();
    const inicio = startOfMonth(subMonths(hoje, n - 1));
    const fim = endOfMonth(hoje);

    const allMonths = eachMonthOfInterval({ start: inicio, end: fim });

    let saldoAcumulado = 0;
    return allMonths.map(mes => {
      const mesInicio = startOfMonth(mes);
      const mesFim = endOfMonth(mes);

      const txDoMes = transacoes.filter(t => {
        if (!t.data) return false;
        try {
          const d = parseISO(t.data);
          return isWithinInterval(d, { start: mesInicio, end: mesFim });
        } catch { return false; }
      });

      const receitas = txDoMes.filter(t => t.tipo === "receita").reduce((s, t) => s + (t.valor || 0), 0);
      const despesas = txDoMes.filter(t => t.tipo === "despesa").reduce((s, t) => s + (t.valor || 0), 0);
      const resultado = receitas - despesas;
      saldoAcumulado += resultado;

      return {
        label: format(mes, "MMM/yy", { locale: ptBR }),
        mesKey: format(mes, "yyyy-MM"),
        receitas,
        despesas,
        resultado,
        saldoAcumulado,
      };
    });
  }, [transacoes, periodo]);

  const totais = useMemo(() => {
    const receitas = meses.reduce((s, m) => s + m.receitas, 0);
    const despesas = meses.reduce((s, m) => s + m.despesas, 0);
    return { receitas, despesas, resultado: receitas - despesas };
  }, [meses]);

  const maxVal = useMemo(() => Math.max(...meses.map(m => Math.max(m.receitas, m.despesas)), 1), [meses]);

  const handleExport = () => {
    exportToCSV(
      meses.map(m => ({ ...m, receitas: m.receitas.toFixed(2), despesas: m.despesas.toFixed(2), resultado: m.resultado.toFixed(2), saldoAcumulado: m.saldoAcumulado.toFixed(2) })),
      [
        { key: "label", label: "Mês" },
        { key: "receitas", label: "Receitas (R$)" },
        { key: "despesas", label: "Despesas (R$)" },
        { key: "resultado", label: "Resultado (R$)" },
        { key: "saldoAcumulado", label: "Saldo Acumulado (R$)" },
      ],
      "fluxo-caixa",
    );
  };

  if (isLoading) return <FluxoSkeleton />;

  return (
    <MainLayout
      title="Fluxo de Caixa"
      description="Visão mensal do fluxo financeiro"
      actions={
        <>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
              <SelectItem value="24m">24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </>
      }
    >
      <div className="space-y-6">

        {/* ── KPI totais do período ── */}
        <div className="grid gap-4 sm:grid-cols-3" data-testid="fluxo-kpis">
          <Card className="border-t-2 border-t-success">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Receitas</p>
                  <p className="text-2xl font-mono font-semibold text-success mt-1.5">{formatCurrency(totais.receitas)}</p>
                  <p className="text-xs text-muted-foreground mt-1">últimos {periodo.replace("m", "")} meses</p>
                </div>
                <div className="p-2.5 bg-success/10 border border-success/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-t-destructive">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Despesas</p>
                  <p className="text-2xl font-mono font-semibold text-destructive mt-1.5">{formatCurrency(totais.despesas)}</p>
                  <p className="text-xs text-muted-foreground mt-1">últimos {periodo.replace("m", "")} meses</p>
                </div>
                <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("border-t-2", totais.resultado >= 0 ? "border-t-primary" : "border-t-destructive")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado Líquido</p>
                  <p className={cn("text-2xl font-mono font-semibold mt-1.5", totais.resultado >= 0 ? "text-success" : "text-destructive")}>
                    {totais.resultado >= 0 ? "+" : ""}{formatCurrency(totais.resultado)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totais.receitas > 0 ? Math.round(((totais.receitas - totais.despesas) / totais.receitas) * 100) : 0}% margem
                  </p>
                </div>
                <div className={cn("p-2.5 rounded-lg border", totais.resultado >= 0 ? "bg-primary/10 border-primary/20" : "bg-destructive/10 border-destructive/20")}>
                  <DollarSign className={cn("h-4 w-4", totais.resultado >= 0 ? "text-primary" : "text-destructive")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Gráfico de barras visual simples ── */}
        <Card data-testid="fluxo-grafico">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Receitas vs Despesas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
              {meses.map(m => (
                <div key={m.mesKey} className="flex flex-col items-center gap-1 min-w-[48px] flex-1">
                  <div className="flex items-end gap-0.5 h-36 w-full justify-center">
                    {/* Barra receitas */}
                    <div
                      className="bg-success/80 rounded-t-sm w-[42%] transition-all duration-300"
                      style={{ height: `${maxVal > 0 ? (m.receitas / maxVal) * 100 : 0}%`, minHeight: m.receitas > 0 ? "2px" : "0" }}
                      title={`Receitas: ${formatCurrency(m.receitas)}`}
                    />
                    {/* Barra despesas */}
                    <div
                      className="bg-destructive/70 rounded-t-sm w-[42%] transition-all duration-300"
                      style={{ height: `${maxVal > 0 ? (m.despesas / maxVal) * 100 : 0}%`, minHeight: m.despesas > 0 ? "2px" : "0" }}
                      title={`Despesas: ${formatCurrency(m.despesas)}`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono capitalize">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-success/80 inline-block" /> Receitas</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive/70 inline-block" /> Despesas</div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tabela mensal com saldo acumulado ── */}
        <Card data-testid="fluxo-tabela">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Detalhamento Mensal</CardTitle>
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
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {meses.map(m => (
                    <tr key={m.mesKey} className="hover:bg-muted/20 transition-colors" data-testid={`fluxo-row-${m.mesKey}`}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium capitalize">{m.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono text-success">{m.receitas > 0 ? formatCurrency(m.receitas) : <span className="text-muted-foreground">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono text-destructive">{m.despesas > 0 ? formatCurrency(m.despesas) : <span className="text-muted-foreground">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {m.resultado > 0
                            ? <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                            : m.resultado < 0
                              ? <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                              : <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                          <span className={cn("text-sm font-mono font-medium",
                            m.resultado > 0 ? "text-success" : m.resultado < 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {m.resultado === 0 ? "—" : (m.resultado > 0 ? "+" : "") + formatCurrency(Math.abs(m.resultado))}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={cn("font-mono text-xs",
                            m.saldoAcumulado >= 0
                              ? "border-success/40 text-success bg-success/5"
                              : "border-destructive/40 text-destructive bg-destructive/5"
                          )}
                        >
                          {m.saldoAcumulado >= 0 ? "+" : ""}{formatCurrency(m.saldoAcumulado)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-success text-sm">{formatCurrency(totais.receitas)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-destructive text-sm">{formatCurrency(totais.despesas)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm" style={{ color: totais.resultado >= 0 ? undefined : undefined }}>
                      <span className={totais.resultado >= 0 ? "text-success" : "text-destructive"}>
                        {totais.resultado >= 0 ? "+" : ""}{formatCurrency(totais.resultado)}
                      </span>
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
