import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { formatCurrency } from "@/shared/lib/format-utils";
import { cn } from "@/shared/lib/utils";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function buildMonthOptions() {
  const opts: { label: string; month: number; year: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, month: d.getMonth(), year: d.getFullYear() });
  }
  return opts;
}

const MONTH_OPTIONS = buildMonthOptions();

interface DayEntry {
  date: string;
  label: string;
  receitas: number;
  despesas: number;
  saldo: number;
  saldoAcumulado: number;
}

export default function FluxoCaixa() {
  const { transacoes, isLoading } = useTransacoes();
  const now = new Date();
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = MONTH_OPTIONS.findIndex(o => o.month === now.getMonth() && o.year === now.getFullYear());
    return idx >= 0 ? idx : MONTH_OPTIONS.length - 1;
  });

  const selected = MONTH_OPTIONS[selectedIdx];

  const { days, totais, saldoInicial } = useMemo(() => {
    const { month, year } = selected;
    const monthTx = transacoes.filter(t => {
      const d = new Date(t.data + "T12:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const prevTx = transacoes.filter(t => {
      const d = new Date(t.data + "T12:00:00");
      return d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() < month);
    });
    const saldoInicial =
      prevTx.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0) -
      prevTx.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let acumulado = saldoInicial;
    const days: DayEntry[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayTx = monthTx.filter(t => t.data === dateStr);
      const rec = dayTx.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
      const desp = dayTx.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
      const saldo = rec - desp;
      acumulado += saldo;
      days.push({
        date: dateStr,
        label: `${String(d).padStart(2, "0")}/${MONTH_NAMES_SHORT[month]}`,
        receitas: rec,
        despesas: desp,
        saldo,
        saldoAcumulado: acumulado,
      });
    }

    const totais = {
      receitas: monthTx.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0),
      despesas: monthTx.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
      saldoFinal: acumulado,
      txCount: monthTx.length,
    };

    return { days, totais, saldoInicial };
  }, [transacoes, selected]);

  const activeDays = days.filter(d => d.receitas > 0 || d.despesas > 0);
  const maxVal = Math.max(1, ...days.map(d => Math.max(d.receitas, d.despesas)));

  return (
    <MainLayout
      title="Fluxo de Caixa"
      description="Movimentação diária e saldo acumulado do período"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Select value={String(selectedIdx)} onValueChange={v => setSelectedIdx(Number(v))}>
            <SelectTrigger className="w-[200px] h-9 text-sm bg-card border-border" data-testid="select-periodo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o, i) => (
                <SelectItem key={i} value={String(i)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {totais.txCount} lançamento{totais.txCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-muted/50">
            <CardContent className="p-4 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Inicial</p>
              <p className={cn("text-lg font-bold font-mono", saldoInicial >= 0 ? "text-foreground" : "text-destructive")}>
                {formatCurrency(saldoInicial)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entradas</p>
              </div>
              <p className="text-lg font-bold font-mono text-success">{formatCurrency(totais.receitas)}</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saídas</p>
              </div>
              <p className="text-lg font-bold font-mono text-destructive">{formatCurrency(totais.despesas)}</p>
            </CardContent>
          </Card>
          <Card className={cn(totais.saldoFinal >= 0 ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5")}>
            <CardContent className="p-4 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Final</p>
              </div>
              <p className={cn("text-lg font-bold font-mono", totais.saldoFinal >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(totais.saldoFinal)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Movimentação Diária</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : activeDays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma movimentação neste período.</p>
            ) : (
              <div className="space-y-3">
                {activeDays.map(day => (
                  <div key={day.date} data-testid={`fluxo-dia-${day.date}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-foreground w-16 shrink-0">{day.label}</span>
                      <div className="flex items-center gap-4 font-mono text-[11px]">
                        {day.receitas > 0 && <span className="text-success">+{formatCurrency(day.receitas)}</span>}
                        {day.despesas > 0 && <span className="text-destructive">−{formatCurrency(day.despesas)}</span>}
                        <span className={cn("font-semibold", day.saldoAcumulado >= 0 ? "text-foreground" : "text-destructive")}>
                          ={formatCurrency(day.saldoAcumulado)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-16">
                      {day.receitas > 0 && (
                        <div className="h-2 bg-success/50 rounded-full transition-all" style={{ width: `${(day.receitas / maxVal) * 100}%` }} />
                      )}
                      {day.despesas > 0 && (
                        <div className="h-2 bg-destructive/50 rounded-full transition-all" style={{ width: `${(day.despesas / maxVal) * 100}%` }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tabela Completa do Mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Data</th>
                    <th className="text-right py-2 pr-4 font-medium text-success">Entradas</th>
                    <th className="text-right py-2 pr-4 font-medium text-destructive">Saídas</th>
                    <th className="text-right py-2 pr-4 font-medium">Variação</th>
                    <th className="text-right py-2 font-medium">Saldo Acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {days.filter(d => d.receitas > 0 || d.despesas > 0).map(day => (
                    <tr key={day.date} className="border-b border-border/50 hover:bg-muted/20 transition-colors" data-testid={`fluxo-row-${day.date}`}>
                      <td className="py-2 pr-4 font-mono text-muted-foreground">{day.label}</td>
                      <td className="py-2 pr-4 text-right font-mono text-success">
                        {day.receitas > 0 ? `+${formatCurrency(day.receitas)}` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-destructive">
                        {day.despesas > 0 ? `−${formatCurrency(day.despesas)}` : "—"}
                      </td>
                      <td className={cn("py-2 pr-4 text-right font-mono font-medium", day.saldo >= 0 ? "text-foreground" : "text-destructive")}>
                        {day.saldo >= 0 ? "+" : ""}{formatCurrency(day.saldo)}
                      </td>
                      <td className={cn("py-2 text-right font-mono font-semibold", day.saldoAcumulado >= 0 ? "text-foreground" : "text-destructive")}>
                        {formatCurrency(day.saldoAcumulado)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold bg-muted/30">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-right font-mono text-success">+{formatCurrency(totais.receitas)}</td>
                    <td className="py-2 pr-4 text-right font-mono text-destructive">−{formatCurrency(totais.despesas)}</td>
                    <td className={cn("py-2 pr-4 text-right font-mono", (totais.receitas - totais.despesas) >= 0 ? "text-foreground" : "text-destructive")}>
                      {(totais.receitas - totais.despesas) >= 0 ? "+" : ""}{formatCurrency(totais.receitas - totais.despesas)}
                    </td>
                    <td className={cn("py-2 text-right font-mono", totais.saldoFinal >= 0 ? "text-foreground" : "text-destructive")}>
                      {formatCurrency(totais.saldoFinal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
