import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { MetricCard } from "@/shared/components/MetricCard";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { FileText, Music, Clock, DollarSign, PlusCircle, Search, Loader2, MoreHorizontal, Eye, Pencil, Trash2, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { LicencaFormModal } from "@/modules/licensing/components/LicencaFormModal";
import { LicencaViewModal } from "@/modules/licensing/components/LicencaViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { EmptyState } from "@/shared/components/EmptyState";
import { useLicencas } from "@/modules/licensing/hooks/useLicencas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { formatRemuneration, obraArtistaLabel, midiaLabel } from "@/modules/licensing/lib/licenca-format";
import type { Obra } from "@/modules/catalog/types/catalog.types";
import { formatCurrency } from "@/shared/lib/format-utils";
import { FeatureGate } from '@/shared/components/FeatureGate';

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ativa": return <Badge variant="success">Ativa</Badge>;
    case "negociacao": return <Badge variant="warning">Em Negociação</Badge>;
    case "proposta": return <Badge variant="info">Proposta Enviada</Badge>;
    case "expirada": return <Badge variant="danger">Expirada</Badge>;
    default: return <Badge variant="neutral">{status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>;
  }
};

export default function Licenciamento() {
  const { licencas, isLoading, deleteLicenca } = useLicencas();
  const { obras } = useObras();
  const { data: clientes } = useDataQuery<{ id: string; nome: string }>({ queryKey: [...QUERY_KEYS.CLIENTES], table: "clientes" });

  const obraById = useMemo(() => {
    const m = new Map<string, Obra>();
    (obras as Obra[]).forEach((o) => m.set(o.id, o));
    return m;
  }, [obras]);
  const clienteById = useMemo(() => {
    const m = new Map<string, string>();
    clientes.forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [clientes]);

  const obraTituloDe = (l: any) => (l.obra_id ? obraById.get(l.obra_id)?.titulo ?? null : null);
  const artistaDe = (l: any) => (l.obra_id ? obraArtistaLabel(obraById.get(l.obra_id)) : "");
  const clienteNomeDe = (l: any) => (l.cliente_id ? clienteById.get(l.cliente_id) ?? null : null);

  const [activeTab, setActiveTab] = useState("catalogo");
  const [licencaModal, setLicencaModal] = useState<{ open: boolean; mode: "create" | "edit"; licenca?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; licenca?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; licenca?: any }>({ open: false });
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [midiaFilter, setMidiaFilter] = useState("all");
  const [selectedLicencaIds, setSelectedLicencaIds] = useState<string[]>([]);

  const filteredLicencas = licencas.filter(licenca => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      licenca.titulo?.toLowerCase().includes(term) ||
      (obraTituloDe(licenca) ?? "").toLowerCase().includes(term) ||
      artistaDe(licenca).toLowerCase().includes(term) ||
      (clienteNomeDe(licenca) ?? "").toLowerCase().includes(term);

    const matchesStatus = statusFilter === "all" || licenca.status === statusFilter;

    const matchesMidia = midiaFilter === "all" ||
      (licenca.midia_destino ?? "").toLowerCase().includes(midiaFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesMidia;
  });

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || midiaFilter !== "all";

  const { page, pageSize, total, pageItems, setPage, setPageSize } = usePagination(filteredLicencas, 10);
  const propostasLicencas = useMemo(() => licencas.filter((l) => l.status === "negociacao" || l.status === "proposta"), [licencas]);
  const ativasLicencas = useMemo(() => licencas.filter((l) => l.status === "ativa"), [licencas]);
  const propostasPg = usePagination(propostasLicencas, 10);
  const ativasPg = usePagination(ativasLicencas, 10);

  const toggleSelectLicenca = (id: string) => {
    setSelectedLicencaIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleSelectLicencas = (rows: any[]) => {
    const ids = rows.map((row) => row.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedLicencaIds.includes(id));
    setSelectedLicencaIds((current) => {
      if (allSelected) return current.filter((id) => !ids.includes(id));
      return Array.from(new Set([...current, ...ids]));
    });
  };

  const renderSelectAction = (rows: any[], testId: string) => {
    if (rows.length === 0) return undefined;
    const allSelected = rows.every((row) => selectedLicencaIds.includes(row.id));
    const selectedCount = rows.filter((row) => selectedLicencaIds.includes(row.id)).length;
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        {selectedCount > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBulkDeleteModal({ open: true, ids: rows.filter((row) => selectedLicencaIds.includes(row.id)).map((row) => row.id) })}
            data-testid={`${testId}-delete-selected`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir selecionadas
          </Button>
        )}
        <Checkbox
          checked={allSelected}
          onCheckedChange={() => toggleSelectLicencas(rows)}
          aria-label="Selecionar todas as licenças"
          data-testid={testId}
        />
        <span className="text-xs text-muted-foreground">
          {selectedCount > 0 ? `${selectedCount} selecionada(s)` : "Selecionar todos"}
        </span>
      </div>
    );
  };

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

  const handleBulkDelete = () => {
    bulkDeleteModal.ids.forEach((id) => deleteLicenca.mutate(id));
    setSelectedLicencaIds((current) => current.filter((id) => !bulkDeleteModal.ids.includes(id)));
    setBulkDeleteModal({ open: false, ids: [] });
  };

  const metricas = useMemo(() => ({
    total: licencas.length,
    ativas: licencas.filter(l => l.status === "ativa").length,
    propostas: licencas.filter(l => l.status === "negociacao" || l.status === "proposta").length,
    expiradas: licencas.filter(l => l.status === "expirada").length,
    valorTotal: licencas.filter(l => l.status === "ativa").reduce((acc, l) => acc + (l.amount ?? l.valor ?? 0), 0),
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
      <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setLicencaModal({ open: true, mode: "create" })} data-testid="button-nova-licenca">
        <PlusCircle className="h-3.5 w-3.5" />Nova Licença
      </Button>
    </RequirePermission>
  );

  return (
    <FeatureGate feature="moduleLicensing" featureName="Licenciamento" requiredPlan="enterprise">
    <MainLayout title="Licenciamento" description="Gestão de licenças e sincronização" actions={headerActions}>
      <div className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Total Licenças" value={metricas.total} icon={FileText} accent="primary" />
          <MetricCard title="Licenças Ativas" value={metricas.ativas} icon={Music} accent="success" />
          <MetricCard title="Em Negociação" value={metricas.propostas} icon={Clock} accent="warning" />
          <MetricCard title="Expirado" value={metricas.expiradas} icon={Shield} accent="destructive" />
          <MetricCard title="Valor Total" value={formatCurrency(metricas.valorTotal)} icon={DollarSign} accent="primary" />
        </div>

        <div className="flex items-center gap-2">
          <Button variant={activeTab === "catalogo" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("catalogo")} className={activeTab === "catalogo" ? "bg-muted text-foreground hover:bg-muted" : ""}>Catálogo de Licenças</Button>
          <Button variant={activeTab === "propostas" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("propostas")} className={activeTab === "propostas" ? "bg-muted text-foreground hover:bg-muted" : ""}>Propostas</Button>
          <Button variant={activeTab === "ativas" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("ativas")} className={activeTab === "ativas" ? "bg-muted text-foreground hover:bg-muted" : ""}>Licenças Ativas</Button>
        </div>

        {activeTab === "catalogo" && (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 p-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, artista, obra, cliente..."
                  className="pl-10 h-8 text-sm bg-card border-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-auto min-w-[126px] shrink-0 bg-card border-border text-sm"><SelectValue placeholder="Todos Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="negociacao">Em Negociação</SelectItem>
                  <SelectItem value="proposta">Proposta Enviada</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={midiaFilter} onValueChange={setMidiaFilter}>
                <SelectTrigger className="h-8 w-auto min-w-[132px] shrink-0 bg-card border-border text-sm"><SelectValue placeholder="Todas Mídias" /></SelectTrigger>
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

            <Card>
              <CardContent className="p-6 space-y-4">
              {filteredLicencas.length > 0 ? (
                <>
                <ListSectionHeader
                  title="Lista de Licenças"
                  count={filteredLicencas.length}
                  description="Acompanhe licenças, clientes, mídias e valores contratados"
                  action={renderSelectAction(filteredLicencas, "checkbox-select-all-licencas")}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
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
                    {pageItems.map((licenca) => (
                      <TableRow key={licenca.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLicencaIds.includes(licenca.id)}
                            onCheckedChange={() => toggleSelectLicenca(licenca.id)}
                            aria-label={`Selecionar licença ${licenca.titulo || licenca.id}`}
                            data-testid={`checkbox-licenca-${licenca.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{licenca.titulo || "—"}</TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{obraTituloDe(licenca) ?? "—"}</p>
                            {artistaDe(licenca) && <p className="text-xs text-muted-foreground truncate">{artistaDe(licenca)}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{clienteNomeDe(licenca) ?? "—"}</TableCell>
                        <TableCell>{licenca.midia_destino ? <Badge variant="neutral">{midiaLabel(licenca.midia_destino)}</Badge> : "—"}</TableCell>
                        <TableCell className="font-semibold text-success">{formatRemuneration(licenca)}</TableCell>
                        <TableCell>{getStatusBadge(licenca.status ?? "")}</TableCell>
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
                <TablePagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="licenças"
                />
                </>
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
          </>
        )}

        {activeTab === "propostas" && (
          <Card>
            <CardContent className="p-6">
              <ListSectionHeader
                title="Propostas em Andamento"
                count={propostasLicencas.length}
                description="Acompanhe propostas de licenciamento em negociação e aguardando resposta"
                action={renderSelectAction(propostasLicencas, "checkbox-select-all-propostas")}
              />
              {propostasLicencas.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
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
                      {propostasPg.pageItems.map((licenca) => (
                        <TableRow key={licenca.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLicencaIds.includes(licenca.id)}
                              onCheckedChange={() => toggleSelectLicenca(licenca.id)}
                              aria-label={`Selecionar licença ${licenca.titulo || licenca.id}`}
                              data-testid={`checkbox-proposta-${licenca.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{licenca.titulo || "—"}</TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{obraTituloDe(licenca) ?? "—"}</p>
                              {artistaDe(licenca) && <p className="text-xs text-muted-foreground truncate">{artistaDe(licenca)}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{clienteNomeDe(licenca) ?? "—"}</TableCell>
                          <TableCell>{licenca.midia_destino ? <Badge variant="neutral">{midiaLabel(licenca.midia_destino)}</Badge> : "—"}</TableCell>
                          <TableCell className="font-semibold text-success">{formatRemuneration(licenca)}</TableCell>
                          <TableCell>{getStatusBadge(licenca.status ?? "")}</TableCell>
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
                  <TablePagination
                    total={propostasPg.total}
                    page={propostasPg.page}
                    pageSize={propostasPg.pageSize}
                    onPageChange={propostasPg.setPage}
                    onPageSizeChange={propostasPg.setPageSize}
                    itemLabel="propostas"
                  />
                </>
              ) : (
                <EmptyState
                  icon={Clock}
                  title="Nenhuma proposta em andamento"
                  description="As propostas aparecerão aqui quando criadas"
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "ativas" && (
          <Card>
            <CardContent className="p-6">
              <ListSectionHeader
                title="Licenças Ativas"
                count={ativasLicencas.length}
                description="Acompanhe licenças ativas, clientes, mídias, vigência e valores"
                action={renderSelectAction(ativasLicencas, "checkbox-select-all-ativas")}
              />
              {ativasLicencas.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
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
                      {ativasPg.pageItems.map((licenca) => (
                        <TableRow key={licenca.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLicencaIds.includes(licenca.id)}
                              onCheckedChange={() => toggleSelectLicenca(licenca.id)}
                              aria-label={`Selecionar licença ${licenca.titulo || licenca.id}`}
                              data-testid={`checkbox-ativa-${licenca.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{licenca.titulo || "—"}</TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{obraTituloDe(licenca) ?? "—"}</p>
                              {artistaDe(licenca) && <p className="text-xs text-muted-foreground truncate">{artistaDe(licenca)}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{clienteNomeDe(licenca) ?? "—"}</TableCell>
                          <TableCell>{licenca.midia_destino ? <Badge variant="neutral">{midiaLabel(licenca.midia_destino)}</Badge> : "—"}</TableCell>
                          <TableCell className="font-semibold text-success">{formatRemuneration(licenca)}</TableCell>
                          <TableCell>{getStatusBadge(licenca.status ?? "")}</TableCell>
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
                  <TablePagination
                    total={ativasPg.total}
                    page={ativasPg.page}
                    pageSize={ativasPg.pageSize}
                    onPageChange={ativasPg.setPage}
                    onPageSizeChange={ativasPg.setPageSize}
                    itemLabel="licenças"
                  />
                </>
              ) : (
                <EmptyState
                  icon={Music}
                  title="Nenhuma licença ativa"
                  description="As licenças ativas aparecerão aqui"
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <LicencaFormModal open={licencaModal.open} onOpenChange={(open) => setLicencaModal({ ...licencaModal, open })} licenca={licencaModal.licenca} mode={licencaModal.mode} />
      <LicencaViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} licenca={viewModal.licenca} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Licença" description={`Tem certeza que deseja excluir "${deleteModal.licenca?.titulo}"?`} onConfirm={handleDelete} />
      <DeleteConfirmModal open={bulkDeleteModal.open} onOpenChange={(open) => setBulkDeleteModal({ ...bulkDeleteModal, open })} title="Excluir licencas selecionadas" description={`Tem certeza que deseja excluir ${bulkDeleteModal.ids.length} licenca(s) selecionada(s)?`} onConfirm={handleBulkDelete} />
    </MainLayout>
    </FeatureGate>
  );
}
