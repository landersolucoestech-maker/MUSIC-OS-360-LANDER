import { useState, useCallback, useMemo } from "react";
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { FeatureGate } from "@/shared/components/FeatureGate";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { useConteudos } from "@/modules/marketing/hooks/useConteudos";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";
import { CalendarFilters } from "@/modules/marketing/components/calendar/CalendarFilters";
import { WeeklyCalendar } from "@/modules/marketing/components/calendar/WeeklyCalendar";
import { ContentModal } from "@/modules/marketing/components/calendar/ContentModal";

type ViewMode = "semana" | "mes" | "feed";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes",    label: "Mês" },
  { value: "feed",   label: "Feed" },
];

export default function MarketingCalendario() {
  const { conteudos, isLoading, deleteConteudo } = useConteudos();

  const [viewMode, setViewMode]   = useState<ViewMode>("semana");
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const [search, setSearch]               = useState("");
  const [filterPlats, setFilterPlats]     = useState<string[]>([]);
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterTipo, setFilterTipo]       = useState("all");

  const [modalOpen, setModalOpen]         = useState(false);
  const [modalMode, setModalMode]         = useState<"create" | "edit">("create");
  const [selectedConteudo, setSelectedConteudo] = useState<ConteudoWithRelations | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);
  const [prefilledHour, setPrefilledHour] = useState<string | null>(null);
  const [deleteModal, setDeleteModal]     = useState<{ open: boolean; conteudo?: ConteudoWithRelations }>({ open: false });

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

  const weekLabel = useMemo(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return `${format(weekStart, "d")} — ${format(end, "d 'de' MMMM, yyyy", { locale: ptBR })}`;
  }, [weekStart]);

  const headerActions = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40">
        {VIEW_OPTIONS.map((v) => (
          <button
            key={v.value}
            onClick={() => setViewMode(v.value)}
            data-testid={`view-${v.value}`}
            className={`px-3.5 h-7 rounded-lg text-xs font-medium transition-all ${
              viewMode === v.value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        className="h-9 gap-1.5 rounded-xl text-sm"
        onClick={handleNovoConteudo}
        data-testid="button-novo-conteudo"
      >
        <Plus className="h-3.5 w-3.5" />
        Novo Conteúdo
      </Button>
    </div>
  );

  return (
    <FeatureGate feature="moduleMarketing" featureName="Marketing & Campanhas">
      <MainLayout
        title="Calendário de Conteúdo"
        description="Planeje, visualize e organize suas publicações."
        actions={headerActions}
      >
        <div className="space-y-4">
          <CalendarFilters
            search={search}
            onSearchChange={setSearch}
            plataformas={filterPlats}
            onPlataformaToggle={onPlataformaToggle}
            status={filterStatus}
            onStatusChange={setFilterStatus}
            tipo={filterTipo}
            onTipoChange={setFilterTipo}
          />

          {viewMode === "semana" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setWeekStart((w) => subWeeks(w, 1))}
                    data-testid="button-prev-week"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setWeekStart((w) => addWeeks(w, 1))}
                    data-testid="button-next-week"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground capitalize">{weekLabel}</span>
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  data-testid="button-today"
                >
                  Hoje
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <CalendarDays className="h-10 w-10 animate-pulse" />
                    <span className="text-sm">Carregando calendário…</span>
                  </div>
                </div>
              ) : (
                <WeeklyCalendar
                  weekStart={weekStart}
                  conteudos={filteredConteudos}
                  onEdit={handleEdit}
                  onDelete={(c) => setDeleteModal({ open: true, conteudo: c })}
                  onSlotClick={handleSlotClick}
                />
              )}
            </>
          )}

          {viewMode !== "semana" && (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-border/50 text-muted-foreground gap-3">
              <CalendarDays className="h-10 w-10 opacity-30" />
              <p className="text-sm">Vista "{VIEW_OPTIONS.find((v) => v.value === viewMode)?.label}" em breve</p>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setViewMode("semana")}>
                Voltar para Semana
              </Button>
            </div>
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
