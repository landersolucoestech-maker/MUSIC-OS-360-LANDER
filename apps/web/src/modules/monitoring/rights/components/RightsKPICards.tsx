import { MetricCard } from "@/shared/components/MetricCard";
import { Radio, CheckCircle, AlertTriangle, XCircle, TrendingUp, DollarSign } from "lucide-react";

type Accent = "primary" | "success" | "warning" | "destructive";

interface KPI {
  label: string;
  value: string;
  subvalue?: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
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
    { label: "Execuções Detectadas", value: fmtNum(total),         subvalue: "este mês",               icon: Radio,         accent: "primary" },
    { label: "Confirmadas",          value: fmtNum(confirmados),   subvalue: `${total > 0 ? Math.round((confirmados / total) * 100) : 0}% do total`, icon: CheckCircle, accent: "success" },
    { label: "Não Reportadas",       value: fmtNum(naoReportados), subvalue: "aguardam conciliação",   icon: XCircle,      accent: "destructive" },
    { label: "Divergências",         value: fmtNum(divergencias),  subvalue: "requerem atenção",       icon: AlertTriangle, accent: "warning" },
    { label: "Match Rate",           value: `${matchRate}%`,       subvalue: "precisão ECAD",          icon: TrendingUp,   accent: matchRate >= 80 ? "success" : matchRate >= 60 ? "warning" : "destructive" },
    { label: "Valor Estimado",       value: fmtBRL(valorEstimado), subvalue: "arrecadação potencial",  icon: DollarSign,  accent: "primary" },
    { label: "Valor Recebido",       value: fmtBRL(valorRecebido), subvalue: "ECAD confirmado",        icon: DollarSign,  accent: "success" },
    { label: "Diferença Financeira", value: fmtBRL(Math.abs(diferencaFinanceira)), subvalue: diferencaFinanceira >= 0 ? "superávit" : "déficit", icon: DollarSign, accent: diferencaFinanceira >= 0 ? "success" : "destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <MetricCard
          key={kpi.label}
          title={kpi.label}
          value={kpi.value}
          description={kpi.subvalue}
          trend={kpi.trend !== undefined ? { value: kpi.trend, label: kpi.trendLabel } : undefined}
          icon={kpi.icon}
          accent={kpi.accent}
        />
      ))}
    </div>
  );
}
