import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Share2, ArrowDownLeft, CheckCircle, ArrowUpRight, Send, Download,
  Plus, Search, Loader2, MoreHorizontal, Eye, Pencil, Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { toast } from "sonner";
import { EmptyState } from "@/shared/components/EmptyState";
import { ShareViewModal } from "@/modules/releases/components/ShareViewModal";
import { SharePendenteFormModal } from "@/modules/releases/components/SharePendenteFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { useShares } from "@/modules/releases/hooks/useShares";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { resolveShareType, shareTypeLabel, shareStatusBadge } from "@/modules/releases/lib/share-format";
import { SHARE_FOR_RELEASE_PARAM } from "@/modules/releases/services/share-from-release";
import type { Share } from "@/modules/releases/types";

const TIPO_LABELS: Record<string, string> = {
  interprete: "Intérprete",
  compositor: "Compositor",
  produtor: "Produtor",
  editora: "Editora",
  gravadora: "Gravadora",
  empresario: "Empresário",
  autor: "Autor",
  outro: "Outro",
};

export default function GestaoShares() {
  const { shares, isLoading: loadingShares, deleteShare, updateShare } = useShares();
  const { lancamentos, isLoading: loadingLancamentos } = useLancamentos();
  const { artistas } = useArtistas();
  const { obras, isLoading: loadingObras } = useObras();

  const [searchTerm, setSearchTerm] = useState("");
  const [direcaoFilter, setDirecaoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [shareTypeFilter, setShareTypeFilter] = useState("todos");
  const [viewModal, setViewModal] = useState<{ open: boolean; share?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; share?: any }>({ open: false });
  const [formModal, setFormModal] = useState<{ open: boolean; share?: any; initialLancamentoId?: string }>({ open: false });

  // Abre o form com um release pré-selecionado quando vindo do fluxo de Lançamentos.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const relId = searchParams.get(SHARE_FOR_RELEASE_PARAM);
    if (!relId) return;
    setFormModal({ open: true, initialLancamentoId: relId });
    setSearchParams((prev) => { prev.delete(SHARE_FOR_RELEASE_PARAM); return prev; }, { replace: true });
  }, [searchParams, setSearchParams]);

  const isLoading = loadingShares || loadingObras || loadingLancamentos;

  // ── KPI counts ──────────────────────────────────────────────────────────────
  const aReceber = shares.filter(
    (s: any) => s.direcao === "a_receber" && (s.status === "pendente" || s.status === "parcial"),
  ).length;
  const recebidos = shares.filter(
    (s: any) => s.direcao === "a_receber" && s.status === "recebido",
  ).length;
  const aEnviar = shares.filter(
    (s: any) => s.direcao === "a_enviar" && (s.status === "pendente" || s.status === "parcial"),
  ).length;
  const enviados = shares.filter(
    (s: any) => s.direcao === "a_enviar" && s.status === "enviado",
  ).length;

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredShares = shares.filter((s: any) => {
    const obra = obras.find((o: any) => o.id === s.obra_id);
    const lancamento = lancamentos.find((l: any) => l.id === s.lancamento_id);
    const artista = artistas.find((a: any) => a.id === s.artista_id);
    const nomeDetentor = artista?.nome_artistico || s.detentor || "";
    const tituloObra = obra?.titulo || lancamento?.titulo || s.nome_musica || "";

    const matchesSearch =
      searchTerm === "" ||
      tituloObra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomeDetentor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDirecao = direcaoFilter === "todos" || s.direcao === direcaoFilter;
    const matchesStatus = statusFilter === "todos" || s.status === statusFilter;
    const matchesTipo = tipoFilter === "todos" || s.tipo === tipoFilter;
    const matchesShareType =
      shareTypeFilter === "todos" || resolveShareType(s as Share & Record<string, unknown>) === shareTypeFilter;

    return matchesSearch && matchesDirecao && matchesStatus && matchesTipo && matchesShareType;
  });

  const sharesPg = usePagination(filteredShares, 10);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDirecaoFilter("todos");
    setStatusFilter("todos");
    setTipoFilter("todos");
    setShareTypeFilter("todos");
  };

  const handleDelete = () => {
    if (deleteModal.share) {
      deleteShare.mutate(deleteModal.share.id);
      setDeleteModal({ open: false });
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(
      selectedIds.size === filteredShares.length
        ? new Set()
        : new Set(filteredShares.map((s: any) => s.id)),
    );

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await deleteShare.mutateAsync(id);
    setSelectedIds(new Set());
    toast.success(`${ids.length} share(s) excluído(s).`);
  };

  const handleRegistrarLiquidacao = (share: any, novoStatus: "recebido" | "enviado") => {
    updateShare.mutate({ id: share.id, status: novoStatus, valor_liquidado: share.valor_total });
    toast.success(novoStatus === "recebido" ? "Recebimento registrado!" : "Envio registrado!");
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
      <Button variant="outline" size="sm" className="gap-2" data-testid="button-export">
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      <Button
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => setFormModal({ open: true })}
        data-testid="button-register-pending-share"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar Share
      </Button>
    </>
  );

  const hasActiveFilters =
    searchTerm !== "" ||
    direcaoFilter !== "todos" ||
    statusFilter !== "todos" ||
    tipoFilter !== "todos" ||
    shareTypeFilter !== "todos";

  return (
    <MainLayout title="Gestão de Shares" actions={headerActions}>
      <div className="space-y-6">

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ArrowDownLeft className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">A Receber</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-a-receber">{aReceber}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recebidos</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-recebidos">{recebidos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">A Enviar</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-a-enviar">{aEnviar}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enviados</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-enviados">{enviados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Filters ───────────────────────────────────────────────────────── */}
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar obra ou detentor..."
                  className="pl-9 h-8 text-sm bg-card border-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={shareTypeFilter} onValueChange={setShareTypeFilter}>
                <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border" data-testid="select-share-type-filter">
                  <SelectValue placeholder="Tipo de share" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="internal_release">Release Interno</SelectItem>
                  <SelectItem value="external_receivable">Externo a Receber</SelectItem>
                </SelectContent>
              </Select>
              <Select value={direcaoFilter} onValueChange={setDirecaoFilter}>
                <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border" data-testid="select-direcao">
                  <SelectValue placeholder="Direção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as direções</SelectItem>
                  <SelectItem value="a_receber">A Receber</SelectItem>
                  <SelectItem value="a_enviar">A Enviar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm bg-card border-border" data-testid="select-tipo">
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as funções</SelectItem>
                  <SelectItem value="interprete">Intérprete</SelectItem>
                  <SelectItem value="compositor">Compositor</SelectItem>
                  <SelectItem value="produtor">Produtor</SelectItem>
                  <SelectItem value="editora">Editora</SelectItem>
                  <SelectItem value="gravadora">Gravadora</SelectItem>
                  <SelectItem value="empresario">Empresário</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} data-testid="button-clear-filters">
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <ListSectionHeader
              title="Shares Cadastrados"
              count={filteredShares.length}
              description="Acompanhe participações e percentuais vinculados aos lançamentos"
              className="px-6 pt-6"
              action={filteredShares.length > 0 ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Checkbox
                    checked={selectedIds.size === filteredShares.length && filteredShares.length > 0}
                    onCheckedChange={toggleAll}
                    data-testid="checkbox-select-all-shares"
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : "Selecionar todos"}
                  </span>
                  {selectedIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleBulkDelete}
                      data-testid="button-bulk-delete-shares"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir selecionados
                    </Button>
                  )}
                </div>
              ) : undefined}
            />
            {filteredShares.length > 0 ? (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 pl-6" />
                    <TableHead>Lançamento / Música</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detentor</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharesPg.pageItems.map((share: any) => {
                    const obra = obras.find((o: any) => o.id === share.obra_id);
                    const lancamento = lancamentos.find((l: any) => l.id === share.lancamento_id);
                    const artista = artistas.find((a: any) => a.id === share.artista_id);
                    const nomeDetentor = artista?.nome_artistico || share.detentor || "—";
                    const sType = resolveShareType(share as Share & Record<string, unknown>);
                    const isPendente = share.status === "pendente" || share.status === "parcial";

                    return (
                      <TableRow key={share.id} data-testid={`row-share-${share.id}`}>
                        <TableCell className="w-8 pl-6">
                          <Checkbox
                            checked={selectedIds.has(share.id)}
                            onCheckedChange={() => toggleSelect(share.id)}
                            data-testid={`checkbox-share-${share.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                              <Share2 className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{obra?.titulo ?? lancamento?.titulo ?? share.nome_musica ?? share.obra_id ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{obra?.compositor ?? ""}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sType === "internal_release" ? "info" : "success"} className="text-xs">
                            {shareTypeLabel(sType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground text-sm">{nomeDetentor}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TIPO_LABELS[share.tipo] ?? share.tipo ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-foreground text-sm">
                          {share.percentual != null ? `${share.percentual}%` : "—"}
                        </TableCell>
                        <TableCell>{shareStatusBadge(share.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${share.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                data-testid={`button-ver-${share.id}`}
                                onClick={() => setViewModal({ open: true, share })}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                data-testid={`button-editar-${share.id}`}
                                onClick={() => setFormModal({ open: true, share })}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {isPendente && share.direcao === "a_receber" && (
                                <DropdownMenuItem
                                  data-testid={`button-receber-${share.id}`}
                                  onClick={() => handleRegistrarLiquidacao(share, "recebido")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Registrar Recebimento
                                </DropdownMenuItem>
                              )}
                              {isPendente && share.direcao === "a_enviar" && (
                                <DropdownMenuItem
                                  data-testid={`button-enviar-${share.id}`}
                                  onClick={() => handleRegistrarLiquidacao(share, "enviado")}
                                >
                                  <Send className="h-4 w-4 mr-2 text-orange-600" />
                                  Registrar Envio
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                data-testid={`button-excluir-${share.id}`}
                                className="text-destructive"
                                onClick={() => setDeleteModal({ open: true, share })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
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
                total={sharesPg.total}
                page={sharesPg.page}
                pageSize={sharesPg.pageSize}
                onPageChange={sharesPg.setPage}
                onPageSizeChange={sharesPg.setPageSize}
                itemLabel="shares"
              />
              </>
            ) : (
              <EmptyState
                icon={Share2}
                title="Nenhum share encontrado"
                description={hasActiveFilters ? "Tente ajustar os filtros de busca" : "Registre o primeiro share para começar"}
                action={!hasActiveFilters ? { label: "Registrar Share", onClick: () => setFormModal({ open: true }) } : undefined}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ShareViewModal
        open={viewModal.open}
        onOpenChange={(open) => setViewModal({ ...viewModal, open })}
        share={viewModal.share}
      />

      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        onConfirm={handleDelete}
        title="Excluir Share"
        description="Tem certeza que deseja excluir este share? Esta ação não pode ser desfeita."
      />

      <SharePendenteFormModal
        open={formModal.open}
        onOpenChange={(open) => setFormModal({ ...formModal, open })}
        share={formModal.share}
        initialLancamentoId={formModal.initialLancamentoId}
      />
    </MainLayout>
  );
}
