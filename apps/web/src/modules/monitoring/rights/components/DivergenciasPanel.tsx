import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { AlertTriangle, XCircle, Info, CheckCircle, ChevronRight } from "lucide-react";

export type DivergenciaSeverity = "critica" | "alta" | "media" | "baixa";

export interface Divergencia {
  id: string;
  tipo: string;
  descricao: string;
  obra?: string;
  isrc?: string;
  origem?: string;
  severity: DivergenciaSeverity;
  risco_score: number;
  data: string;
  status: "aberta" | "em_resolucao" | "resolvida";
}

const SEVERITY_CONFIG: Record<DivergenciaSeverity, { label: string; className: string; icon: React.ReactNode; border: string }> = {
  critica: { label: "Crítica",  className: "bg-destructive/15 text-destructive border-destructive/30", icon: <XCircle className="h-4 w-4 text-destructive" />,    border: "border-l-destructive" },
  alta:    { label: "Alta",     className: "bg-orange-500/15 text-orange-600 border-orange-400/30",   icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, border: "border-l-orange-500" },
  media:   { label: "Média",    className: "bg-warning/15 text-warning border-warning/30",            icon: <AlertTriangle className="h-4 w-4 text-warning" />,    border: "border-l-warning" },
  baixa:   { label: "Baixa",    className: "bg-muted text-muted-foreground border-border",            icon: <Info className="h-4 w-4 text-muted-foreground" />,    border: "border-l-border" },
};

export const MOCK_DIVERGENCIAS: Divergencia[] = [
  { id: "div-001", tipo: "Execução sem conciliação ECAD", descricao: "Execução detectada na Rádio Globo FM mas sem registro correspondente no relatório ECAD Q1/2026.", obra: "Frequência 440", isrc: "BRMSC2500003", origem: "Rádio Globo FM", severity: "critica", risco_score: 92, data: "2026-05-07", status: "aberta" },
  { id: "div-002", tipo: "ISRC ausente no relatório ECAD", descricao: "Relatório ECAD importado contém obra sem ISRC identificado. Correspondência manual necessária.", obra: "Cidade Mágica", isrc: "BRMSC2500006", origem: "ECAD Q1/2026", severity: "alta", risco_score: 78, data: "2026-05-06", status: "aberta" },
  { id: "div-003", tipo: "Publisher não identificado", descricao: "Execução registrada sem publisher vinculado. Royalties podem não ser distribuídos corretamente.", obra: "Trap do Norte", isrc: "BRMSC2500008", origem: "Festival Rec Beat", severity: "alta", risco_score: 74, data: "2026-05-04", status: "em_resolucao" },
  { id: "div-004", tipo: "Diferença financeira detectada", descricao: "Valor arrecadado pelo ECAD (R$ 87,50) difere do estimado (R$ 124,00) em mais de 20%.", obra: "Frequência 440", isrc: "BRMSC2500003", origem: "Multishow", severity: "media", risco_score: 55, data: "2026-05-07", status: "aberta" },
  { id: "div-005", tipo: "Execução sem obra cadastrada", descricao: "Sinal de broadcast detectado via ACRCloud sem correspondência no catálogo interno.", obra: undefined, isrc: "BRMSC2599999", origem: "Web Rádio Samba Brasil", severity: "media", risco_score: 48, data: "2026-05-06", status: "aberta" },
  { id: "div-006", tipo: "Setlist não enviado ao ECAD", descricao: "Show realizado em 2026-03-28 (Festival Lollapalooza) sem setlist enviado dentro do prazo.", obra: undefined, isrc: undefined, origem: "Lollapalooza Brasil", severity: "baixa", risco_score: 31, data: "2026-04-05", status: "aberta" },
];

interface Props {
  divergencias: Divergencia[];
  onResolve?: (div: Divergencia) => void;
}

export function DivergenciasPanel({ divergencias, onResolve }: Props) {
  const abertas = divergencias.filter(d => d.status !== "resolvida");

  if (abertas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle className="h-10 w-10 mb-3 text-success opacity-60" />
        <p className="text-sm font-medium">Nenhuma divergência aberta</p>
        <p className="text-xs mt-1">Todas as execuções estão conciliadas corretamente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {abertas.map((div) => {
        const cfg = SEVERITY_CONFIG[div.severity];
        return (
          <Card key={div.id} className={`border-l-4 ${cfg.border} border-border/60`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 mt-0.5">{cfg.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground">{div.tipo}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${cfg.className}`}>
                        {cfg.label}
                      </span>
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground`}>
                        Risco {div.risco_score}/100
                      </span>
                      {div.status === "em_resolucao" && (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">Em resolução</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{div.descricao}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {div.obra && (
                        <span className="text-xs text-foreground/70 font-medium">{div.obra}</span>
                      )}
                      {div.isrc && (
                        <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{div.isrc}</code>
                      )}
                      {div.origem && (
                        <span className="text-xs text-muted-foreground">{div.origem}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{div.data}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 gap-1 h-8"
                  onClick={() => onResolve?.(div)}
                >
                  Resolver <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
