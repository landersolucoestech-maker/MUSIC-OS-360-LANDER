import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { FileText, Music, Clock, DollarSign, Plus, Search, Loader2, MoreHorizontal, Eye, Pencil, Trash2, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { LicencaFormModal } from "@/modules/licensing/components/LicencaFormModal";
import { LicencaViewModal } from "@/modules/licensing/components/LicencaViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { EmptyState } from "@/shared/components/EmptyState";
import { useLicencas } from "@/modules/licensing/hooks/useLicencas";
import { formatCurrency } from "@/shared/lib/format-utils";
import { FeatureGate } from '@/shared/components/FeatureGate';

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ativa": return <Badge className="bg-success text-[#000000]">Ativa</Badge>;
    case "negociacao": return <Badge className="bg-warning text-warning-foreground">Em Negociação</Badge>;
    case "proposta": return <Badge className="bg-blue-500">Proposta Enviada</Badge>;
    case "expirada": return <Badge className="bg-destructive text-destructive-foreground">Expirada</Badge>;
    default: return <Badge variant="secondary">{status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>;
  }
};

export default function Licenciamento() {
  const { licencas, isLoading, deleteLicenca } = useLicencas();
  const [activeTab, setActiveTab] = useState("catalogo");
  const [licencaModal, setLicencaModal] = useState<{ open: boolean; mode: "create" | "edit"; licenca?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; licenca?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; licenca?: any }>({ open: false });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [midiaFilter, setMidiaFilter] = useState("all");

  const filteredLicencas = licencas.filter(licenca => {
    const matchesSearch = searchTerm === "" ||
      licenca.tipo_uso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      licenca.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "ativa" && licenca.status === "ativa") ||
      (statusFilter === "negociacao" && licenca.status === "negociacao") ||
      (statusFilter === "proposta" && licenca.status === "proposta") ||
      (statusFilter === "expirada" && licenca.status === "expirada");

    const matchesMidia = midiaFilter === "all" ||
      licenca.tipo_uso?.toLowerCase().includes(midiaFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesMidia;
  });

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || midiaFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMidiaFilter("all");
  };

  const handleDelete = () => {
    if (deleteModal.licenca) {
      deleteLicenca.mutate(deleteModal.licenca.id);
      setDeleteModal({ open: false });
    }
  };

  const metricas = useMemo(() => ({
    total: licencas.length,
    ativas: licencas.filter(l => l.status === "ativa").length,
    propostas: licencas.filter(l => l.status === "negociacao" || l.status === "proposta").length,
    valorTotal: licencas.filter(l => l.status === "ativa").reduce((acc, l) => acc + (l.valor || 0), 0),
  }), [licencas]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const headerActions = (
    <RequirePermission module="licensing" action="write">
      <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setLicencaModal({ open: true, mode: "create" })}>
        <Plus className="h-4 w-4" />Nova Licença
      </Button>
    </RequirePermission>
  );

  return (
    <FeatureGate feature="moduleLicensing" featureName="Licenciamento" requiredPlan="enterprise">
    <MainLayout title="Licenciamento" description="Gestão de licenças e sincronização" actions={headerActions}>
      <div className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Total Licenças</span><FileText className="h-5 w-5 text-primary" /></div><div className="mt-2"><span className="text-2xl font-bold">{metricas.total}</span></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Licenças Ativas</span><Music className="h-5 w-5 text-success" /></div><div className="mt-2"><span className="text-2xl font-bold">{metricas.ativas}</span></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Em Negociação</span><Clock className="h-5 w-5 text-warning" /></div><div className="mt-2"><span className="text-2xl font-bold">{metricas.propostas}</span></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Valor Total</span><DollarSign className="h-5 w-5 text-success" /></div><div className="mt-2"><span className="text-2xl font-bold">{formatCurrency(metricas.valorTotal)}</span></div></CardContent></Card>
        </div>

        <div className="flex items-center gap-2">
          <Button variant={activeTab === "catalogo" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("catalogo")} className={activeTab === "catalogo" ? "bg-muted text-foreground hover:bg-muted" : ""}>Catálogo de Licenças</Button>
          <Button variant={activeTab === "propostas" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("propostas")} className={activeTab === "propostas" ? "bg-muted text-foreground hover:bg-muted" : ""}>Propostas</Button>
          <Button variant={activeTab === "ativas" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("ativas")} className={activeTab === "ativas" ? "bg-muted text-foreground hover:bg-muted" : ""}>Licenças Ativas</Button>
        </div>

        {activeTab === "catalogo" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Todas as Licenças</h2>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por título, artista, obra, cliente..." 
                    className="pl-10 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="negociacao">Em Negociação</SelectItem>
                    <SelectItem value="proposta">Proposta Enviada</SelectItem>
                    <SelectItem value="expirada">Expirada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={midiaFilter} onValueChange={setMidiaFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todas Mídias" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Mídias</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                    <SelectItem value="streaming">Streaming</SelectItem>
                    <SelectItem value="radio">Rádio</SelectItem>
                    <SelectItem value="games">Games</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>Limpar</Button>
                )}
              </div>

              {filteredLicencas.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Artista/Obra</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Mídia</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLicencas.map((licenca) => (
                      <TableRow key={licenca.id}>
                        <TableCell className="font-medium">{licenca.tipo_uso}</TableCell>
                        <TableCell><span className="block">-</span></TableCell>
                        <TableCell>{licenca.clientes?.nome || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{licenca.tipo_uso}</Badge></TableCell>
                        <TableCell className="font-semibold text-success">{formatCurrency(licenca.valor || 0)}</TableCell>
                        <TableCell>{getStatusBadge(licenca.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewModal({ open: true, licenca })}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setLicencaModal({ open: true, mode: "edit", licenca })}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteModal({ open: true, licenca })} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Nenhuma licença cadastrada"
                  description="Comece criando sua primeira licença de sync"
                  actionLabel="Nova Licença"
                  onAction={() => setLicencaModal({ open: true, mode: "create" })}
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "propostas" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-6">Propostas em Andamento</h2>
              <EmptyState
                icon={Clock}
                title="Nenhuma proposta em andamento"
                description="As propostas aparecerão aqui quando criadas"
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "ativas" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-6">Licenças Ativas</h2>
              <EmptyState
                icon={Music}
                title="Nenhuma licença ativa"
                description="As licenças ativas aparecerão aqui"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <LicencaFormModal open={licencaModal.open} onOpenChange={(open) => setLicencaModal({ ...licencaModal, open })} licenca={licencaModal.licenca} mode={licencaModal.mode} />
      <LicencaViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} licenca={viewModal.licenca} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Licença" description={`Tem certeza que deseja excluir "${deleteModal.licenca?.tipo_uso}"?`} onConfirm={handleDelete} />
    </MainLayout>
    </FeatureGate>
  );
}
