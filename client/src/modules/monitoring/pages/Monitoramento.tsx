import { useState, useMemo } from "react";
import { formatDate } from "@/shared/lib/format-utils";
import { ECADViewModal } from "@/modules/monitoring/components/ECADViewModal";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Radio, Clock, AlertTriangle, CheckCircle, FileText, Upload, Search, RefreshCw, Music } from "lucide-react";
import { EmptyState } from "@/shared/components/EmptyState";
import { useDeteccoes } from "@/modules/monitoring/hooks/useDeteccoes";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "confirmado":
    case "recebido":   return <Badge className="bg-success capitalize text-[#000000]">{status}</Badge>;
    case "pendente":   return <Badge className="bg-warning capitalize text-[#000000]">{status}</Badge>;
    case "nao_reportado":
    case "não reportado": return <Badge className="bg-destructive">Não Reportado</Badge>;
    case "processado": return <Badge className="bg-success capitalize text-[#000000]">{status}</Badge>;
    default:           return <Badge variant="secondary" className="capitalize">{status?.replace(/_/g, " ")}</Badge>;
  }
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n);

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default function Monitoramento() {
  const [activeTab, setActiveTab] = useState("deteccao");
  const [search, setSearch] = useState("");
  const [ecadModalOpen, setEcadModalOpen] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState<any>(null);

  const { deteccoes, isLoading: loadingDet } = useDeteccoes();
  const { obras, isLoading: loadingObras } = useObras();
  const ecadResult = useDataQuery<any>({
    queryKey: ["relatorios_ecad"],
    table: "relatorios_ecad",
    orderBy: { column: "data_referencia", ascending: false },
  });
  const ecadPeriodos: any[] = ecadResult.data ?? [];

  const obraMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const o of obras as any[]) { if (o.id) m.set(o.id, o); }
    return m;
  }, [obras]);

  const totalDeteccoes = deteccoes.length;
  const pendentes = deteccoes.filter((d: any) => d.status?.toLowerCase() === "pendente").length;
  const naoReportados = deteccoes.filter((d: any) => d.status?.toLowerCase() === "nao_reportado" || d.status?.toLowerCase() === "não reportado").length;
  const confirmados = deteccoes.filter((d: any) => d.status?.toLowerCase() === "confirmado").length;
  const taxaMatch = totalDeteccoes > 0 ? Math.round((confirmados / totalDeteccoes) * 100) : 0;

  const filteredDeteccoes = deteccoes.filter((d: any) => {
    if (!search) return true;
    const obra = obraMap.get(d.obra_id);
    const titulo = obra?.titulo ?? "";
    return (
      titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.plataforma?.toLowerCase().includes(search.toLowerCase()) ||
      d.periodo?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <MainLayout title="Monitoramento" description="Detecte execuções em rádio, TV e reconcilie com ECAD">
      <div className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Detecções Hoje</span>
                <Radio className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{loadingDet ? "—" : totalDeteccoes}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendentes</span>
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{loadingDet ? "—" : pendentes}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Não Reportados</span>
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{loadingDet ? "—" : naoReportados}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Match</span>
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{loadingDet ? "—" : `${taxaMatch}%`}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "deteccao" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("deteccao")}
            className={activeTab === "deteccao" ? "gap-2 bg-muted text-foreground hover:bg-muted" : "gap-2"}
          >
            <Radio className="h-4 w-4" />Detecção Rádio/TV
          </Button>
          <Button
            variant={activeTab === "ecad" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("ecad")}
            className={activeTab === "ecad" ? "gap-2 bg-muted text-foreground hover:bg-muted" : "gap-2"}
          >
            <FileText className="h-4 w-4" />ECAD
          </Button>
          <Button
            variant={activeTab === "divergencias" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("divergencias")}
            className={activeTab === "divergencias" ? "gap-2 bg-muted text-foreground hover:bg-muted" : "gap-2"}
          >
            <AlertTriangle className="h-4 w-4" />Divergências ({naoReportados})
          </Button>
        </div>

        {activeTab === "deteccao" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg">Detecções de Execução</CardTitle>
                <CardDescription>Execuções detectadas em plataformas digitais</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 w-64 bg-background"
                  />
                </div>
                <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredDeteccoes.length > 0 ? (
                filteredDeteccoes.map((det: any) => {
                  const obra = obraMap.get(det.obra_id);
                  return (
                    <div key={det.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{obra?.titulo ?? det.obra_id}</h3>
                        <p className="text-sm text-muted-foreground">{det.plataforma}</p>
                      </div>
                      <div className="hidden lg:flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs block">Período</span>
                          <p className="font-medium">{det.periodo ? formatDate(det.periodo + "-01") : "-"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Execuções</span>
                          <p className="font-medium">{fmt(det.quantidade ?? 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Valor</span>
                          <p className="font-medium">{fmtBRL(det.valor ?? 0)}</p>
                        </div>
                      </div>
                      <div>{getStatusBadge(det.status ?? "")}</div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={Radio}
                  title="Nenhuma detecção registrada"
                  description="As detecções de execução aparecerão aqui automaticamente"
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "ecad" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Conciliação ECAD</CardTitle>
                <CardDescription>Relatórios de royalties por período</CardDescription>
              </div>
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                <Upload className="h-4 w-4" />Importar Relatório ECAD
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {ecadPeriodos.length > 0 ? (
                ecadPeriodos.map((periodo: any) => (
                  <Card key={periodo.id} className="bg-muted/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Período: {periodo.periodo}</p>
                          <p className="text-sm text-muted-foreground">
                            {fmtBRL(periodo.valor_total ?? 0)} • {periodo.observacoes}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(periodo.status ?? "")}
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPeriodo(periodo); setEcadModalOpen(true); }}>Ver Detalhes</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Nenhum relatório ECAD importado"
                  description="Importe relatórios do ECAD para conciliação"
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "divergencias" && (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={AlertTriangle}
                title="Nenhuma divergência encontrada"
                description="Todas as execuções estão conciliadas"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <ECADViewModal
        open={ecadModalOpen}
        onOpenChange={setEcadModalOpen}
        periodo={selectedPeriodo}
      />
    </MainLayout>
  );
}
