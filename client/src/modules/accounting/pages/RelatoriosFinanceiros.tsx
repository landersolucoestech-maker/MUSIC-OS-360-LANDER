import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Download, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { formatCurrency } from "@/shared/lib/format-utils";
import { exportToCSV, CSVColumn } from "@/shared/lib/csv";
import { cn } from "@/shared/lib/utils";

const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const CATEGORIAS = ["royalties","producao","shows","licenciamento","operacional","marketing","outros"];
const CATEGORIA_LABELS: Record<string, string> = {
  royalties: "Royalties", producao: "Produção", shows: "Shows",
  licenciamento: "Licenciamento", operacional: "Operacional",
  marketing: "Marketing", outros: "Outros",
};

const CSV_COLS: CSVColumn[] = [
  { key: "categoria", label: "Categoria" },
  { key: "receitas", label: "Receitas (R$)" },
  { key: "despesas", label: "Despesas (R$)" },
  { key: "saldo", label: "Saldo (R$)" },
];

const MONTHLY_CSV_COLS: CSVColumn[] = [
  { key: "mes", label: "Mês" },
  { key: "receitas", label: "Receitas (R$)" },
  { key: "despesas", label: "Despesas (R$)" },
  { key: "saldo", label: "Saldo (R$)" },
];

type ViewType = "categoria" | "mensal";

export default function RelatoriosFinanceiros() {
  const { transacoes, isLoading } = useTransacoes();
  const [view, setView] = useState<ViewType>("categoria");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "receita" | "despesa">("todos");

  // Last 6 months
  const last6Months = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.getMonth(), year: d.getFullYear() });
    }
    return months;
  }, []);

  const byCategoria = useMemo(() => {
    return CATEGORIAS.map(cat => {
      const catTx = transacoes.filter(t =>
        (t.categoria ?? "outros").toLowerCase() === cat &&
        (tipoFilter === "todos" || t.tipo === tipoFilter)
      );
      const receitas = catTx.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
      const despesas = catTx.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
      return { categoria: cat, label: CATEGORIA_LABELS[cat], receitas, despesas, saldo: receitas - despesas, count: catTx.length };
    }).filter(r => r.count > 0 || view === "categoria");
  }, [transacoes, tipoFilter, view]);

  const byMonth = useMemo(() => {
    return last6Months.map(({ month, year }) => {
      const monthTx = transacoes.filter(t => {
        const d = new Date(t.data + "T12:00:00");
        return d.getMonth() === month && d.getFullYear() === year &&
          (tipoFilter === "todos" || t.tipo === tipoFilter);
      });
      const receitas = monthTx.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
      const despesas = monthTx.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
      return {
        mes: `${MONTH_NAMES_SHORT[month]}/${year}`,
        month, year, receitas, despesas,
        saldo: receitas - despesas,
        count: monthTx.length,
      };
    });
  }, [transacoes, last6Months, tipoFilter]);

  const totals = useMemo(() => {
    const src = transacoes.filter(t => tipoFilter === "todos" || t.tipo === tipoFilter);
    return {
      receitas: src.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0),
      despesas: src.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
    };
  }, [transacoes, tipoFilter]);

  const maxValCategoria = useMemo(() => Math.max(1, ...byCategoria.map(r => Math.max(r.receitas, r.despesas))), [byCategoria]);
  const maxValMensal = useMemo(() => Math.max(1, ...byMonth.map(r => Math.max(r.receitas, r.despesas))), [byMonth]);

  const handleExport = () => {
    if (view === "categoria") {
      const rows = byCategoria.map(r => ({ categoria: r.label, receitas: r.receitas, despesas: r.despesas, saldo: r.saldo }));
      exportToCSV(rows, CSV_COLS, "relatorio-por-categoria");
    } else {
      const rows = byMonth.map(r => ({ mes: r.mes, receitas: r.receitas, despesas: r.despesas, saldo: r.saldo }));
      exportToCSV(rows, MONTHLY_CSV_COLS, "relatorio-mensal");
    }
  };

  return (
    <MainLayout
      title="Relatórios"
      description="Análise de receitas e despesas por categoria e período"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleExport}
          data-testid="button-export-csv"
        >
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <p className="text-xs text-muted-foreground">Total Receitas</p>
              </div>
              <p className="text-lg font-semibold text-success font-mono">{formatCurrency(totals.receitas)}</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                <p className="text-xs text-muted-foreground">Total Despesas</p>
              </div>
              <p className="text-lg font-semibold text-destructive font-mono">{formatCurrency(totals.despesas)}</p>
            </CardContent>
          </Card>
          <Card className={cn(
            (totals.receitas - totals.despesas) >= 0 ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs text-muted-foreground">Resultado</p>
              </div>
              <p className={cn(
                "text-lg font-semibold font-mono",
                (totals.receitas - totals.despesas) >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(totals.receitas - totals.despesas)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView("categoria")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "categoria" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              )}
              data-testid="btn-view-categoria"
            >
              Por Categoria
            </button>
            <button
              onClick={() => setView("mensal")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "mensal" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              )}
              data-testid="btn-view-mensal"
            >
              Comparativo Mensal
            </button>
          </div>
          <Select value={tipoFilter} onValueChange={v => setTipoFilter(v as typeof tipoFilter)}>
            <SelectTrigger className="w-[130px] h-8 text-sm bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chart: by category */}
        {view === "categoria" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Receitas e Despesas por Categoria</CardTitle>
              <CardDescription className="text-xs">Distribuição de valores por categoria de lançamento</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
              ) : (
                <div className="space-y-4">
                  {byCategoria.map(row => (
                    <div key={row.categoria} data-testid={`relatorio-cat-${row.categoria}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-foreground">{row.label}</span>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          {tipoFilter !== "despesa" && (
                            <span className="text-success">+{formatCurrency(row.receitas)}</span>
                          )}
                          {tipoFilter !== "receita" && (
                            <span className="text-destructive">−{formatCurrency(row.despesas)}</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {tipoFilter !== "despesa" && row.receitas > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-success w-12 text-right shrink-0">Rec.</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success/60 rounded-full transition-all"
                                style={{ width: `${(row.receitas / maxValCategoria) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {tipoFilter !== "receita" && row.despesas > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-destructive w-12 text-right shrink-0">Desp.</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-destructive/60 rounded-full transition-all"
                                style={{ width: `${(row.despesas / maxValCategoria) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {row.receitas === 0 && row.despesas === 0 && (
                          <p className="text-[10px] text-muted-foreground italic pl-14">Sem lançamentos</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart: monthly comparison */}
        {view === "mensal" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Comparativo Mensal (últimos 6 meses)</CardTitle>
              <CardDescription className="text-xs">Evolução de receitas e despesas mês a mês</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
              ) : (
                <div className="space-y-5">
                  {byMonth.map(row => (
                    <div key={row.mes} data-testid={`relatorio-mes-${row.mes}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground font-mono">{row.mes}</span>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          {tipoFilter !== "despesa" && (
                            <span className="text-success">+{formatCurrency(row.receitas)}</span>
                          )}
                          {tipoFilter !== "receita" && (
                            <span className="text-destructive">−{formatCurrency(row.despesas)}</span>
                          )}
                          <span className={cn(
                            "font-medium",
                            row.saldo >= 0 ? "text-foreground" : "text-destructive"
                          )}>
                            = {formatCurrency(row.saldo)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {tipoFilter !== "despesa" && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-success w-12 text-right shrink-0">Rec.</span>
                            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success/60 rounded-full transition-all"
                                style={{ width: `${(row.receitas / maxValMensal) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {tipoFilter !== "receita" && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-destructive w-12 text-right shrink-0">Desp.</span>
                            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-destructive/60 rounded-full transition-all"
                                style={{ width: `${(row.despesas / maxValMensal) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {row.receitas === 0 && row.despesas === 0 && (
                          <p className="text-[10px] text-muted-foreground italic pl-14">Sem lançamentos</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
