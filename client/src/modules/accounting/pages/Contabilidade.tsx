import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Calendar, RefreshCw, FileText, Calculator, Users, Briefcase } from "lucide-react";
import { useFechamentos } from "@/modules/accounting/hooks/useFechamentos";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { formatCurrency } from "@/shared/lib/format-utils";
import { EmptyState } from "@/shared/components/EmptyState";

const periodoLabel = (p: string) => {
  const [y, m] = p.split("-");
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
};

export default function Contabilidade() {
  const [activeTab, setActiveTab] = useState<"fechamento" | "pl-projeto" | "pl-artista" | "recoupment">("fechamento");
  const { fechamentos, isLoading: loadingFech } = useFechamentos();
  const { transacoes } = useTransacoes();
  const { artistas } = useArtistas();
  const { projetos } = useProjetos();
  const { contratos } = useContratos();

  // KPIs do mês atual
  const fechAberto = fechamentos.find(f => f.status === "aberto") || fechamentos[0];
  const totalReceitas = fechAberto?.receitas || 0;
  const totalDespesas = fechAberto?.despesas || 0;
  const lucroLiquido = totalReceitas - totalDespesas;
  const periodosFechados = fechamentos.filter(f => f.status === "fechado").length;

  // P&L por Projeto
  const plProjetos = useMemo(() => {
    return projetos.map((p: any) => {
      const txs = transacoes.filter((t: any) => t.projeto_id === p.id);
      const receitas = txs.filter((t: any) => t.tipo === "receita").reduce((a: number, t: any) => a + (t.valor || 0), 0);
      const despesas = txs.filter((t: any) => t.tipo === "despesa").reduce((a: number, t: any) => a + (t.valor || 0), 0);
      const lucro = receitas - despesas;
      const margem = receitas > 0 ? ((lucro / receitas) * 100).toFixed(1) + "%" : "—";
      return { id: p.id, projeto: p.titulo, tipo: p.tipo, receitas, despesas, lucro, margem };
    }).filter(p => p.receitas > 0 || p.despesas > 0);
  }, [projetos, transacoes]);

  // P&L por Artista
  const plArtistas = useMemo(() => {
    return artistas.map((a: any) => {
      const txs = transacoes.filter((t: any) => t.artista_id === a.id);
      const receitas = txs.filter((t: any) => t.tipo === "receita").reduce((acc: number, t: any) => acc + (t.valor || 0), 0);
      const despesas = txs.filter((t: any) => t.tipo === "despesa").reduce((acc: number, t: any) => acc + (t.valor || 0), 0);
      const lucro = receitas - despesas;
      const margem = receitas > 0 ? ((lucro / receitas) * 100).toFixed(1) + "%" : "—";
      return { id: a.id, artista: a.nome_artistico || a.nome, receitas, despesas, lucro, margem };
    }).filter(a => a.receitas > 0 || a.despesas > 0);
  }, [artistas, transacoes]);

  // Recoupment: contratos artísticos com adiantamento (heuristic: valor do contrato é adiantamento, recoupado = receitas geradas)
  const recoupments = useMemo(() => {
    return contratos
      .filter((c: any) => c.artista_id && (c.valor || 0) > 0)
      .map((c: any) => {
        const artista = artistas.find((a: any) => a.id === c.artista_id);
        const adiantamento = c.valor || 0;
        const recoupado = transacoes
          .filter((t: any) => t.artista_id === c.artista_id && t.tipo === "receita" && t.data >= c.data_inicio)
          .reduce((acc: number, t: any) => acc + (t.valor || 0), 0);
        const recoupadoCap = Math.min(recoupado, adiantamento);
        const saldo = Math.max(0, adiantamento - recoupado);
        const progresso = adiantamento > 0 ? Math.min(100, Math.round((recoupado / adiantamento) * 100)) : 0;
        return {
          id: c.id,
          artista: artista?.nome_artistico || artista?.nome || c.titulo,
          contrato: c.titulo,
          adiantamento,
          recoupado: recoupadoCap,
          saldo,
          progresso,
        };
      });
  }, [contratos, transacoes, artistas]);

  return (
    <MainLayout title="Contabilidade" description="Fechamento de período, P&L e recoupment">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-t-2 border-t-success">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Receitas do Mês</span>
                <div className="w-7 h-7 rounded-md bg-success/10 border border-success/20 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
              </div>
              <p className="text-lg font-mono font-semibold text-foreground" data-testid="text-kpi-receitas">{formatCurrency(totalReceitas)}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-destructive">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Despesas do Mês</span>
                <div className="w-7 h-7 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                </div>
              </div>
              <p className="text-lg font-mono font-semibold text-foreground" data-testid="text-kpi-despesas">{formatCurrency(totalDespesas)}</p>
            </CardContent>
          </Card>
          <Card className={`border-t-2 ${lucroLiquido >= 0 ? "border-t-success" : "border-t-destructive"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Resultado</span>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${lucroLiquido >= 0 ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
                  <DollarSign className={`h-3.5 w-3.5 ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`} />
                </div>
              </div>
              <p className={`text-lg font-mono font-semibold ${lucroLiquido >= 0 ? "text-success" : "text-destructive"}`} data-testid="text-kpi-resultado">{formatCurrency(lucroLiquido)}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Períodos Fechados</span>
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <p className="text-lg font-mono font-semibold text-foreground" data-testid="text-kpi-fechados">{periodosFechados}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={activeTab === "fechamento" ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5" onClick={() => setActiveTab("fechamento")} data-testid="tab-fechamento">
            <Calendar className="h-3.5 w-3.5" />Fechamento de Período
          </Button>
          <Button variant={activeTab === "pl-projeto" ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5" onClick={() => setActiveTab("pl-projeto")} data-testid="tab-pl-projeto">
            <Briefcase className="h-3.5 w-3.5" />P&L por Projeto
          </Button>
          <Button variant={activeTab === "pl-artista" ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5" onClick={() => setActiveTab("pl-artista")} data-testid="tab-pl-artista">
            <Users className="h-3.5 w-3.5" />P&L por Artista
          </Button>
          <Button variant={activeTab === "recoupment" ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5" onClick={() => setActiveTab("recoupment")} data-testid="tab-recoupment">
            <RefreshCw className="h-3.5 w-3.5" />Recoupment
          </Button>
        </div>

        {/* FECHAMENTO */}
        {activeTab === "fechamento" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Fechamento Contábil de Períodos</CardTitle>
              <CardDescription>Demonstrativo mensal de receitas, despesas e resultado.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFech ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
              ) : fechamentos.length === 0 ? (
                <EmptyState icon={Calendar} title="Nenhum fechamento de período" description="Realize o fechamento de período para gerar demonstrativos contábeis." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Fechamento</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fechamentos.map((f) => (
                      <TableRow key={f.id} data-testid={`row-fechamento-${f.periodo}`}>
                        <TableCell className="font-medium">{periodoLabel(f.periodo)}</TableCell>
                        <TableCell>
                          {f.status === "fechado"
                            ? <Badge className="bg-success">Fechado</Badge>
                            : <Badge className="bg-warning text-warning-foreground">Aberto</Badge>}
                        </TableCell>
                        <TableCell>{f.data_fechamento ? new Date(f.data_fechamento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell className="text-right text-success font-mono">{formatCurrency(f.receitas)}</TableCell>
                        <TableCell className="text-right text-destructive font-mono">{formatCurrency(f.despesas)}</TableCell>
                        <TableCell className={`text-right font-semibold font-mono ${f.resultado >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(f.resultado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* P&L PROJETO */}
        {activeTab === "pl-projeto" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">P&L por Projeto</CardTitle>
              <CardDescription>Lucro e margem por projeto cadastrado, baseado em transações vinculadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {plProjetos.length === 0 ? (
                <EmptyState icon={Briefcase} title="Nenhum projeto com movimentação" description="Vincule transações financeiras a projetos para ver o P&L." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plProjetos.map((p) => (
                      <TableRow key={p.id} data-testid={`row-pl-projeto-${p.id}`}>
                        <TableCell className="font-medium">{p.projeto}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{p.tipo}</Badge></TableCell>
                        <TableCell className="text-right text-success font-mono">{formatCurrency(p.receitas)}</TableCell>
                        <TableCell className="text-right text-destructive font-mono">{formatCurrency(p.despesas)}</TableCell>
                        <TableCell className={`text-right font-semibold font-mono ${p.lucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(p.lucro)}</TableCell>
                        <TableCell className="text-right"><Badge variant="outline" className="font-mono">{p.margem}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* P&L ARTISTA */}
        {activeTab === "pl-artista" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">P&L por Artista</CardTitle>
              <CardDescription>Receitas, despesas e margem geradas por cada artista do roster.</CardDescription>
            </CardHeader>
            <CardContent>
              {plArtistas.length === 0 ? (
                <EmptyState icon={Users} title="Nenhum artista com movimentação" description="Vincule transações a artistas para ver o P&L." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artista</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plArtistas.map((a) => (
                      <TableRow key={a.id} data-testid={`row-pl-artista-${a.id}`}>
                        <TableCell className="font-medium">{a.artista}</TableCell>
                        <TableCell className="text-right text-success font-mono">{formatCurrency(a.receitas)}</TableCell>
                        <TableCell className="text-right text-destructive font-mono">{formatCurrency(a.despesas)}</TableCell>
                        <TableCell className={`text-right font-semibold font-mono ${a.lucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(a.lucro)}</TableCell>
                        <TableCell className="text-right"><Badge variant="outline" className="font-mono">{a.margem}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* RECOUPMENT */}
        {activeTab === "recoupment" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recoupment de Adiantamentos</CardTitle>
              <CardDescription>Acompanhamento da recuperação de adiantamentos contratuais por artista.</CardDescription>
            </CardHeader>
            <CardContent>
              {recoupments.length === 0 ? (
                <EmptyState icon={RefreshCw} title="Nenhum contrato com adiantamento" description="Cadastre contratos artísticos com valor para acompanhar o recoupment." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artista / Contrato</TableHead>
                      <TableHead className="text-right">Adiantamento</TableHead>
                      <TableHead className="text-right">Recoupado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Progresso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recoupments.map((r) => (
                      <TableRow key={r.id} data-testid={`row-recoupment-${r.id}`}>
                        <TableCell>
                          <div className="font-medium">{r.artista}</div>
                          <div className="text-xs text-muted-foreground">{r.contrato}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(r.adiantamento)}</TableCell>
                        <TableCell className="text-right text-success font-mono">{formatCurrency(r.recoupado)}</TableCell>
                        <TableCell className={`text-right font-mono ${r.saldo === 0 ? "text-success font-semibold" : "text-warning"}`}>{formatCurrency(r.saldo)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full ${r.progresso === 100 ? "bg-success" : "bg-primary"}`} style={{ width: `${r.progresso}%` }} />
                            </div>
                            <Badge variant={r.progresso === 100 ? "default" : "secondary"} className={`font-mono ${r.progresso === 100 ? "bg-success" : ""}`}>{r.progresso}%</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
