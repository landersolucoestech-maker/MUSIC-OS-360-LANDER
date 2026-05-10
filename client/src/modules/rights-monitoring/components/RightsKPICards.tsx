import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Radio, CheckCircle, AlertTriangle, XCircle, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPI {
  label: string;
  value: string;
  subvalue?: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  variant: "default" | "success" | "warning" | "danger";
}

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n);

interface Props {
  total: number;
  confirmados: number;
  naoReportados: number;
  divergencias: number;
  matchRate: number;
  valorEstimado: number;
  valorRecebido: number;
}

export function RightsKPICards({ total, confirmados, naoReportados, divergencias, matchRate, valorEstimado, valorRecebido }: Props) {
  const diferencaFinanceira = valorRecebido - valorEstimado;

  const kpis: KPI[] = [
    {
      label: "Execuções Detectadas",
      value: fmtNum(total),
      subvalue: "este mês",
      trend: 8.4,
      trendLabel: "vs. mês anterior",
      icon: <Radio className="h-5 w-5" />,
      variant: "default",
    },
    {
      label: "Confirmadas",
      value: fmtNum(confirmados),
      subvalue: `${total > 0 ? Math.round((confirmados / total) * 100) : 0}% do total`,
      trend: 3.2,
      trendLabel: "vs. mês anterior",
      icon: <CheckCircle className="h-5 w-5" />,
      variant: "success",
    },
    {
      label: "Não Reportadas",
      value: fmtNum(naoReportados),
      subvalue: "aguardam conciliação",
      trend: -12.1,
      trendLabel: "vs. mês anterior",
      icon: <XCircle className="h-5 w-5" />,
      variant: "danger",
    },
    {
      label: "Divergências",
      value: fmtNum(divergencias),
      subvalue: "requerem atenção",
      trend: -4.8,
      trendLabel: "vs. mês anterior",
      icon: <AlertTriangle className="h-5 w-5" />,
      variant: "warning",
    },
    {
      label: "Match Rate",
      value: `${matchRate}%`,
      subvalue: "precisão ECAD",
      trend: 1.9,
      trendLabel: "vs. mês anterior",
      icon: <TrendingUp className="h-5 w-5" />,
      variant: matchRate >= 80 ? "success" : matchRate >= 60 ? "warning" : "danger",
    },
    {
      label: "Valor Estimado",
      value: fmtBRL(valorEstimado),
      subvalue: "arrecadação potencial",
      icon: <DollarSign className="h-5 w-5" />,
      variant: "default",
    },
    {
      label: "Valor Recebido",
      value: fmtBRL(valorRecebido),
      subvalue: "ECAD confirmado",
      icon: <DollarSign className="h-5 w-5" />,
      variant: "success",
    },
    {
      label: "Diferença Financeira",
      value: fmtBRL(Math.abs(diferencaFinanceira)),
      subvalue: diferencaFinanceira >= 0 ? "superávit" : "déficit",
      icon: <DollarSign className="h-5 w-5" />,
      variant: diferencaFinanceira >= 0 ? "success" : "danger",
    },
  ];

  const variantStyles = {
    default: { card: "", icon: "bg-primary/10 text-primary", badge: "" },
    success: { card: "", icon: "bg-success/10 text-success", badge: "text-success" },
    warning: { card: "", icon: "bg-warning/10 text-warning", badge: "text-warning" },
    danger: { card: "", icon: "bg-destructive/10 text-destructive", badge: "text-destructive" },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const styles = variantStyles[kpi.variant];
        return (
          <Card key={kpi.label} className="border-border/60 hover:border-border transition-colors duration-150">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="stat-label">{kpi.label}</span>
                <div className={`p-1.5 rounded-md flex-shrink-0 ${styles.icon}`}>{kpi.icon}</div>
              </div>
              <div className="space-y-1">
                <p className="stat-value">{kpi.value}</p>
                {kpi.subvalue && (
                  <p className="text-caption">{kpi.subvalue}</p>
                )}
                {kpi.trend !== undefined && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trend >= 0 ? "text-success" : "text-destructive"}`}>
                    {kpi.trend >= 0
                      ? <ArrowUpRight className="h-3 w-3" />
                      : <ArrowDownRight className="h-3 w-3" />}
                    <span>{Math.abs(kpi.trend)}%</span>
                    <span className="text-muted-foreground font-normal">{kpi.trendLabel}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
