import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Share2, ArrowDownLeft, CheckCircle, ArrowUpRight, Download, Plus, Search, Image, Loader2, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { toast } from "sonner";
import { EmptyState } from "@/shared/components/EmptyState";
import { ShareViewModal } from "@/modules/releases/components/ShareViewModal";
import { SharePendenteFormModal } from "@/modules/releases/components/SharePendenteFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { useShares } from "@/modules/releases/hooks/useShares";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";

export default function GestaoShares() {
  const { shares, isLoading: loadingShares, deleteShare } = useShares();
  const { lancamentos, isLoading: loadingLancamentos } = useLancamentos();
  const { artistas } = useArtistas();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [artistFilter, setArtistFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [shareFilter, setShareFilter] = useState("todos");
  const [viewModal, setViewModal] = useState<{ open: boolean; share?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; share?: any }>({ open: false });
  const [sharePendenteModal, setSharePendenteModal] = useState<{ open: boolean; share?: any }>({ open: false });

  const isLoading = loadingShares || loadingLancamentos;

  const shareReceber = shares.filter((s: any) => s.status === "a_receber").length;
  const shareRecebido = shares.filter((s: any) => s.status === "recebido").length;
  const shareEnviar = shares.filter((s: any) => s.status === "a_enviar").length;
  const shareAplicado = shares.filter((s: any) => s.status === "aplicado").length;

  const filteredLancamentos = lancamentos.filter((item: any) => {
    const artistaNome = artistas.find((a: any) => a.id === item.artista_id)?.nome_artistico || "";
    const matchesSearch = searchTerm === "" ||
      item.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artistaNome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArtist = artistFilter === "todos" || item.artista_id === artistFilter;
    return matchesSearch && matchesArtist;
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setArtistFilter("todos");
    setStatusFilter("todos");
    setShareFilter("todos");
  };

  const handleDelete = () => {
    if (deleteModal.share) {
      deleteShare.mutate(deleteModal.share.id);
      setDeleteModal({ open: false });
    }
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
        onClick={() => setSharePendenteModal({ open: true })}
        data-testid="button-register-pending-share"
      >
        <Plus className="h-4 w-4" />
        Registrar Share Pendente
      </Button>
    </>
  );

  return (
    <MainLayout title="Gestão de Shares" actions={headerActions}>
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ArrowDownLeft className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">A Receber</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-a-receber">{shareReceber}</p>
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
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-recebidos">{shareRecebido}</p>
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
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-a-enviar">{shareEnviar}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aplicados</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-aplicados">{shareAplicado}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lançamento ou artista..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={artistFilter} onValueChange={setArtistFilter}>
                <SelectTrigger className="w-48" data-testid="select-artist">
                  <SelectValue placeholder="Artista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os artistas</SelectItem>
                  {artistas.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome_artistico}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="a_receber">A Receber</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="a_enviar">A Enviar</SelectItem>
                  <SelectItem value="aplicado">Aplicado</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || artistFilter !== "todos" || statusFilter !== "todos") && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} data-testid="button-clear-filters">
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lançamentos e Shares</CardTitle>
            <CardDescription>{filteredLancamentos.length} lançamentos encontrados</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLancamentos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lançamento</TableHead>
                    <TableHead>Artista</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Distribuidora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLancamentos.map((item: any) => {
                    const artista = artistas.find((a: any) => a.id === item.artista_id);
                    return (
                      <TableRow key={item.id} data-testid={`row-lancamento-${item.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center shrink-0">
                              <Image className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{item.titulo}</p>
                              <p className="text-sm text-muted-foreground">{item.data_lancamento}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{artista?.nome_artistico || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.tipo || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.distribuidora || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.status || "Ativo"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${item.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem data-testid={`button-ver-share-${item.id}`} onClick={() => setViewModal({ open: true, share: item })}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`button-editar-share-${item.id}`} onClick={() => setSharePendenteModal({ open: true, share: item })}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`button-excluir-share-${item.id}`} className="text-destructive" onClick={() => setDeleteModal({ open: true, share: item })}>
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
                title="Nenhum lançamento cadastrado"
                description="Os lançamentos aparecerão aqui para gestão de shares"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ShareViewModal
        open={viewModal.open}
        onOpenChange={(open) => setViewModal({ ...viewModal, open })}
        lancamento={viewModal.share}
      />

      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        onConfirm={handleDelete}
        title="Excluir Share"
        description="Tem certeza que deseja excluir este share? Esta ação não pode ser desfeita."
      />

      <SharePendenteFormModal
        open={sharePendenteModal.open}
        onOpenChange={(open) => setSharePendenteModal({ ...sharePendenteModal, open })}
      />
    </MainLayout>
  );
}
