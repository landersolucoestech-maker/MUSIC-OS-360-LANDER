import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
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
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useObras } from "@/modules/catalog/hooks/useObras";

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

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  parcial: { label: "Parcial", variant: "secondary" },
  recebido: { label: "Recebido", variant: "default" },
  enviado: { label: "Enviado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};


export default function GestaoShares() {
  const { shares, isLoading: loadingShares, deleteShare, updateShare } = useShares();
  const { artistas } = useArtistas();
  const { obras, isLoading: loadingObras } = useObras();

  const [searchTerm, setSearchTerm] = useState("");
  const [direcaoFilter, setDirecaoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [viewModal, setViewModal] = useState<{ open: boolean; share?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; share?: any }>({ open: false });
  const [formModal, setFormModal] = useState<{ open: boolean; share?: any }>({ open: false });

  const isLoading = loadingShares || loadingObras;

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
    const artista = artistas.find((a: any) => a.id === s.artista_id);
    const nomeDetentor = artista?.nome_artistico || s.detentor || "";
    const tituloObra = obra?.titulo || "";

    const matchesSearch =
      searchTerm === "" ||
      tituloObra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomeDetentor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDirecao = direcaoFilter === "todos" || s.direcao === direcaoFilter;
    const matchesStatus = statusFilter === "todos" || s.status === statusFilter;
    const matchesTipo = tipoFilter === "todos" || s.tipo === tipoFilter;

    return matchesSearch && matchesDirecao && matchesStatus && matchesTipo;
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setDirecaoFilter("todos");
    setStatusFilter("todos");
    setTipoFilter("todos");
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
        className="gap-2 bg-primary hover:bg-primary/90"
        onClick={() => setFormModal({ open: true })}
        data-testid="button-register-pending-share"
      >
        <Plus className="h-4 w-4" />
        Registrar Share
      </Button>
    </>
  );

  const hasActiveFilters =
    searchTerm !== "" ||
    direcaoFilter !== "todos" ||
    statusFilter !== "todos" ||
    tipoFilter !== "todos";

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
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar obra ou detentor..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={direcaoFilter} onValueChange={setDirecaoFilter}>
                <SelectTrigger className="w-44" data-testid="select-direcao">
                  <SelectValue placeholder="Direção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as direções</SelectItem>
                  <SelectItem value="a_receber">A Receber</SelectItem>
                  <SelectItem value="a_enviar">A Enviar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status">
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
                <SelectTrigger className="w-44" data-testid="select-tipo">
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
          <CardHeader>
            <CardTitle className="text-lg">Shares Cadastrados</CardTitle>
            <CardDescription>{filteredShares.length} share{filteredShares.length !== 1 ? "s" : ""} encontrado{filteredShares.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Bulk select bar */}
            {filteredShares.length > 0 && (
              <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
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
                    className="h-7 text-xs gap-1 ml-auto"
                    onClick={handleBulkDelete}
                    data-testid="button-bulk-delete-shares"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir selecionados
                  </Button>
                )}
              </div>
            )}
            {filteredShares.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 pl-6" />
                    <TableHead>Lançamento</TableHead>
                    <TableHead>Detentor</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShares.map((share: any) => {
                    const obra = obras.find((o: any) => o.id === share.obra_id);
                    const artista = artistas.find((a: any) => a.id === share.artista_id);
                    const nomeDetentor = artista?.nome_artistico || share.detentor || "—";
                    const statusConf = STATUS_CONFIG[share.status] ?? { label: share.status ?? "—", variant: "outline" as const };
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
                              <p className="font-medium text-foreground text-sm">{obra?.titulo ?? share.obra_id ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{obra?.compositor ?? ""}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-sm">{nomeDetentor}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TIPO_LABELS[share.tipo] ?? share.tipo ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {share.percentual != null ? `${share.percentual}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConf.variant} className="text-xs">
                            {statusConf.label}
                          </Badge>
                        </TableCell>
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
      />
    </MainLayout>
  );
}
