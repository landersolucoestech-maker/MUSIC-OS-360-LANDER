import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  TrendingUp, TrendingDown, DollarSign, Download, Loader2, RotateCcw,
} from "lucide-react";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { formatCurrency } from "@/shared/lib/format-utils";
import { exportToCSV } from "@/shared/lib/csv";

// ── helpers ──────────────────────────────────────────────────────────────────

function sum(arr: any[], field: string) {
  return arr.reduce((s, t) => s + (t[field] ?? 0), 0);
}

function groupByKey(arr: any[], key: string) {
  const map: Record<string, any[]> = {};
  arr.forEach((item) => {
    const k = item[key] ?? "Sem categoria";
    if (!map[k]) map[k] = [];
    map[k].push(item);
  });
  return map;
}

const CATEGORIA_LABELS: Record<string, string> = {
  royalties: "Royalties",
  "cachê": "Cachê de Shows",
  licenciamento: "Licenciamento",
  distribuicao: "Distribuição",
  patrocinio: "Patrocínio",
  adiantamento_artista: "Adiantamento a Artista",
  producao_musical: "Produção Musical",
  marketing_digital: "Marketing Digital",
  marketing_offline: "Marketing Offline",
  juridico: "Honorários Jurídicos",
  administrativo: "Administrativo",
  folha_pagamento: "Folha de Pagamento",
  producao_audiovisual: "Produção Audiovisual",
  infraestrutura: "Infraestrutura",
  software: "Software",
  seguros: "Seguros",
  distribuicao_digital: "Distribuição Digital",
};

function catLabel(cat: string) {
  return CATEGORIA_LABELS[cat] ?? cat;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCards({ totalReceitas, totalDespesas, lucroLiquido, margemLiquida }: {
  totalReceitas: number;
  totalDespesas: number;
  lucroLiquido: number;
  margemLiquida: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="metric-receitas">
                {formatCurrency(totalReceitas)}
              </p>
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
              <p className="text-sm text-muted-foreground">Despesa Total</p>
              <p className="text-lg font-bold text-destructive" data-testid="metric-despesas">
                {formatCurrency(totalDespesas)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${lucroLiquido >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
              <DollarSign className={`h-5 w-5 ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              <p
                className={`text-lg font-bold ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}
                data-testid="metric-lucro"
              >
                {lucroLiquido >= 0 ? "+" : ""}{formatCurrency(lucroLiquido)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RotateCcw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p
                className={`text-lg font-bold ${margemLiquida >= 0 ? "text-primary" : "text-destructive"}`}
                data-testid="metric-margem"
              >
                {margemLiquida.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PLTable({
  receitasPorCategoria,
  despesasPorCategoria,
  totalReceitas,
  totalDespesas,
  lucroLiquido,
  margemLiquida,
}: {
  receitasPorCategoria: { categoria: string; valor: number }[];
  despesasPorCategoria: { categoria: string; valor: number }[];
  totalReceitas: number;
  totalDespesas: number;
  lucroLiquido: number;
  margemLiquida: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Demonstrativo de Resultado (P&L)</CardTitle>
        <CardDescription>Receitas, despesas e resultado líquido do período</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">% Total Receita</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-green-500/5 border-b border-border">
                <td colSpan={3} className="px-4 py-2 font-semibold text-green-700 dark:text-green-400 text-xs uppercase tracking-wider">
                  Receitas
                </td>
              </tr>
              {receitasPorCategoria.map((r) => (
                <tr key={r.categoria} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2.5 pl-8 text-foreground">{catLabel(r.categoria)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-600 dark:text-green-400">{formatCurrency(r.valor)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {totalReceitas > 0 ? ((r.valor / totalReceitas) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              ))}
              <tr className="border-b-2 border-border bg-green-500/5">
                <td className="px-4 py-2.5 font-bold text-foreground">Total Receitas</td>
                <td className="px-4 py-2.5 text-right font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(totalReceitas)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-muted-foreground">100.0%</td>
              </tr>

              <tr className="bg-red-500/5 border-b border-border">
                <td colSpan={3} className="px-4 py-2 font-semibold text-destructive text-xs uppercase tracking-wider">
                  Despesas
                </td>
              </tr>
              {despesasPorCategoria.map((d) => (
                <tr key={d.categoria} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2.5 pl-8 text-foreground">{catLabel(d.categoria)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-destructive">({formatCurrency(d.valor)})</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {totalReceitas > 0 ? ((d.valor / totalReceitas) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              ))}
              <tr className="border-b-2 border-border bg-red-500/5">
                <td className="px-4 py-2.5 font-bold text-foreground">Total Despesas</td>
                <td className="px-4 py-2.5 text-right font-bold font-mono text-destructive">({formatCurrency(totalDespesas)})</td>
                <td className="px-4 py-2.5 text-right font-bold text-muted-foreground">
                  {totalReceitas > 0 ? ((totalDespesas / totalReceitas) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>

              <tr className={`border-t-2 border-border ${lucroLiquido >= 0 ? "bg-primary/5" : "bg-destructive/5"}`}>
                <td className="px-4 py-3 font-bold text-lg text-foreground">Lucro Líquido</td>
                <td className={`px-4 py-3 text-right font-bold font-mono text-lg ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
                  {lucroLiquido >= 0 ? "" : "("}{formatCurrency(Math.abs(lucroLiquido))}{lucroLiquido < 0 ? ")" : ""}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
                  {margemLiquida.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Contabilidade() {
  const { transacoes, isLoading } = useTransacoes();
  const { artistas } = useArtistas();
  const [activeTab, setActiveTab] = useState("todos");

  // ── Dados derivados globais ──────────────────────────────────────────────────
  const receitas = useMemo(() => transacoes.filter((t: any) => t.tipo === "receita"), [transacoes]);
  const despesas = useMemo(() => transacoes.filter((t: any) => t.tipo === "despesa"), [transacoes]);

  const totalReceitas = sum(receitas, "valor");
  const totalDespesas = sum(despesas, "valor");
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  const receitasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((t: any) => { const c = t.categoria ?? "Outras receitas"; map[c] = (map[c] ?? 0) + (t.valor ?? 0); });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [receitas]);

  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    despesas.forEach((t: any) => { const c = t.categoria ?? "Outras despesas"; map[c] = (map[c] ?? 0) + (t.valor ?? 0); });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  // ── P&L por Artista ──────────────────────────────────────────────────────────
  const plPorArtista = useMemo(() => {
    return artistas
      .map((a: any) => {
        const ts = transacoes.filter((t: any) => t.artista_id === a.id);
        const rec = ts.filter((t: any) => t.tipo === "receita");
        const des = ts.filter((t: any) => t.tipo === "despesa");
        const totalRec = sum(rec, "valor");
        const totalDes = sum(des, "valor");
        const lucro = totalRec - totalDes;
        const margem = totalRec > 0 ? (lucro / totalRec) * 100 : 0;
        return { id: a.id, nome: a.nome_artistico ?? a.nome ?? "—", totalRec, totalDes, lucro, margem };
      })
      .filter((a) => a.totalRec > 0 || a.totalDes > 0)
      .sort((a, b) => b.lucro - a.lucro);
  }, [transacoes, artistas]);

  // ── P&L por Projeto — cada transação é um "projeto" (descricao = nome) ───────
  const plPorProjeto = useMemo(() => {
    return transacoes
      .map((t: any) => ({
        id: t.id,
        nome: t.descricao ?? "—",
        categoria: t.categoria ?? "—",
        receita: t.tipo === "receita" ? (t.valor ?? 0) : 0,
        despesa: t.tipo === "despesa" ? (t.valor ?? 0) : 0,
        resultado: t.tipo === "receita" ? (t.valor ?? 0) : -(t.valor ?? 0),
      }))
      .sort((a, b) => b.resultado - a.resultado);
  }, [transacoes]);

  // ── Recoupment ───────────────────────────────────────────────────────────────
  const recoupment = useMemo(() => {
    return artistas
      .map((a: any) => {
        const ts = transacoes.filter((t: any) => t.artista_id === a.id);
        const investido = ts.filter((t: any) => t.tipo === "despesa").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
        const gerado = ts.filter((t: any) => t.tipo === "receita").reduce((s: number, t: any) => s + (t.valor ?? 0), 0);
        const saldo = gerado - investido;
        const pct = investido > 0 ? Math.min((gerado / investido) * 100, 100) : 100;
        return {
          id: a.id,
          nome: a.nome_artistico ?? a.nome ?? "—",
          investido,
          gerado,
          saldo,
          recouped: pct,
          status: saldo >= 0 ? "recouped" : "unrecouped",
        };
      })
      .filter((a) => a.investido > 0 || a.gerado > 0)
      .sort((a, b) => b.gerado - a.gerado);
  }, [transacoes, artistas]);

  const handleExport = () => {
    exportToCSV(
      [
        { secao: "Receitas", categoria: "TOTAL", valor: totalReceitas },
        ...receitasPorCategoria.map((r) => ({ secao: "Receita", categoria: catLabel(r.categoria), valor: r.valor })),
        { secao: "Despesas", categoria: "TOTAL", valor: totalDespesas },
        ...despesasPorCategoria.map((d) => ({ secao: "Despesa", categoria: catLabel(d.categoria), valor: d.valor })),
        { secao: "Resultado", categoria: "Lucro Líquido", valor: lucroLiquido },
      ],
      [
        { key: "secao", label: "Seção" },
        { key: "categoria", label: "Categoria" },
        { key: "valor", label: "Valor (R$)" },
      ],
      "pl-contabilidade",
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
      <Download className="h-4 w-4" /> Exportar P&L
    </Button>
  );

  return (
    <MainLayout title="Contabilidade" actions={headerActions}>
      <div className="space-y-6">

        {/* ── KPIs — sempre visíveis acima das abas ────────────────────────── */}
        <KpiCards
          totalReceitas={totalReceitas}
          totalDespesas={totalDespesas}
          lucroLiquido={lucroLiquido}
          margemLiquida={margemLiquida}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-contabilidade">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="todos" data-testid="tab-todos">Todos</TabsTrigger>
            <TabsTrigger value="por-projeto" data-testid="tab-por-projeto">P&amp;L por Projeto</TabsTrigger>
            <TabsTrigger value="por-artista" data-testid="tab-por-artista">P&amp;L por Artista</TabsTrigger>
            <TabsTrigger value="recoupment" data-testid="tab-recoupment">Recoupment</TabsTrigger>
          </TabsList>

          {/* ── ABA: TODOS ────────────────────────────────────────────────── */}
          <TabsContent value="todos" className="space-y-6 mt-6">
            <PLTable
              receitasPorCategoria={receitasPorCategoria}
              despesasPorCategoria={despesasPorCategoria}
              totalReceitas={totalReceitas}
              totalDespesas={totalDespesas}
              lucroLiquido={lucroLiquido}
              margemLiquida={margemLiquida}
            />
          </TabsContent>

          {/* ── ABA: P&L POR PROJETO ──────────────────────────────────────── */}
          <TabsContent value="por-projeto" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">P&amp;L por Projeto</CardTitle>
                <CardDescription>Resultado financeiro por lançamento e operação</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome do Projeto</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receitas</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Despesas</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plPorProjeto.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20" data-testid={`row-projeto-${p.id}`}>
                          <td className="px-4 py-2.5 font-medium text-foreground max-w-xs truncate">{p.nome}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{catLabel(p.categoria)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-green-600 dark:text-green-400">
                            {p.receita > 0 ? formatCurrency(p.receita) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-destructive">
                            {p.despesa > 0 ? `(${formatCurrency(p.despesa)})` : "—"}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold font-mono ${p.resultado >= 0 ? "text-primary" : "text-destructive"}`}>
                            {p.resultado >= 0 ? "+" : ""}{formatCurrency(p.resultado)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border bg-muted/40">
                        <td className="px-4 py-3 font-bold text-foreground" colSpan={2}>Total Geral</td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(totalReceitas)}</td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-destructive">({formatCurrency(totalDespesas)})</td>
                        <td className={`px-4 py-3 text-right font-bold font-mono ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
                          {lucroLiquido >= 0 ? "+" : ""}{formatCurrency(lucroLiquido)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA: P&L POR ARTISTA ─────────────────────────────────────── */}
          <TabsContent value="por-artista" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">P&amp;L por Artista</CardTitle>
                <CardDescription>Receitas, despesas e resultado por artista</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Artista</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receitas</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Despesas</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Resultado</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plPorArtista.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                            Nenhum artista com transações registradas
                          </td>
                        </tr>
                      ) : (
                        <>
                          {plPorArtista.map((a) => (
                            <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20" data-testid={`row-artista-${a.id}`}>
                              <td className="px-4 py-3 font-medium text-foreground">{a.nome}</td>
                              <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400">
                                {a.totalRec > 0 ? formatCurrency(a.totalRec) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-destructive">
                                {a.totalDes > 0 ? `(${formatCurrency(a.totalDes)})` : "—"}
                              </td>
                              <td className={`px-4 py-3 text-right font-bold font-mono ${a.lucro >= 0 ? "text-primary" : "text-destructive"}`}>
                                {a.lucro >= 0 ? "+" : ""}{formatCurrency(a.lucro)}
                              </td>
                              <td className={`px-4 py-3 text-right text-sm ${a.margem >= 0 ? "text-primary" : "text-destructive"}`}>
                                {a.margem.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-border bg-muted/40">
                            <td className="px-4 py-3 font-bold text-foreground">Total (artistas)</td>
                            <td className="px-4 py-3 text-right font-bold font-mono text-green-600 dark:text-green-400">
                              {formatCurrency(sum(plPorArtista, "totalRec"))}
                            </td>
                            <td className="px-4 py-3 text-right font-bold font-mono text-destructive">
                              ({formatCurrency(sum(plPorArtista, "totalDes"))})
                            </td>
                            <td className={`px-4 py-3 text-right font-bold font-mono ${sum(plPorArtista, "lucro") >= 0 ? "text-primary" : "text-destructive"}`}>
                              {sum(plPorArtista, "lucro") >= 0 ? "+" : ""}{formatCurrency(sum(plPorArtista, "lucro"))}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA: RECOUPMENT ──────────────────────────────────────────── */}
          <TabsContent value="recoupment" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recoupment por Artista</CardTitle>
                <CardDescription>Acompanhamento do retorno sobre investimento por artista</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {recoupment.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum dado de recoupment disponível
                  </p>
                ) : (
                  recoupment.map((a) => (
                    <div key={a.id} className="space-y-2" data-testid={`row-recoupment-${a.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">{a.nome}</span>
                          <Badge
                            variant={a.status === "recouped" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {a.status === "recouped" ? "Recoupado" : "Unrecouped"}
                          </Badge>
                        </div>
                        <span className={`text-sm font-semibold ${a.saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                          {a.saldo >= 0 ? "+" : ""}{formatCurrency(a.saldo)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${a.status === "recouped" ? "bg-primary" : "bg-destructive"}`}
                            style={{ width: `${Math.min(a.recouped, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{a.recouped.toFixed(0)}%</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Investido: <span className="text-destructive font-medium">{formatCurrency(a.investido)}</span></span>
                        <span>Gerado: <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(a.gerado)}</span></span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </MainLayout>
  );
}
