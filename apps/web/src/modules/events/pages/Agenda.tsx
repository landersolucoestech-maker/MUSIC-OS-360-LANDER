import { useState, useMemo, useRef } from "react";
import { endOfWeek, format, startOfMonth, startOfWeek, subWeeks, addWeeks, addMonths, subMonths } from "date-fns";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Calendar, Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { formatDate, formatCurrency } from "@/shared/lib/format-utils";
import { SchedulerFormModal } from "@/modules/events/components/SchedulerFormModal";
import { SchedulerViewModal } from "@/modules/events/components/SchedulerViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { FeatureGate } from "@/shared/components/FeatureGate";
import { toast } from "sonner";
import { SchedulerToolbar } from "@/modules/events/components/SchedulerToolbar";
import { SchedulerWeekView } from "@/modules/events/components/SchedulerWeekView";
import { SchedulerMonthView } from "@/modules/events/components/SchedulerMonthView";
import { SchedulerDayView } from "@/modules/events/components/SchedulerDayView";
import type { SchedulerViewMode } from "@/modules/events/components/types";
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
    case "pendente":
    case "negociacao": return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
    case "realizado": return <Badge className="bg-blue-600 text-[#ffffff]">Realizado</Badge>;
    case "cancelado": return <Badge className="bg-destructive text-destructive-foreground">Cancelado</Badge>;
    default: return <Badge variant="secondary">{status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>;
  }
};

const VIEW_OPTIONS: { value: SchedulerViewMode; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

const TIPO_OPTIONS = [
  { value: "all-type", label: "Todos Tipos" },
  { value: "shows", label: "Shows" },
  { value: "sessoes_estudio", label: "Sessões de Estúdio" },
  { value: "ensaios", label: "Ensaios" },
  { value: "sessoes_fotos", label: "Sessões de Fotos" },
  { value: "entrevistas", label: "Entrevistas" },
  { value: "podcasts", label: "Podcasts" },
  { value: "programas_tv", label: "Programas de TV" },
  { value: "radio", label: "Rádio" },
  { value: "producao_conteudo", label: "Produção de Conteúdo" },
  { value: "reunioes", label: "Reuniões" },
];

const STATUS_OPTIONS = [
  { value: "all-status", label: "Todos Status" },
  { value: "confirmado", label: "Confirmado", dot: "bg-emerald-400" },
  { value: "pendente", label: "Pendente", dot: "bg-amber-400" },
  { value: "agendado", label: "Agendado", dot: "bg-amber-400" },
  { value: "realizado", label: "Realizado", dot: "bg-sky-400" },
  { value: "cancelado", label: "Cancelado", dot: "bg-rose-500" },
  { value: "negociacao", label: "Negociação", dot: "bg-amber-400" },
];

export default function Agenda() {
  const { eventos: rawEventos, isLoading, deleteEvento, addEvento } = useEventos();
  const eventos = rawEventos as Evento[];
  const { artistas } = useArtistas();

  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; evento?: Evento }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; evento?: Evento }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; evento?: Evento }>({ open: false });
  const [viewMode, setViewMode] = useState<SchedulerViewMode>("semana");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const excelInputRef = useRef<HTMLInputElement>(null);

  const getArtistaById = useMemo(() => (id: string | null) => id ? artistas.find(a => a.id === id) : undefined, [artistas]);

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

  const schedulerEvents = useMemo(() => filteredEventos.map((evento) => {
    const start = evento.data_inicio ? new Date(`${evento.data_inicio}T${evento.horario_inicio ?? "00:00"}:00`) : new Date();
    const end = evento.data_fim ? new Date(`${evento.data_fim}T${evento.horario_fim ?? evento.horario_inicio ?? "00:00"}:00`) : undefined;

    return {
      id: evento.id,
      title: evento.titulo ?? "Evento",
      artist: getArtistaById(evento.artista_id)?.nome_artistico,
      startDate: start,
      endDate: end,
      location: evento.local,
      status: evento.status ?? "pendente",
      cache: evento.valor_cache ?? undefined,
      type: tipoEventoLabels[evento.tipo_evento] ?? evento.tipo_evento ?? "Evento",
      allDay: !evento.horario_inicio,
      raw: evento,
    };
  }), [filteredEventos, getArtistaById]);

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

  const periodLabel = useMemo(() => {
    if (viewMode === "semana") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d")} — ${format(end, "d 'de' MMMM, yyyy")}`;
    }
    if (viewMode === "mes") {
      return format(currentDate, "MMMM 'de' yyyy");
    }
    return format(currentDate, "d 'de' MMMM yyyy");
  }, [currentDate, viewMode]);

  const goToToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (viewMode === "semana") setCurrentDate((date) => subWeeks(date, 1));
    if (viewMode === "mes") setCurrentDate((date) => subMonths(date, 1));
  };
  const goNext = () => {
    if (viewMode === "semana") setCurrentDate((date) => addWeeks(date, 1));
    if (viewMode === "mes") setCurrentDate((date) => addMonths(date, 1));
  };

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all-type" || statusFilter !== "all-status";

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all-type");
    setStatusFilter("all-status");
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

  const createButton = (
    <RequirePermission module="events" action="write">
      <Button size="sm" className="gap-2 bg-primary" onClick={() => setFormModal({ open: true, mode: "create" })}>
        <Plus className="h-4 w-4" />Novo Evento
      </Button>
    </RequirePermission>
  );

  return (
    <FeatureGate feature="moduleEvents" featureName="Agenda & Eventos">
      <MainLayout title="Agenda" description="Gerencie shows, turnês e compromissos com foco operacional" actions={createButton}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-border/20 bg-card/80 px-4 py-3 text-sm text-foreground shadow-sm">
            <span className="rounded-full bg-muted/70 px-3 py-2 font-semibold">{metricas.total} Eventos</span>
            <span className="rounded-full bg-muted/70 px-3 py-2 font-semibold">{metricas.confirmados} Confirmados</span>
            <span className="rounded-full bg-muted/70 px-3 py-2 font-semibold">{metricas.pendentes} Pendentes</span>
            <span className="rounded-full bg-muted/70 px-3 py-2 font-semibold">{metricas.proximos7Dias} Próximos</span>
          </div>

          <SchedulerToolbar
            periodLabel={periodLabel}
            currentView={viewMode}
            viewOptions={VIEW_OPTIONS}
            onViewModeChange={setViewMode}
            onToday={goToToday}
            onPrev={goPrev}
            onNext={goNext}
            search={searchTerm}
            onSearchChange={setSearchTerm}
            type={typeFilter}
            onTypeChange={setTypeFilter}
            typeOptions={TIPO_OPTIONS}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={STATUS_OPTIONS}
            extraFilters={hasActiveFilters ? (
              <Button variant="outline" size="sm" className="h-10" onClick={handleClearFilters}>
                Limpar filtros
              </Button>
            ) : undefined}
          />

          <div className="space-y-4">
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
                      onClick={() => setFormModal({ open: true, mode: "create" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar primeiro evento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === "dia" ? (
              <SchedulerDayView
                day={currentDate}
                events={schedulerEvents}
                onSlotClick={(date, hour) => setFormModal({ open: true, mode: "create" })}
                onView={(event) => setViewModal({ open: true, evento: event.raw as Evento })}
                onEdit={(event) => setFormModal({ open: true, mode: "edit", evento: event.raw as Evento })}
                onDelete={(event) => setDeleteModal({ open: true, evento: event.raw as Evento })}
              />
            ) : viewMode === "semana" ? (
              <SchedulerWeekView
                weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                events={schedulerEvents}
                onSlotClick={(date, hour) => setFormModal({ open: true, mode: "create" })}
                onView={(event) => setViewModal({ open: true, evento: event.raw as Evento })}
                onEdit={(event) => setFormModal({ open: true, mode: "edit", evento: event.raw as Evento })}
                onDelete={(event) => setDeleteModal({ open: true, evento: event.raw as Evento })}
              />
            ) : (
              <SchedulerMonthView
                month={startOfMonth(currentDate)}
                events={schedulerEvents}
                onSlotClick={(date, hour) => setFormModal({ open: true, mode: "create" })}
                onView={(event) => setViewModal({ open: true, evento: event.raw as Evento })}
                onEdit={(event) => setFormModal({ open: true, mode: "edit", evento: event.raw as Evento })}
                onDelete={(event) => setDeleteModal({ open: true, evento: event.raw as Evento })}
              />
            )}
          </div>
        </div>

        <SchedulerViewModal
          open={viewModal.open}
          onOpenChange={(open) => setViewModal({ ...viewModal, open })}
          evento={viewModal.evento as any}
          onEdit={() => {
            setViewModal({ open: false });
            setFormModal({ open: true, mode: "edit", evento: viewModal.evento });
          }}
        />
        <SchedulerFormModal
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
    </FeatureGate>
  );
}
