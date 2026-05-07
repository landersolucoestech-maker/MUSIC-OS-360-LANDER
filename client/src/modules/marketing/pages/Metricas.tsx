import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Eye, Heart, Users, TrendingUp, Download, Link2, BarChart3 } from "lucide-react";

export default function MarketingMetricas() {
  const headerActions = (
    <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" data-testid="button-exportar-relatorio">
      <Download className="mr-2 h-4 w-4" />
      Exportar Relatório
    </Button>
  );

  return (
    <MainLayout title="Métricas e Resultados" description="Análise detalhada do desempenho das campanhas e redes sociais" actions={headerActions}>
      <div className="space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="metricas">
          <TabsList>
            <TabsTrigger value="metricas" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="avancado" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Marketing Avançado
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics & Benchmarks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metricas" className="mt-6 space-y-6">
            {/* Metrics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-t-2 border-t-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Alcance Total</span>
                    <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">—</p>
                  <p className="text-xs text-muted-foreground mt-1">impressões este mês</p>
                </CardContent>
              </Card>

              <Card className="border-t-2 border-t-success">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Engajamento</span>
                    <div className="w-7 h-7 rounded-md bg-success/10 border border-success/20 flex items-center justify-center">
                      <Heart className="h-3.5 w-3.5 text-success" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">—</p>
                  <p className="text-xs text-muted-foreground mt-1">taxa de interação</p>
                </CardContent>
              </Card>

              <Card className="border-t-2 border-t-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Seguidores</span>
                    <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">—</p>
                  <p className="text-xs text-muted-foreground mt-1">em todas as plataformas</p>
                </CardContent>
              </Card>

              <Card className="border-t-2 border-t-success">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">ROI Médio</span>
                    <div className="w-7 h-7 rounded-md bg-success/10 border border-success/20 flex items-center justify-center">
                      <TrendingUp className="h-3.5 w-3.5 text-success" />
                    </div>
                  </div>
                  <p className="text-xl font-mono font-semibold">0%</p>
                  <p className="text-xs text-muted-foreground mt-1">retorno sobre investimento</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Performance por Plataforma</CardTitle>
                  <CardDescription>Comparativo de desempenho entre as redes sociais</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Carregando métricas...
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultados das Campanhas</CardTitle>
                  <CardDescription>Performance detalhada das campanhas publicitárias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Nenhuma campanha encontrada
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="avancado" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Métricas avançadas de marketing em desenvolvimento.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Benchmarks e comparativos do mercado em desenvolvimento.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
