import { useState, useMemo, useRef } from "react";
import { fetchAllPages } from "@/shared/lib/exportAll";
import { endOfWeek, endOfMonth, endOfYear, startOfDay, endOfDay, format, startOfMonth, startOfWeek, startOfYear, subWeeks, addWeeks, addMonths, subMonths, addYears, subYears } from "date-fns";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { MetricCard } from "@/shared/components/MetricCard";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { Calendar, Plus, Loader2, Eye, Pencil, Trash2, CalendarDays, CheckCircle2, Clock, CalendarClock, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useEventosScoped, useEventosStats } from "@/modules/events/hooks/useEventosPaginated";
import { formatDate, formatCurrency } from "@/shared/lib/format-utils";
import { SchedulerFormModal } from "@/modules/events/components/SchedulerFormModal";
import { SchedulerViewModal } from "@/modules/events/components/SchedulerViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { UnavailableState } from "@/shared/components/UnavailableState";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { FeatureGate } from "@/shared/components/FeatureGate";
import { toast } from "sonner";
import { EntityCalendarView, type CalendarEvent } from "@/shared/components/EntityCalendarView";
import type { SchedulerViewMode } from "@/modules/events/components/types";
import { useOperationalSettings } from "@/modules/settings/hooks/useOperationalSettings";
import {
  normalizeAgendaParticipants,
  summarizeAgendaParticipants,
  useAgendaParticipants,
} from "@/modules/events/hooks/useAgendaParticipants";
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
    case "confirmado": return <Badge variant="success">Confirmado</Badge>;
    case "agendado":
    case "pendente":
    case "negociacao": return <Badge variant="warning">Pendente</Badge>;
    case "realizado": return <Badge variant="info">Realizado</Badge>;
    case "cancelado": return <Badge variant="danger">Cancelado</Badge>;
    default: return <Badge variant="neutral">{status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>;
  }
};

const VIEW_OPTIONS: { value: SchedulerViewMode; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
];

// Cor do chip por status (mesma identidade do calendário de conteúdo).
const STATUS_TONE: Record<string, string> = {
  confirmado: "border-emerald-300/40 bg-emerald-400/15 text-emerald-700",
  realizado: "border-sky-300/40 bg-sky-400/15 text-sky-700",
  agendado: "border-amber-300/40 bg-amber-400/15 text-amber-700",
  pendente: "border-amber-300/40 bg-amber-400/15 text-amber-700",
  negociacao: "border-amber-300/40 bg-amber-400/15 text-amber-700",
  cancelado: "border-rose-300/40 bg-rose-400/15 text-rose-700",
};

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

function ToolbarSelect({
  value,
  onValueChange,
  options,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("h-8 text-xs", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Agenda() {
  const { eventos: rawEventos, isLoading: loadingUnbounded, deleteEvento, addEvento } = useEventos();
  const eventos = rawEventos as Evento[];
  const { getOptionsByKind } = useOperationalSettings();
  const eventTypeOptions = getOptionsByKind("event_type");
  const eventTypeLabels = useMemo(
    () => Object.fromEntries(eventTypeOptions.map((option) => [option.value, option.label])),
    [eventTypeOptions],
  );
  const typeOptions = useMemo(
    () => [{ value: "all-type", label: "Todos Tipos" }, ...(eventTypeOptions.length > 0 ? eventTypeOptions : TIPO_OPTIONS.slice(1))],
    [eventTypeOptions],
  );
  const { getArtistParticipantById } = useAgendaParticipants();

  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; evento?: Evento }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; evento?: Evento }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; evento?: Evento }>({ open: false });
  const [viewMode, setViewMode] = useState<SchedulerViewMode>("semana");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Bounds do período visível (dia/semana/mês/ano) — o calendário busca só
  // os eventos desse período (Task H: sem isso, o fetch ficava preso ao
  // limit=50 default do backend e sumia eventos silenciosamente em
  // qualquer mês navegado, em tenants com mais de 50 eventos no total).
  const { periodStart, periodEnd } = useMemo(() => {
    if (viewMode === "dia") return { periodStart: startOfDay(currentDate), periodEnd: endOfDay(currentDate) };
    if (viewMode === "mes") return { periodStart: startOfMonth(currentDate), periodEnd: endOfMonth(currentDate) };
    if (viewMode === "ano") return { periodStart: startOfYear(currentDate), periodEnd: endOfYear(currentDate) };
    return { periodStart: startOfWeek(currentDate, { weekStartsOn: 1 }), periodEnd: endOfWeek(currentDate, { weekStartsOn: 1 }) };
  }, [viewMode, currentDate]);

  const {
    eventos: scopedEventosRaw, isLoading: isLoadingScoped, error: scopedError, refetch: refetchScoped,
  } = useEventosScoped({
    dateFrom: periodStart.toISOString(),
    dateTo: periodEnd.toISOString(),
    tipo: typeFilter !== "all-type" ? typeFilter : undefined,
    status: statusFilter !== "all-status" ? statusFilter : undefined,
  });
  const scopedEventos = scopedEventosRaw as Evento[];

  const { kpis: metricas } = useEventosStats();

  const getEventoParticipants = useMemo(() => (evento: Evento) => {
    const meta = (evento.metadata as Record<string, unknown> | undefined) ?? {};
    const stored = normalizeAgendaParticipants(meta["participants"]);
    if (stored.length > 0) return stored;
    const artist = getArtistParticipantById(evento.artista_id);
    return artist ? [artist] : [];
  }, [getArtistParticipantById]);

  const handleExcelExport = async () => {
    // Task I: varredura completa via paginação iterativa server-side —
    // antes exportava só `eventos` (useEventos() sem filtro, preso ao
    // limit=50 default do backend). Preserva os filtros de tipo/status
    // ativos na tela; não escopa ao período do calendário (export é "todos
    // os eventos que casam com o filtro", não "só o que está visível agora").
    const filters: Record<string, unknown> = {};
    if (typeFilter !== "all-type") filters.tipo = typeFilter;
    if (statusFilter !== "all-status") filters.status = statusFilter;

    const { items: allEventos, truncated } = await fetchAllPages<Evento>("eventos", { filters });

    if (allEventos.length === 0) {
      toast.error("Nenhum evento para exportar");
      return;
    }

    const exportData = allEventos.map(e => ({
      titulo: e.titulo,
      tipo_evento: e.tipo_evento,
      status: e.status,
      participantes: summarizeAgendaParticipants(getEventoParticipants(e)),
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
    if (truncated) {
      toast.warning(`Exportação limitada a ${allEventos.length} evento(s) (tenant muito grande) — refine os filtros para exportar o restante.`);
    } else {
      toast.success(`${allEventos.length} evento(s) exportado(s) com sucesso!`);
    }
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

  // Tipo/status já aplicados server-side em useEventosScoped(); a busca por
  // texto continua client-side sobre o período já escopado (título, local E
  // nome de participante — o backend não indexa nome de participante).
  const filteredEventos = useMemo(() => {
    if (!searchTerm) return scopedEventos;
    const term = searchTerm.toLowerCase();
    return scopedEventos.filter((evento) =>
      evento.titulo?.toLowerCase().includes(term) ||
      evento.local?.toLowerCase().includes(term) ||
      summarizeAgendaParticipants(getEventoParticipants(evento)).toLowerCase().includes(term),
    );
  }, [scopedEventos, searchTerm, getEventoParticipants]);

  const schedulerEvents = useMemo(() => filteredEventos.map((evento) => {
    const start = evento.data_inicio ? new Date(`${evento.data_inicio}T${evento.horario_inicio ?? "00:00"}:00`) : new Date();
    const end = evento.data_fim ? new Date(`${evento.data_fim}T${evento.horario_fim ?? evento.horario_inicio ?? "00:00"}:00`) : undefined;

    return {
      id: evento.id,
      title: evento.titulo ?? "Evento",
      artist: summarizeAgendaParticipants(getEventoParticipants(evento)) || undefined,
      startDate: start,
      endDate: end,
      location: evento.local,
      status: evento.status ?? "pendente",
      cache: evento.valor_cache ?? undefined,
      type: eventTypeLabels[evento.tipo_evento] ?? tipoEventoLabels[evento.tipo_evento] ?? evento.tipo_evento ?? "Evento",
      allDay: !evento.horario_inicio,
      raw: evento,
    };
  }), [filteredEventos, getEventoParticipants, eventTypeLabels]);

  const isoFromDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const calendarEvents: CalendarEvent[] = useMemo(() => schedulerEvents.map((e) => ({
    id: e.id,
    title: e.title,
    dateISO: isoFromDate(e.startDate),
    time: e.allDay ? null : (e.raw.horario_inicio ?? `${String(e.startDate.getHours()).padStart(2, "0")}:${String(e.startDate.getMinutes()).padStart(2, "0")}`),
    toneClass: STATUS_TONE[String(e.status)] ?? undefined,
    hint: e.artist ? `${e.title} · ${e.artist}` : e.title,
  })), [schedulerEvents]);

  const openEventView = (id: string) => {
    const evento = scopedEventos.find((ev) => ev.id === id);
    if (evento) setViewModal({ open: true, evento });
  };

  const periodLabel = useMemo(() => {
    if (viewMode === "semana") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d")} — ${format(end, "d 'de' MMMM, yyyy")}`;
    }
    if (viewMode === "mes") {
      return format(currentDate, "MMMM 'de' yyyy");
    }
    if (viewMode === "ano") {
      return format(currentDate, "yyyy");
    }
    return format(currentDate, "d 'de' MMMM yyyy");
  }, [currentDate, viewMode]);

  const goToToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (viewMode === "semana") setCurrentDate((date) => subWeeks(date, 1));
    if (viewMode === "mes") setCurrentDate((date) => subMonths(date, 1));
    if (viewMode === "ano") setCurrentDate((date) => subYears(date, 1));
  };
  const goNext = () => {
    if (viewMode === "semana") setCurrentDate((date) => addWeeks(date, 1));
    if (viewMode === "mes") setCurrentDate((date) => addMonths(date, 1));
    if (viewMode === "ano") setCurrentDate((date) => addYears(date, 1));
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

  const createButton = (
    <RequirePermission module="events" action="write">
      <Button size="sm" className="gap-2 bg-primary" onClick={() => setFormModal({ open: true, mode: "create" })}>
        <Plus className="h-4 w-4" />Novo Evento
      </Button>
    </RequirePermission>
  );

  return (
    <FeatureGate feature="moduleEvents" featureName="Agenda & Eventos">
    <>
    {loadingUnbounded || isLoadingScoped ? (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    ) : (
      <MainLayout title="Agenda" description="Gerencie shows, turnês e compromissos com foco operacional" actions={createButton}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Eventos" value={metricas.total} description="no total" icon={CalendarDays} accent="primary" />
            <MetricCard title="Confirmados" value={metricas.confirmados} description="eventos confirmados" icon={CheckCircle2} accent="success" />
            <MetricCard title="Pendentes" value={metricas.pendentes} description="aguardando confirmação" icon={Clock} accent="warning" />
            <MetricCard title="Próximos 7 dias" value={metricas.proximos7Dias} description="na próxima semana" icon={CalendarClock} accent="primary" />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 p-3">
            <Button variant="outline" size="sm" className="h-8 px-3" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} aria-label="Período anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} aria-label="Próximo período">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="min-w-[132px] px-1 text-sm font-medium text-muted-foreground">{periodLabel}</span>

            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar evento..."
                className="h-8 pl-9"
              />
            </div>

            <ToolbarSelect
              value={viewMode}
              onValueChange={(value) => setViewMode(value as SchedulerViewMode)}
              options={VIEW_OPTIONS}
              className="w-[100px]"
            />
            <ToolbarSelect
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={typeOptions}
              className="w-[132px]"
            />
            <ToolbarSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={STATUS_OPTIONS}
              className="w-[132px]"
            />
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="h-8 px-3" onClick={handleClearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {filteredEventos.length === 0 ? (
              scopedError && scopedEventos.length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <UnavailableState onRetry={() => refetchScoped()} />
                  </CardContent>
                </Card>
              ) : (
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
              )
            ) : (
              <EntityCalendarView
                view={(viewMode === "dia" || viewMode === "semana" || viewMode === "mes" || viewMode === "ano") ? viewMode : "mes"}
                referenceDate={currentDate}
                events={calendarEvents}
                onSelect={openEventView}
              />
            )}
          </div>
        </div>
      </MainLayout>
    )}

      {/* Fora do gate de isLoading de propósito — mesmo bug de /artistas
          (Task C): SchedulerFormModal chama useEventos() de novo só para
          as mutations, a mesma query do isLoading acima. */}
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
    </>
    </FeatureGate>
  );
}
