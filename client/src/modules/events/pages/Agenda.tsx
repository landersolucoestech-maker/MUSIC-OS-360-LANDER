import { useState, useMemo, useRef } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Calendar, CheckCircle, Clock, Users, Upload, Download, Plus, Search, MapPin, Loader2, Eye, Pencil, Trash2, Music, DollarSign, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { formatDate, formatCurrency } from "@/shared/lib/format-utils";
import { EventoFormModal } from "@/modules/events/components/EventoFormModal";
import { EventoViewModal } from "@/modules/events/components/EventoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { toast } from "sonner";
const getXLSX = () => import("xlsx");

type Evento = Record<string, any>;

const tipoEventoLabels: Record<string, string> = {
  sessoes_estudio: "Estúdio",
  ensaios: "Ensaio",
  sessoes_fotos: "Fotos",
  shows: "Show",
  entrevistas: "Entrevista",
  podcasts: "Podcast",
  programas_tv: "TV",
  radio: "Rádio",
  producao_conteudo: "Conteúdo",
  reunioes: "Reunião",
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmado": return <Badge className="bg-success text-[#000000]">Confirmado</Badge>;
    case "agendado":
    case "pendente": return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
    case "realizado": return <Badge className="bg-blue-600 text-[#ffffff]">Realizado</Badge>;
    case "cancelado": return <Badge className="bg-destructive text-destructive-foreground">Cancelado</Badge>;
    default: return <Badge variant="secondary">{status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>;
  }
};

export default function Agenda() {
  const { eventos: rawEventos, isLoading, deleteEvento, addEvento } = useEventos();
  const eventos = rawEventos as Evento[];
  const { artistas } = useArtistas();

  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; evento?: Evento }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; evento?: Evento }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; evento?: Evento }>({ open: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const excelInputRef = useRef<HTMLInputElement>(null);

  const getArtistaById = (id: string | null) => id ? artistas.find(a => a.id === id) : undefined;

  const handleExcelExport = async () => {
    if (eventos.length === 0) {
      toast.error("Nenhum evento para exportar");
      return;
    }
    
    const exportData = eventos.map(e => ({
      titulo: e.titulo,
      tipo_evento: e.tipo_evento,
      status: e.status,
      artista: getArtistaById(e.artista_id)?.nome_artistico || "",
      data_inicio: e.data_inicio,
      horario_inicio: e.horario_inicio || "",
      data_fim: e.data_fim || "",
      horario_fim: e.horario_fim || "",
      local: e.local || "",
      cidade: e.cidade || "",
      estado: e.estado || "",
      valor_cache: e.valor_cache || "",
      valor_ingresso: e.valor_ingresso || "",
      capacidade: e.capacidade || "",
      descricao: e.descricao || "",
      observacoes: e.observacoes || "",
    }));
    
    const XLSX = await getXLSX();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agenda");
    XLSX.writeFile(workbook, `agenda_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${eventos.length} evento(s) exportado(s) com sucesso!`);
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await getXLSX();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        toast.error("Arquivo Excel vazio");
        return;
      }

      let importados = 0;
      for (const row of data) {
        const titulo = row.titulo || row.Titulo || row.TITULO || row.Título;
        if (!titulo) continue;

        await addEvento.mutateAsync({
          titulo,
          tipo_evento: row.tipo_evento || row.tipo || row.Tipo || "show",
          status: row.status || row.Status || "pendente",
          data_inicio: row.data_inicio || row.data || row.Data || new Date().toISOString().split('T')[0],
          data_fim: row.data_fim || row["Data Fim"] || null,
          horario_inicio: row.horario_inicio || row.horario || row.Horario || null,
          horario_fim: row.horario_fim || row["Horário Fim"] || null,
          local: row.local || row.Local || null,
          cidade: row.cidade || row.Cidade || null,
          estado: row.estado || row.Estado || null,
          valor_cache: row.valor_cache || row["Valor Cachê"] ? Number(row.valor_cache || row["Valor Cachê"]) : null,
          capacidade: row.capacidade || row.capacidade_publico || row["Capacidade"] ? Number(row.capacidade || row.capacidade_publico || row["Capacidade"]) : null,
          descricao: row.descricao || row.Descrição || null,
          observacoes: row.observacoes || row.Observações || null,
        } as any);
        importados++;
      }

      toast.success(`${importados} evento(s) importado(s) com sucesso!`);
      if (excelInputRef.current) excelInputRef.current.value = "";
    } catch {
      toast.error("Erro ao importar arquivo Excel");
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const filteredEventos = useMemo(() => {
    return eventos.filter((evento) => {
      const artista = getArtistaById(evento.artista_id);
      const matchesSearch = evento.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista?.nome_artistico?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all-type" || evento.tipo_evento?.toLowerCase() === typeFilter.toLowerCase();
      const matchesStatus = statusFilter === "all-status" || evento.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [eventos, searchTerm, typeFilter, statusFilter, artistas]);

  const metricas = useMemo(() => {
    const confirmados = eventos.filter(e => e.status === "confirmado").length;
    const pendentes = eventos.filter(e => e.status === "agendado" || e.status === "pendente").length;
    
    // Count events in next 7 days
    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const proximos7Dias = eventos.filter(e => {
      const dataEvento = new Date(e.data_inicio);
      return dataEvento >= hoje && dataEvento <= em7Dias;
    }).length;

    return {
      total: eventos.length,
      confirmados,
      pendentes,
      proximos7Dias
    };
  }, [eventos]);

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all-type" || statusFilter !== "all-status";

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all-type");
    setStatusFilter("all-status");
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEventos.length && filteredEventos.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEventos.map((e: any) => e.id));
    }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteEvento.mutate(id));
    toast.success(`${selectedIds.length} evento(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };

  const handleDelete = () => {
    if (deleteModal.evento) {
      deleteEvento.mutate(deleteModal.evento.id);
      setDeleteModal({ open: false });
    }
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
    <>
      <input
        type="file"
        ref={excelInputRef}
        accept=".xlsx,.xls"
        onChange={handleExcelImport}
        className="hidden"
        data-testid="input-excel-import"
      />
      <RequirePermission module="events" action="write">
        <Button size="sm" className="gap-2 bg-primary" onClick={() => setFormModal({ open: true, mode: "create" })} data-testid="button-new-event">
          <Plus className="h-4 w-4" />Novo Evento
        </Button>
      </RequirePermission>
    </>
  );

  return (
    <MainLayout title="Agenda" description="Gerencie shows, eventos e compromissos" actions={headerActions}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Eventos</span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmados</span>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.confirmados}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">eventos confirmados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendentes</span>
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.pendentes}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">aguardando confirmação</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Próximos 7 dias</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.proximos7Dias}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">eventos agendados</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar eventos por nome, local ou artista..." 
              className="pl-10 bg-background" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-eventos"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-tipo-evento">
              <SelectValue placeholder="Todos Tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-type">Todos Tipos</SelectItem>
              <SelectItem value="shows">Shows</SelectItem>
              <SelectItem value="sessoes_estudio">Sessões de Estúdio</SelectItem>
              <SelectItem value="ensaios">Ensaios</SelectItem>
              <SelectItem value="sessoes_fotos">Sessões de Fotos</SelectItem>
              <SelectItem value="entrevistas">Entrevistas</SelectItem>
              <SelectItem value="podcasts">Podcasts</SelectItem>
              <SelectItem value="programas_tv">Programas de TV</SelectItem>
              <SelectItem value="radio">Rádio</SelectItem>
              <SelectItem value="producao_conteudo">Produção de Conteúdo</SelectItem>
              <SelectItem value="reunioes">Reuniões</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-evento">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos Status</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && <Button variant="outline" onClick={handleClearFilters} data-testid="button-limpar-filtros">Limpar</Button>}
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-eventos-title">Todos os Eventos</h2>
              <p className="text-sm text-muted-foreground" data-testid="text-eventos-count">{filteredEventos.length} evento(s) encontrado(s)</p>
            </div>
          </div>

          {eventos.length > 0 && filteredEventos.length > 0 && (
            <div className="flex items-center gap-3 mb-2 pb-3 border-b border-border">
              <div
                className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center cursor-pointer"
                onClick={toggleSelectAll}
                data-testid="checkbox-select-all"
              >
                {selectedIds.length === filteredEventos.length && filteredEventos.length > 0 && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
              <span className="text-sm text-muted-foreground flex-1">Selecionar todos</span>
              {selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir ({selectedIds.length})
                </Button>
              )}
            </div>
          )}
          {filteredEventos.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum evento encontrado</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    data-testid="button-criar-primeiro-evento"
                    onClick={() => setFormModal({ open: true, mode: "create" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro evento
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Título / Tipo</TableHead>
                        <TableHead>Artista</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Cachê</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEventos.map((evento) => {
                        const artista = getArtistaById(evento.artista_id);
                        return (
                          <TableRow key={evento.id} data-testid={`card-evento-${evento.id}`}>
                            <TableCell className="py-3">
                              <div
                                className={`w-5 h-5 rounded border-2 border-primary flex items-center justify-center cursor-pointer ${selectedIds.includes(evento.id) ? "bg-primary" : ""}`}
                                onClick={(e) => { e.stopPropagation(); toggleSelect(evento.id); }}
                                data-testid={`checkbox-evento-${evento.id}`}
                              >
                                {selectedIds.includes(evento.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <p className="font-semibold text-sm text-foreground" data-testid={`text-evento-titulo-${evento.id}`}>{evento.titulo}</p>
                              <Badge variant="outline" className="text-[10px] mt-1">{tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento || "evento"}</Badge>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <Music className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm" data-testid={`text-evento-artista-${evento.id}`}>{artista?.nome_artistico || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-sm" data-testid={`text-evento-data-${evento.id}`}>{formatDate(evento.data_inicio)}</TableCell>
                            <TableCell className="py-3 text-sm" data-testid={`text-evento-horario-${evento.id}`}>{evento.horario_inicio || "-"}</TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm" data-testid={`text-evento-local-${evento.id}`}>{evento.local || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-sm font-medium text-success" data-testid={`text-evento-cache-${evento.id}`}>
                              {evento.valor_cache != null ? formatCurrency(evento.valor_cache) : "-"}
                            </TableCell>
                            <TableCell className="py-3">{getStatusBadge(evento.status)}</TableCell>
                            <TableCell className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-menu-evento-${evento.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem data-testid={`button-ver-evento-${evento.id}`} onClick={() => setViewModal({ open: true, evento })}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem data-testid={`button-editar-evento-${evento.id}`} onClick={() => setFormModal({ open: true, mode: "edit", evento })}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem data-testid={`button-excluir-evento-${evento.id}`} className="text-destructive" onClick={() => setDeleteModal({ open: true, evento })}>
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EventoViewModal 
        open={viewModal.open} 
        onOpenChange={(open) => setViewModal({ ...viewModal, open })} 
        evento={viewModal.evento as any}
        onEdit={() => {
          setViewModal({ open: false });
          setFormModal({ open: true, mode: "edit", evento: viewModal.evento });
        }}
      />
      <EventoFormModal 
        open={formModal.open} 
        onOpenChange={(open) => setFormModal({ ...formModal, open })} 
        evento={formModal.evento as any} 
        mode={formModal.mode} 
      />
      <DeleteConfirmModal 
        open={deleteModal.open} 
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} 
        title="Excluir Evento" 
        description={`Tem certeza que deseja excluir "${deleteModal.evento?.titulo}"?`} 
        onConfirm={handleDelete} 
      />
    </MainLayout>
  );
}
