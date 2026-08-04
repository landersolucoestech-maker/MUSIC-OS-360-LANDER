import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MainLayout } from "@/shared/components/MainLayout";
import { MetricCard } from "@/shared/components/MetricCard";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Clock, TrendingUp, FileText, LayoutGrid, Search, Play, Folder, Loader2, PlusCircle, MoreHorizontal, Eye, Pencil, Trash2, Music } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ProjetoFormModal } from "@/modules/projects/components/ProjetoFormModal";
import { ProjetoViewModal } from "@/modules/projects/components/ProjetoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { EmptyState } from "@/shared/components/EmptyState";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import type { ProjetoWithRelationsExtended } from "@/modules/projects/types/projetos-extensions";
import { getFirstMusicaInfo, parseMusicasFromProjeto } from "@/modules/projects/lib/musica-helpers";

export default function Projetos() {
  const navigate = useNavigate();
  const { projetos: rawProjetos, isLoading, deleteProjeto } = useProjetos();
  const { artistas } = useArtistas();

  // In mock mode the storage doesn't do SQL joins, so artistas is undefined on each project.
  // Build an id→artista map and inject the relation manually.
  const projetos = useMemo<ProjetoWithRelationsExtended[]>(() => {
    const map: Record<string, any> = {};
    artistas.forEach(a => { map[a.id] = a; });
    return (rawProjetos as ProjetoWithRelationsExtended[]).map(p => ({
      ...p,
      artistas: p.artistas ?? (p.artista_id ? map[p.artista_id] : undefined),
    }));
  }, [rawProjetos, artistas]);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; projeto?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; projeto?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; projeto?: any }>({ open: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [artistaFilter, setArtistaFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [generoFilter, setGeneroFilter] = useState("all");

  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open the view modal when arriving with ?projeto=:id (e.g. from an Obra link)
  useEffect(() => {
    const projetoId = searchParams.get("projeto");
    if (!projetoId || isLoading) return;
    const target = projetos.find(p => p.id === projetoId);
    if (target) {
      setViewModal({ open: true, projeto: target });
      const next = new URLSearchParams(searchParams);
      next.delete("projeto");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, projetos, isLoading, setSearchParams]);

  // Canonical genre resolver: direct field wins; fallback to first track only.
  // Both generos dropdown and filteredProjects use this so options always match.
  const getProjetoGenero = (p: typeof projetos[number]): string => {
    if (p.genero) return (p.genero as string).trim().toLowerCase();
    const musicas = parseMusicasFromProjeto(p);
    return (musicas[0]?.genero || "").trim().toLowerCase();
  };

  const filteredProjects = useMemo(() => {
    return projetos.filter(project => {
      const info = getFirstMusicaInfo(project);
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" ||
        project.titulo?.toLowerCase().includes(term) ||
        project.artistas?.nome_artistico?.toLowerCase().includes(term) ||
        info.compositores.toLowerCase().includes(term) ||
        info.interpretes.toLowerCase().includes(term) ||
        info.produtores.toLowerCase().includes(term) ||
        info.genero.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesArtista = artistaFilter === "all" || project.artista_id === artistaFilter;
      const matchesTipo = tipoFilter === "all" || project.tipo?.toLowerCase() === tipoFilter.toLowerCase();
      const matchesGenero = generoFilter === "all" || getProjetoGenero(project) === generoFilter.trim().toLowerCase();

      return matchesSearch && matchesStatus && matchesArtista && matchesTipo && matchesGenero;
    }).sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "", "pt-BR", { sensitivity: "base" }));
  }, [projetos, searchTerm, statusFilter, artistaFilter, tipoFilter, generoFilter]);

  const { page, pageSize, total, pageItems, setPage, setPageSize } = usePagination(filteredProjects, 10);

  const generos = useMemo(() => {
    const set = new Set<string>();
    projetos.forEach(p => {
      const g = getProjetoGenero(p);
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [projetos]);

  const handleDelete = () => {
    if (deleteModal.projeto) {
      deleteProjeto.mutate(deleteModal.projeto.id);
      setDeleteModal({ open: false });
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteProjeto.mutate(id));
    toast.success(`${selectedIds.length} projeto(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map(p => p.id));
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="neutral">—</Badge>;
    return <StatusBadge status={status} />;
  };

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
    <RequirePermission module="projects" action="write">
      <Button
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => setFormModal({ open: true, mode: "create" })}
        data-testid="button-novo-projeto"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        Novo Projeto
      </Button>
    </RequirePermission>
  );

  const metricas = {
    ativos: projetos.filter(p => p.status === "em_andamento").length,
    concluidos: projetos.filter(p => p.status === "concluido").length,
    rascunhos: projetos.filter(p => p.status === "planejamento").length,
    total: projetos.length
  };

  return (
    <MainLayout title="Projetos" description="Gestão completa de projetos musicais" actions={headerActions}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Projetos Ativos" value={metricas.ativos} description="em desenvolvimento" icon={Clock} accent="primary" />
          <MetricCard title="Concluídos" value={metricas.concluidos} description="projetos finalizados" icon={TrendingUp} accent="success" />
          <MetricCard title="Rascunhos" value={metricas.rascunhos} description="em planejamento" icon={FileText} accent="warning" />
          <MetricCard title="Total de Projetos" value={metricas.total} description="cadastrados no sistema" icon={LayoutGrid} accent="primary" />
        </div>

        <div className="flex items-center gap-2 flex-wrap rounded-lg bg-muted/30 p-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por música, artista, compositor, intérprete, produtor, gênero..."
              className="pl-10 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[126px] shrink-0 h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="planejamento">Planejamento</SelectItem>
            </SelectContent>
          </Select>
          <Select value={artistaFilter} onValueChange={setArtistaFilter}>
            <SelectTrigger className="w-auto min-w-[130px] shrink-0 h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos Artista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Artista</SelectItem>
              {[...artistas].sort((a, b) => (a.nome_artistico || "").localeCompare(b.nome_artistico || "", "pt-BR", { sensitivity: "base" })).map(a => (
                <SelectItem key={a.id} value={a.id}>{a.nome_artistico}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-auto min-w-[126px] shrink-0 h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos Tipo de..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipo de...</SelectItem>
              <SelectItem value="album">Álbum</SelectItem>
              <SelectItem value="ep">EP</SelectItem>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="turne">Turnê</SelectItem>
            </SelectContent>
          </Select>
          <Select value={generoFilter} onValueChange={setGeneroFilter}>
            <SelectTrigger className="w-auto min-w-[126px] shrink-0 h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos Gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Gênero</SelectItem>
              {generos.map(g => (
                <SelectItem key={g} value={g.toLowerCase()}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-card border-border">
          <CardContent>
            <ListSectionHeader
              title="Lista de Projetos"
              count={filteredProjects.length}
              description="Acompanhe o desenvolvimento de todos os projetos musicais"
              action={
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Checkbox
                    checked={selectedIds.length === filteredProjects.length && filteredProjects.length > 0}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                    aria-label="Selecionar todos"
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.length > 0 ? `${selectedIds.length} projeto(s) selecionado(s)` : "Selecionar todos"}
                  </span>
                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={handleBulkDelete}
                      data-testid="button-bulk-delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir selecionados ({selectedIds.length})
                    </Button>
                  )}
                </div>
              }
            />

            {filteredProjects.length > 0 ? (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]"></TableHead>
                    <TableHead>Título da Música</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Compositores</TableHead>
                    <TableHead>Intérpretes</TableHead>
                    <TableHead>Produtores</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((project) => {
                    const info = getFirstMusicaInfo(project);
                    return (
                      <TableRow key={project.id} data-testid={`row-projeto-${project.id}`} className={selectedIds.includes(project.id) ? "bg-muted/20" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(project.id)}
                            onCheckedChange={() => toggleSelect(project.id)}
                            data-testid={`checkbox-select-${project.id}`}
                            aria-label={`Selecionar ${project.titulo}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {(() => {
                              const capa = (project.capa_url ?? project.foto_url ?? project.cover_url) as string | undefined;
                              return (
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                                  {capa ? (
                                    <img src={capa} alt={project.titulo} className="h-full w-full object-cover" />
                                  ) : (
                                    <Music className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              );
                            })()}
                            <div className="min-w-0">
                              <p className="font-medium truncate" data-testid={`text-titulo-${project.id}`}>{project.titulo}</p>
                              {project.artistas?.nome_artistico && (
                                <p className="text-xs text-muted-foreground truncate">{project.artistas.nome_artistico}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-sm">{project.tipo || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate" data-testid={`text-compositores-${project.id}`}>{info.compositores || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate" data-testid={`text-interpretes-${project.id}`}>{info.interpretes || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate" data-testid={`text-produtores-${project.id}`}>{info.produtores || "—"}</TableCell>
                        <TableCell className="capitalize text-sm" data-testid={`text-genero-${project.id}`}>{info.genero || "—"}</TableCell>
                        <TableCell>{getStatusBadge(project.status ?? "")}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-actions-${project.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewModal({ open: true, projeto: project })} data-testid={`button-view-${project.id}`}>
                                <Eye className="h-4 w-4 mr-2" /> Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", projeto: project })} data-testid={`button-edit-${project.id}`}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteModal({ open: true, projeto: project })} className="text-destructive" data-testid={`button-delete-${project.id}`}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="projetos"
              />
              </>
            ) : (
              <EmptyState
                icon={Folder}
                title="Nenhum projeto cadastrado"
                description="Comece criando seu primeiro projeto musical"
                actionLabel="Novo Projeto"
                onAction={() => setFormModal({ open: true, mode: "create" })}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ProjetoFormModal key={formModal.mode === "create" ? "create" : (formModal.projeto?.id ?? "edit")} open={formModal.open} onOpenChange={(open) => setFormModal(prev => ({ ...prev, open }))} projeto={formModal.projeto} mode={formModal.mode} onConcluido={(id) => navigate(`/registro-musicas?newObra=${id}`)} />
      <ProjetoViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} projeto={viewModal.projeto} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Projeto" description={`Tem certeza que deseja excluir o projeto "${deleteModal.projeto?.titulo}"?`} onConfirm={handleDelete} />
    </MainLayout>
  );
}
