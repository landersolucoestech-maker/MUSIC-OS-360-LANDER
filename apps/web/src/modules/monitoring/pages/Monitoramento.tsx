import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { formatDate } from "@/shared/lib/format-utils";
import { ECADViewModal } from "@/modules/monitoring/components/ECADViewModal";
import { MainLayout } from "@/shared/components/MainLayout";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Radio, Clock, AlertTriangle, CheckCircle, FileText, Upload, Search, RefreshCw, X, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { EmptyState } from "@/shared/components/EmptyState";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { EcadIcon } from "@/shared/ui/brand-icons";
import { useDeteccoes } from "@/modules/monitoring/hooks/useDeteccoes";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { FeatureGate } from '@/shared/components/FeatureGate';

const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "confirmado":
    case "recebido":   return <Badge variant="success" className="capitalize">{status}</Badge>;
    case "pendente":   return <Badge variant="warning" className="capitalize">{status}</Badge>;
    case "nao_reportado":
    case "não reportado": return <Badge variant="danger">Não Reportado</Badge>;
    case "processado": return <Badge variant="success" className="capitalize">{status}</Badge>;
    default:           return <Badge variant="neutral">{status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>;
  }
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n);

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type MonitoringTab = "deteccao" | "ecad" | "divergencias" | "protecao_catalogo";

export default function Monitoramento() {
  const [activeTab, setActiveTab] = useState<MonitoringTab>("deteccao");
  const [search, setSearch] = useState("");
  const [ecadModalOpen, setEcadModalOpen] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState<any>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    if (!importFile) return;
    // Importação real de relatório ECAD requer endpoint no backend; nunca
    // simular progresso nem sucesso fictício (ver EcadImportModal.tsx, que
    // segue o mesmo padrão honesto).
    toast.error(
      "Importação de relatório ECAD ainda não está disponível (requer endpoint real no backend).",
    );
  };

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
              <div className="flex items-center justify-between mb-3">
                <span className="stat-label">Detecções Hoje</span>
                <Radio className="h-4 w-4 text-primary" />
              </div>
              <span className="stat-value">{loadingDet ? "—" : totalDeteccoes}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="stat-label">Pendentes</span>
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <span className="stat-value">{loadingDet ? "—" : pendentes}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="stat-label">Não Reportados</span>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <span className="stat-value">{loadingDet ? "—" : naoReportados}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="stat-label">Taxa de Match</span>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <span className="stat-value">{loadingDet ? "—" : `${taxaMatch}%`}</span>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <EcadIcon className="h-4 w-4" />ECAD
          </Button>
          <Button
            variant={activeTab === "divergencias" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("divergencias")}
            className={activeTab === "divergencias" ? "gap-2 bg-muted text-foreground hover:bg-muted" : "gap-2"}
          >
            <AlertTriangle className="h-4 w-4" />Divergências ({naoReportados})
          </Button>
          <Button
            variant={activeTab === "protecao_catalogo" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("protecao_catalogo")}
            className={activeTab === "protecao_catalogo" ? "gap-2 bg-muted text-foreground hover:bg-muted" : "gap-2"}
          >
            <Shield className="h-4 w-4" />Proteção de Catálogo
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
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-8 pl-9 text-sm bg-card border-border"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8"><RefreshCw className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredDeteccoes.length > 0 ? (
                <FeatureGate feature="moduleMonitoring" featureName="Monitoramento">
                  <>
                  <ListSectionHeader
                    title="Lista de Detecções"
                    count={filteredDeteccoes.length}
                    description="Acompanhe execuções detectadas, plataformas, matches e valores estimados"
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Obra</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Execuções</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeteccoes.map((det: any) => {
                        const obra = obraMap.get(det.obra_id);
                        return (
                          <TableRow key={det.id}>
                            <TableCell className="font-medium">{obra?.titulo ?? det.obra_id}</TableCell>
                            <TableCell className="text-muted-foreground">{det.plataforma || "—"}</TableCell>
                            <TableCell className="text-sm">{det.periodo ? formatDate(det.periodo + "-01") : "—"}</TableCell>
                            <TableCell className="text-right font-sans text-sm">{fmt(det.quantidade ?? 0)}</TableCell>
                            <TableCell className="text-right font-sans text-sm">{fmtBRL(det.valor ?? 0)}</TableCell>
                            <TableCell>{getStatusBadge(det.status ?? "")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </>
                </FeatureGate>
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
                <CardTitle className="flex items-center gap-2 text-lg">
                  <EcadIcon className="h-5 w-5" />
                  Conciliação ECAD
                </CardTitle>
                <CardDescription>Relatórios de recebimentos externos de direitos por período</CardDescription>
              </div>
              <RequirePermission module="monitoring" action="write">
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setImportModalOpen(true)}>
                  <Upload className="h-4 w-4" />Importar Relatório ECAD
                </Button>
              </RequirePermission>
            </CardHeader>
            <CardContent className="pt-0">
              {ecadPeriodos.length > 0 ? (
                <>
                <ListSectionHeader
                  title="Relatórios ECAD"
                  count={ecadPeriodos.length}
                  description="Acompanhe períodos, registros, conciliações e divergências de recebimentos"
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ecadPeriodos.map((periodo: any) => (
                      <TableRow key={periodo.id}>
                        <TableCell className="font-medium">{periodo.periodo}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[260px] truncate">{periodo.observacoes || "—"}</TableCell>
                        <TableCell className="text-right font-sans text-sm">{fmtBRL(periodo.valor_total ?? 0)}</TableCell>
                        <TableCell>{getStatusBadge(periodo.status ?? "")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedPeriodo(periodo); setEcadModalOpen(true); }}>
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              ) : (
                <EmptyState
                  icon={EcadIcon}
                  title="Nenhum relatório ECAD importado"
                  description="Importe relatórios do ECAD para conciliação"
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "protecao_catalogo" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Proteção de Catálogo
              </CardTitle>
              <CardDescription>
                Monitore fingerprints, possíveis usos indevidos, similaridades e evidências relacionadas às obras cadastradas no catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Obras Monitoradas</p>
                    <p className="text-2xl font-semibold">{loadingObras ? "—" : obras?.length ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Fingerprints Gerados</p>
                    <p className="text-2xl font-semibold">0</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Alertas de Uso Indevido</p>
                    <p className="text-2xl font-semibold">0</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Risco Crítico</p>
                    <p className="text-2xl font-semibold">0</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Shield className="mb-4 h-10 w-10 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">
                    Proteção de catálogo ainda não configurada
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Aqui serão exibidos fingerprints, análises de similaridade, possíveis usos indevidos, evidências e relatórios de proteção das obras monitoradas.
                  </p>
                </CardContent>
              </Card>
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

      <Dialog open={importModalOpen} onOpenChange={(v) => { if (!importing) { setImportModalOpen(v); if (!v) { setImportFile(null); setImportDone(false); } } }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importar Relatório ECAD
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione um arquivo XLSX exportado do portal ECAD para importar o relatório de recebimentos externos de direitos.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {importFile ? (
                <>
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={(e) => { e.stopPropagation(); setImportFile(null); }}>
                    <X className="h-3 w-3" />Remover
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Clique para selecionar</p>
                    <p className="text-xs text-muted-foreground">XLSX — máx. 10 MB</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            {importDone && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                Relatório importado com sucesso!
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportModalOpen(false); setImportFile(null); }} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importing || importDone} className="gap-2 bg-primary hover:bg-primary/90">
              {importing ? <><RefreshCw className="h-4 w-4 animate-spin" />Importando...</> : <><Upload className="h-4 w-4" />Importar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
