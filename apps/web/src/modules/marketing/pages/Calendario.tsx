import { useState, useCallback, useMemo } from "react";
import {
  addDays, subDays,
  addWeeks, subWeeks, startOfWeek,
  addMonths, subMonths, startOfMonth,
  addYears, subYears, startOfYear,
  endOfWeek, format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { FeatureGate } from "@/shared/components/FeatureGate";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { useConteudos } from "@/modules/marketing/hooks/useConteudos";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";
import { useContentScheduler } from "@/modules/marketing/hooks/useContentScheduler";
import { SchedulerToolbar } from "@/modules/events/components/SchedulerToolbar";
import { SchedulerWeekView } from "@/modules/events/components/SchedulerWeekView";
import { SchedulerMonthView } from "@/modules/events/components/SchedulerMonthView";
import { DayCalendar } from "@/modules/marketing/components/calendar/DayCalendar";
import type { SchedulerViewMode } from "@/modules/events/components/types";
import { YearCalendar } from "@/modules/marketing/components/calendar/YearCalendar";
import { FeedView } from "@/modules/marketing/components/calendar/FeedView";
import { ContentModal } from "@/modules/marketing/components/calendar/ContentModal";

export default function MarketingCalendario() {
  const { conteudos, isLoading, deleteConteudo } = useConteudos();
  const { publishNow } = useContentScheduler();

  const [viewMode, setViewMode] = useState<SchedulerViewMode>("semana");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [search, setSearch]             = useState("");
  const [filterPlats, setFilterPlats]   = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo]     = useState("all");

  const [modalOpen, setModalOpen]       = useState(false);
  const [modalMode, setModalMode]       = useState<"create" | "edit">("create");
  const [selectedConteudo, setSelectedConteudo] = useState<ConteudoWithRelations | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);
  const [prefilledHour, setPrefilledHour] = useState<string | null>(null);
  const [deleteModal, setDeleteModal]   = useState<{ open: boolean; conteudo?: ConteudoWithRelations }>({ open: false });

  const VIEW_OPTIONS: { value: SchedulerViewMode; label: string }[] = [
    { value: "dia", label: "Dia" },
    { value: "semana", label: "Semana" },
    { value: "mes", label: "Mês" },
    { value: "ano", label: "Ano" },
    { value: "feed", label: "Feed" },
  ];

  const STATUS_OPTIONS = [
    { value: "all", label: "Todos os status" },
    { value: "agendado", label: "Agendado", dot: "bg-blue-400" },
    { value: "publicado", label: "Publicado", dot: "bg-emerald-400" },
    { value: "rascunho", label: "Rascunho", dot: "bg-slate-400" },
    { value: "pausado", label: "Pausado", dot: "bg-amber-400" },
    { value: "falha", label: "Falha", dot: "bg-rose-500" },
  ];

  const TIPO_OPTIONS = [
    { value: "all", label: "Todos os tipos" },
    { value: "post", label: "Post" },
    { value: "stories", label: "Stories" },
    { value: "video", label: "Vídeo" },
    { value: "reels", label: "Reels" },
    { value: "anuncio", label: "Anúncio" },
    { value: "carrossel", label: "Carrossel" },
  ];

  const handleNovoConteudo = () => {
    setSelectedConteudo(null);
    setPrefilledDate(null);
    setPrefilledHour(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleEdit = useCallback((c: ConteudoWithRelations) => {
    setSelectedConteudo(c);
    setPrefilledDate(null);
    setPrefilledHour(null);
    setModalMode("edit");
    setModalOpen(true);
  }, []);

  const handlePublish = useCallback(async (c: ConteudoWithRelations) => {
    await publishNow(c);
  }, [publishNow]);

  const handleSlotClick = useCallback((date: Date, hour: string) => {
    setSelectedConteudo(null);
    setPrefilledDate(date);
    setPrefilledHour(hour);
    setModalMode("create");
    setModalOpen(true);
  }, []);

  const handleDelete = async () => {
    if (deleteModal.conteudo?.id) {
      await deleteConteudo.mutateAsync(deleteModal.conteudo.id);
      setDeleteModal({ open: false });
    }
  };

  const onPlataformaToggle = (v: string) =>
    setFilterPlats((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const goToToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    if (viewMode === "dia")    setCurrentDate((d) => subDays(d, 1));
    if (viewMode === "semana") setCurrentDate((d) => subWeeks(d, 1));
    if (viewMode === "mes")    setCurrentDate((d) => subMonths(d, 1));
    if (viewMode === "ano")    setCurrentDate((d) => subYears(d, 1));
  };

  const goNext = () => {
    if (viewMode === "dia")    setCurrentDate((d) => addDays(d, 1));
    if (viewMode === "semana") setCurrentDate((d) => addWeeks(d, 1));
    if (viewMode === "mes")    setCurrentDate((d) => addMonths(d, 1));
    if (viewMode === "ano")    setCurrentDate((d) => addYears(d, 1));
  };

  const periodLabel = useMemo(() => {
    if (viewMode === "dia") {
      return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
    }
    if (viewMode === "semana") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d")} — ${format(we, "d 'de' MMMM, yyyy", { locale: ptBR })}`;
    }
    if (viewMode === "mes") {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return format(currentDate, "yyyy");
  }, [viewMode, currentDate]);

  const filteredConteudos = useMemo(() => {
    return conteudos.filter((c: ConteudoWithRelations) => {
      if (search) {
        const term = search.toLowerCase();
        if (
          !c.titulo?.toLowerCase().includes(term) &&
          !c.legenda?.toLowerCase().includes(term)
        ) return false;
      }
      if (filterPlats.length > 0) {
        const plats = Array.isArray(c.plataforma) ? c.plataforma : c.plataforma ? [c.plataforma] : [];
        if (!filterPlats.some((p) => plats.includes(p))) return false;
      }
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterTipo !== "all") {
        const tipos = Array.isArray(c.tipo_conteudo) ? c.tipo_conteudo : c.tipo_conteudo ? [c.tipo_conteudo] : [];
        if (!tipos.includes(filterTipo)) return false;
      }
      return true;
    });
  }, [conteudos, search, filterPlats, filterStatus, filterTipo]);

  const schedulerEvents = useMemo(() => filteredConteudos.map((conteudo) => {
    const contentDate = conteudo.data_publicacao ? new Date(conteudo.data_publicacao) : null;
    const hora = conteudo.horario_publicacao ? conteudo.horario_publicacao.slice(0, 5) : null;
    const startDate = contentDate
      ? hora
        ? new Date(`${format(contentDate, "yyyy-MM-dd")}T${hora}:00`)
        : contentDate
      : new Date();
    const plataforma = Array.isArray(conteudo.plataforma) ? conteudo.plataforma.join(", ") : conteudo.plataforma ?? "";

    return {
      id: conteudo.id,
      title: conteudo.titulo ?? "Conteúdo",
      artist: plataforma,
      startDate,
      location: plataforma,
      status: conteudo.status ?? "rascunho",
      cache: undefined,
      type: Array.isArray(conteudo.tipo_conteudo) ? conteudo.tipo_conteudo[0] : conteudo.tipo_conteudo ?? "",
      allDay: !hora,
      raw: conteudo,
    };
  }), [filteredConteudos]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const headerActions = (
    <Button
      size="sm"
      className="h-9 gap-1.5 rounded-xl text-sm"
      onClick={handleNovoConteudo}
      data-testid="button-novo-conteudo"
    >
      <Plus className="h-3.5 w-3.5" />
      Novo Conteúdo
    </Button>
  );

  return (
    <FeatureGate feature="moduleMarketing" featureName="Marketing & Campanhas">
      <MainLayout
        title="Calendário de Conteúdo"
        description="Planeje, visualize e organize suas publicações."
        actions={headerActions}
      >
        <div className="space-y-4">
          <SchedulerToolbar
            periodLabel={periodLabel}
            currentView={viewMode}
            viewOptions={VIEW_OPTIONS}
            onViewModeChange={setViewMode}
            onToday={goToToday}
            onPrev={goPrev}
            onNext={goNext}
            search={search}
            onSearchChange={setSearch}
            type={filterTipo}
            onTypeChange={setFilterTipo}
            typeOptions={TIPO_OPTIONS}
            status={filterStatus}
            onStatusChange={setFilterStatus}
            statusOptions={STATUS_OPTIONS}
          />

          {isLoading ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <CalendarDays className="h-10 w-10 animate-pulse" />
                <span className="text-sm">Carregando calendário…</span>
              </div>
            </div>
          ) : (
            <>
              {viewMode === "dia" && (
                <DayCalendar
                  day={currentDate}
                  conteudos={filteredConteudos}
                  onEdit={handleEdit}
                  onDelete={(c) => setDeleteModal({ open: true, conteudo: c })}
                  onSlotClick={handleSlotClick}
                />
              )}

              {viewMode === "semana" && (
                <SchedulerWeekView
                  weekStart={weekStart}
                  events={schedulerEvents}
                  onEdit={(event) => handleEdit(event.raw as ConteudoWithRelations)}
                  onDelete={(event) => setDeleteModal({ open: true, conteudo: event.raw as ConteudoWithRelations })}
                  onSlotClick={handleSlotClick}
                />
              )}

              {viewMode === "mes" && (
                <SchedulerMonthView
                  month={startOfMonth(currentDate)}
                  events={schedulerEvents}
                  onEdit={(event) => handleEdit(event.raw as ConteudoWithRelations)}
                  onDelete={(event) => setDeleteModal({ open: true, conteudo: event.raw as ConteudoWithRelations })}
                  onSlotClick={handleSlotClick}
                />
              )}

              {viewMode === "ano" && (
                <YearCalendar
                  year={startOfYear(currentDate)}
                  conteudos={filteredConteudos}
                  onMonthClick={(month) => {
                    setCurrentDate(month);
                    setViewMode("mes");
                  }}
                />
              )}

              {viewMode === "feed" && (
                <FeedView
                  conteudos={filteredConteudos}
                  onEdit={handleEdit}
                  onDelete={(c) => setDeleteModal({ open: true, conteudo: c })}
                  onPublish={handlePublish}
                />
              )}
            </>
          )}
        </div>

        <ContentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          initialData={selectedConteudo}
          mode={modalMode}
          prefilledDate={prefilledDate}
          prefilledHour={prefilledHour}
        />

        <DeleteConfirmModal
          open={deleteModal.open}
          onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
          title="Excluir Conteúdo"
          description={`Tem certeza que deseja excluir "${deleteModal.conteudo?.titulo}"?`}
          onConfirm={handleDelete}
        />
      </MainLayout>
    </FeatureGate>
  );
}
