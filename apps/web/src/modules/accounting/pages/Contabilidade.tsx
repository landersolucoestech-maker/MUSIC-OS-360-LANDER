import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  TrendingUp, TrendingDown, DollarSign, Download, Loader2, RotateCcw,
} from "lucide-react";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { formatCurrency } from "@/shared/lib/format-utils";
import { exportToCSV } from "@/shared/lib/csv";
import { FeatureGate } from '@/shared/components/FeatureGate';

// ── helpers ───────────────────────────────────────────────────────────────────

function sum(arr: any[], field: string) {
  return arr.reduce((s, t) => s + (t[field] ?? 0), 0);
}

const CATEGORIA_LABELS: Record<string, string> = {
  "recebimentos externos de direitos": "Recebimentos externos de direitos",
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

// ── KPI cards ─────────────────────────────────────────────────────────────────

function KpiCards({
  totalReceitas, totalDespesas, lucroLiquido, margemLiquida,
}: {
  totalReceitas: number; totalDespesas: number; lucroLiquido: number; margemLiquida: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="metric-receitas">{formatCurrency(totalReceitas)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg"><TrendingDown className="h-5 w-5 text-red-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Despesa Total</p>
              <p className="text-lg font-bold text-destructive" data-testid="metric-despesas">{formatCurrency(totalDespesas)}</p>
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
              <p className={`text-lg font-bold ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`} data-testid="metric-lucro">
                {lucroLiquido >= 0 ? "+" : ""}{formatCurrency(lucroLiquido)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><RotateCcw className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p className={`text-lg font-bold ${margemLiquida >= 0 ? "text-primary" : "text-destructive"}`} data-testid="metric-margem">
                {margemLiquida.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Demonstrativo P&L (empresa) ───────────────────────────────────────────────

function PLEmpresaTable({
  receitasPorCategoria, despesasPorCategoria,
  totalReceitas, totalDespesas, lucroLiquido, margemLiquida,
}: {
  receitasPorCategoria: { categoria: string; valor: number }[];
  despesasPorCategoria: { categoria: string; valor: number }[];
  totalReceitas: number; totalDespesas: number; lucroLiquido: number; margemLiquida: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Demonstrativo de Resultado (P&L)</CardTitle>
        <CardDescription>Receitas e despesas por categoria no período</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">% Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-green-500/5">
              <TableCell colSpan={3} className="font-semibold text-green-700 dark:text-green-400 text-xs uppercase tracking-wider">Receitas</TableCell>
            </TableRow>
            {receitasPorCategoria.map((r) => (
              <TableRow key={r.categoria}>
                <TableCell className="pl-8 text-foreground">{catLabel(r.categoria)}</TableCell>
                <TableCell className="text-right font-mono text-green-600 dark:text-green-400">{formatCurrency(r.valor)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totalReceitas > 0 ? ((r.valor / totalReceitas) * 100).toFixed(1) : "0.0"}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-green-500/5 border-b-2">
              <TableCell className="font-bold text-foreground">Total Receitas</TableCell>
              <TableCell className="text-right font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(totalReceitas)}</TableCell>
              <TableCell className="text-right font-bold text-muted-foreground">100.0%</TableCell>
            </TableRow>

            <TableRow className="bg-red-500/5">
              <TableCell colSpan={3} className="font-semibold text-destructive text-xs uppercase tracking-wider">Despesas</TableCell>
            </TableRow>
            {despesasPorCategoria.map((d) => (
              <TableRow key={d.categoria}>
                <TableCell className="pl-8 text-foreground">{catLabel(d.categoria)}</TableCell>
                <TableCell className="text-right font-mono text-destructive">({formatCurrency(d.valor)})</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totalReceitas > 0 ? ((d.valor / totalReceitas) * 100).toFixed(1) : "0.0"}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-red-500/5 border-b-2">
              <TableCell className="font-bold text-foreground">Total Despesas</TableCell>
              <TableCell className="text-right font-bold font-mono text-destructive">({formatCurrency(totalDespesas)})</TableCell>
              <TableCell className="text-right font-bold text-muted-foreground">
                {totalReceitas > 0 ? ((totalDespesas / totalReceitas) * 100).toFixed(1) : "0.0"}%
              </TableCell>
            </TableRow>

            <TableRow className={lucroLiquido >= 0 ? "bg-primary/5 border-t-2" : "bg-destructive/5 border-t-2"}>
              <TableCell className="font-bold text-lg text-foreground">Lucro Líquido</TableCell>
              <TableCell className={`text-right font-bold font-mono text-lg ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
                {lucroLiquido >= 0 ? "" : "("}{formatCurrency(Math.abs(lucroLiquido))}{lucroLiquido < 0 ? ")" : ""}
              </TableCell>
              <TableCell className={`text-right font-bold ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
                {margemLiquida.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Contabilidade() {
  const { transacoes, isLoading } = useTransacoes();
  const { artistas } = useArtistas();
  const [activeTab, setActiveTab] = useState("todos");

  const receitas = useMemo(() => transacoes.filter((t: any) => t.tipo === "receita"), [transacoes]);
  const despesas = useMemo(() => transacoes.filter((t: any) => t.tipo === "despesa"), [transacoes]);

  const totalReceitas = sum(receitas, "valor");
  const totalDespesas = sum(despesas, "valor");
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  const receitasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((t: any) => { const c = t.categoria ?? "outras"; map[c] = (map[c] ?? 0) + (t.valor ?? 0); });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [receitas]);

  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    despesas.forEach((t: any) => { const c = t.categoria ?? "outras"; map[c] = (map[c] ?? 0) + (t.valor ?? 0); });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  // ── P&L por Projeto (cada transação = 1 projeto) ──────────────────────────
  const plPorProjeto = useMemo(() =>
    transacoes
      .map((t: any) => ({
        id: t.id,
        nome: t.descricao ?? "—",
        categoria: t.categoria ?? "—",
        receita: t.tipo === "receita" ? (t.valor ?? 0) : 0,
        despesa: t.tipo === "despesa" ? (t.valor ?? 0) : 0,
        resultado: t.tipo === "receita" ? (t.valor ?? 0) : -(t.valor ?? 0),
      }))
      .sort((a, b) => b.resultado - a.resultado),
  [transacoes]);

  // ── P&L por Artista ───────────────────────────────────────────────────────
  const plPorArtista = useMemo(() =>
    artistas
      .map((a: any) => {
        const ts = transacoes.filter((t: any) => t.artista_id === a.id);
        const totalRec = sum(ts.filter((t: any) => t.tipo === "receita"), "valor");
        const totalDes = sum(ts.filter((t: any) => t.tipo === "despesa"), "valor");
        const lucro = totalRec - totalDes;
        return { id: a.id, nome: a.nome_artistico ?? a.nome ?? "—", totalRec, totalDes, lucro, margem: totalRec > 0 ? (lucro / totalRec) * 100 : 0 };
      })
      .filter((a) => a.totalRec > 0 || a.totalDes > 0)
      .sort((a, b) => b.lucro - a.lucro),
  [transacoes, artistas]);

  const handleExport = () => {
    exportToCSV(
      [
        { secao: "Receitas", categoria: "TOTAL", valor: totalReceitas },
        ...receitasPorCategoria.map((r) => ({ secao: "Receita", categoria: catLabel(r.categoria), valor: r.valor })),
        { secao: "Despesas", categoria: "TOTAL", valor: totalDespesas },
        ...despesasPorCategoria.map((d) => ({ secao: "Despesa", categoria: catLabel(d.categoria), valor: d.valor })),
        { secao: "Resultado", categoria: "Lucro Líquido", valor: lucroLiquido },
      ],
      [{ key: "secao", label: "Seção" }, { key: "categoria", label: "Categoria" }, { key: "valor", label: "Valor (R$)" }],
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

  const plEmpresaProps = { receitasPorCategoria, despesasPorCategoria, totalReceitas, totalDespesas, lucroLiquido, margemLiquida };

  return (
    <FeatureGate feature="moduleAccounting" featureName="Contabilidade">
    <MainLayout
      title="Contabilidade"
      actions={
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} data-testid="button-export">
          <Download className="h-4 w-4" /> Exportar P&L
        </Button>
      }
    >
      <div className="space-y-6">

        {/* KPIs — sempre visíveis acima das abas */}
        <KpiCards totalReceitas={totalReceitas} totalDespesas={totalDespesas} lucroLiquido={lucroLiquido} margemLiquida={margemLiquida} />

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-contabilidade">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="todos" data-testid="tab-todos">Todos</TabsTrigger>
            <TabsTrigger value="empresa" data-testid="tab-empresa">P&amp;L Empresa</TabsTrigger>
            <TabsTrigger value="projetos" data-testid="tab-projetos">P&amp;L Projetos</TabsTrigger>
            <TabsTrigger value="artistas" data-testid="tab-artistas">P&amp;L Artistas</TabsTrigger>
          </TabsList>

          {/* ── TODOS: todas as visões empilhadas ────────────────────────── */}
          <TabsContent value="todos" className="space-y-6 mt-6">
            <PLEmpresaTable {...plEmpresaProps} />

            {/* Projetos (compacto) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">P&amp;L por Projeto</CardTitle>
                <CardDescription>Resultado por lançamento e operação</CardDescription>
              </CardHeader>
              <CardContent className="p-0 max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Projeto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plPorProjeto.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium max-w-xs truncate">{p.nome}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{catLabel(p.categoria)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400 text-xs">{p.receita > 0 ? formatCurrency(p.receita) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-destructive text-xs">{p.despesa > 0 ? `(${formatCurrency(p.despesa)})` : "—"}</TableCell>
                        <TableCell className={`text-right font-bold font-mono text-xs ${p.resultado >= 0 ? "text-primary" : "text-destructive"}`}>
                          {p.resultado >= 0 ? "+" : ""}{formatCurrency(p.resultado)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Artistas (compacto) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">P&amp;L por Artista</CardTitle>
                <CardDescription>Resultado por artista no período</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artista</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plPorArtista.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.nome}</TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400 text-xs">{a.totalRec > 0 ? formatCurrency(a.totalRec) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-destructive text-xs">{a.totalDes > 0 ? `(${formatCurrency(a.totalDes)})` : "—"}</TableCell>
                        <TableCell className={`text-right font-bold font-mono text-xs ${a.lucro >= 0 ? "text-primary" : "text-destructive"}`}>
                          {a.lucro >= 0 ? "+" : ""}{formatCurrency(a.lucro)}
                        </TableCell>
                        <TableCell className={`text-right text-xs ${a.margem >= 0 ? "text-primary" : "text-destructive"}`}>
                          {a.margem.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── P&L EMPRESA ──────────────────────────────────────────────── */}
          <TabsContent value="empresa" className="space-y-4 mt-6">
            <PLEmpresaTable {...plEmpresaProps} />
          </TabsContent>

          {/* ── P&L PROJETOS ─────────────────────────────────────────────── */}
          <TabsContent value="projetos" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">P&amp;L por Projeto</CardTitle>
                <CardDescription>Resultado financeiro por lançamento e operação</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Projeto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plPorProjeto.map((p) => (
                      <TableRow key={p.id} data-testid={`row-projeto-${p.id}`}>
                        <TableCell className="font-medium max-w-xs truncate">{p.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{catLabel(p.categoria)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">{p.receita > 0 ? formatCurrency(p.receita) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{p.despesa > 0 ? `(${formatCurrency(p.despesa)})` : "—"}</TableCell>
                        <TableCell className={`text-right font-bold font-mono ${p.resultado >= 0 ? "text-primary" : "text-destructive"}`}>
                          {p.resultado >= 0 ? "+" : ""}{formatCurrency(p.resultado)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 bg-muted/40">
                      <TableCell className="font-bold" colSpan={2}>Total Geral</TableCell>
                      <TableCell className="text-right font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(totalReceitas)}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-destructive">({formatCurrency(totalDespesas)})</TableCell>
                      <TableCell className={`text-right font-bold font-mono ${lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
                        {lucroLiquido >= 0 ? "+" : ""}{formatCurrency(lucroLiquido)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── P&L ARTISTAS ─────────────────────────────────────────────── */}
          <TabsContent value="artistas" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">P&amp;L por Artista</CardTitle>
                <CardDescription>Receitas, despesas e resultado por artista</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artista</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plPorArtista.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                          Nenhum artista com transações registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {plPorArtista.map((a) => (
                          <TableRow key={a.id} data-testid={`row-artista-${a.id}`}>
                            <TableCell className="font-medium">{a.nome}</TableCell>
                            <TableCell className="text-right font-mono text-green-600 dark:text-green-400">{a.totalRec > 0 ? formatCurrency(a.totalRec) : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-destructive">{a.totalDes > 0 ? `(${formatCurrency(a.totalDes)})` : "—"}</TableCell>
                            <TableCell className={`text-right font-bold font-mono ${a.lucro >= 0 ? "text-primary" : "text-destructive"}`}>
                              {a.lucro >= 0 ? "+" : ""}{formatCurrency(a.lucro)}
                            </TableCell>
                            <TableCell className={`text-right text-sm ${a.margem >= 0 ? "text-primary" : "text-destructive"}`}>
                              {a.margem.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 bg-muted/40">
                          <TableCell className="font-bold">Total (artistas)</TableCell>
                          <TableCell className="text-right font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(sum(plPorArtista, "totalRec"))}</TableCell>
                          <TableCell className="text-right font-bold font-mono text-destructive">({formatCurrency(sum(plPorArtista, "totalDes"))})</TableCell>
                          <TableCell className={`text-right font-bold font-mono ${sum(plPorArtista, "lucro") >= 0 ? "text-primary" : "text-destructive"}`}>
                            {sum(plPorArtista, "lucro") >= 0 ? "+" : ""}{formatCurrency(sum(plPorArtista, "lucro"))}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </MainLayout>
    </FeatureGate>
  );
}
