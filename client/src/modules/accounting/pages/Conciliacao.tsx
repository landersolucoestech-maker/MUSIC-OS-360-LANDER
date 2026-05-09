import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  ClipboardCheck, CheckCircle, AlertCircle, Search, Upload,
  Download, Loader2, MoreHorizontal, Link2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { toast } from "sonner";
import { EmptyState } from "@/shared/components/EmptyState";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  conciliado: { label: "Conciliado", variant: "default" },
  pendente: { label: "Pendente", variant: "outline" },
  divergente: { label: "Divergente", variant: "destructive" },
};

export default function Conciliacao() {
  const { transacoes, isLoading, updateTransacao } = useTransacoes();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransacoes = transacoes.filter((t: any) => {
    return (
      searchTerm === "" ||
      (t.descricao ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.categoria ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const conciliadas = transacoes.filter((t: any) => t.conciliado === true).length;
  const pendentes = transacoes.filter((t: any) => !t.conciliado).length;
  const total = transacoes.length;

  const handleConciliar = (t: any) => {
    updateTransacao.mutate({ id: t.id, conciliado: true });
    toast.success("Transação marcada como conciliada");
  };

  const handleDesconciliar = (t: any) => {
    updateTransacao.mutate({ id: t.id, conciliado: false });
    toast.info("Transação desmarcada");
  };

  const handleImportOFX = () => {
    toast.info("Importação OFX disponível na versão Enterprise");
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
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleImportOFX} data-testid="button-import-ofx">
        <Upload className="h-4 w-4" /> Importar OFX
      </Button>
      <Button variant="outline" size="sm" className="gap-2" data-testid="button-export">
        <Download className="h-4 w-4" /> Exportar
      </Button>
    </>
  );

  return (
    <MainLayout title="Conciliação Bancária" actions={headerActions}>
      <div className="space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conciliadas</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-conciliadas">{conciliadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-pendentes">{pendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">% Conciliado</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-pct">
                    {total > 0 ? Math.round((conciliadas / total) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtro */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transação..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transações para Conciliar</CardTitle>
            <CardDescription>{filteredTransacoes.length} transação(ões) encontrada(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTransacoes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransacoes.map((t: any) => (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20" data-testid={`row-transacao-${t.id}`}>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(t.data)}</td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-48 truncate">{t.descricao ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.categoria ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={t.tipo === "receita" ? "default" : "destructive"} className="text-xs">
                            {t.tipo === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${t.tipo === "receita" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                          {t.tipo === "despesa" ? "-" : "+"}{formatCurrency(t.valor ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={t.conciliado ? "default" : "outline"} className="text-xs">
                            {t.conciliado ? "Conciliado" : "Pendente"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${t.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!t.conciliado ? (
                                <DropdownMenuItem onClick={() => handleConciliar(t)} data-testid={`button-conciliar-${t.id}`}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Marcar como Conciliado
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleDesconciliar(t)} data-testid={`button-desconciliar-${t.id}`}>
                                  <AlertCircle className="h-4 w-4 mr-2 text-orange-600" />
                                  Desmarcar Conciliação
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toast.info("Vinculação OFX disponível na versão Enterprise")}>
                                <Link2 className="h-4 w-4 mr-2" />
                                Vincular Extrato OFX
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="Nenhuma transação encontrada"
                description="Registre transações financeiras para iniciar a conciliação"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
