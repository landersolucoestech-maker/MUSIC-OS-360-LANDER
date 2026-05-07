import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  TrendingUp, Users, DollarSign, Target, ChevronRight,
  Eye, Pencil, Search, Calendar, Building2, AlertTriangle, Clock,
} from "lucide-react";
import { useLeads, STATUS_LEAD_OPTIONS, STATUS_LABELS } from "@/modules/leads/hooks/useLeads";
import { LeadViewModal } from "@/modules/leads/components/LeadViewModal";
import { LeadFormModal } from "@/modules/leads/components/LeadFormModal";
import { formatCurrency } from "@/shared/lib/format-utils";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

const STAGE_COLORS: Record<string, { bg: string; bar: string; text: string; border: string }> = {
  novo:              { bg: "bg-blue-500/10",    bar: "bg-blue-500",    text: "text-blue-500",    border: "border-blue-500/30" },
  qualificado:       { bg: "bg-cyan-500/10",    bar: "bg-cyan-500",    text: "text-cyan-500",    border: "border-cyan-500/30" },
  contato_realizado: { bg: "bg-sky-500/10",     bar: "bg-sky-500",     text: "text-sky-500",     border: "border-sky-500/30" },
  proposta_enviada:  { bg: "bg-warning/10",     bar: "bg-warning",     text: "text-warning",     border: "border-warning/30" },
  negociacao:        { bg: "bg-purple-500/10",  bar: "bg-purple-500",  text: "text-purple-500",  border: "border-purple-500/30" },
  followup:          { bg: "bg-orange-500/10",  bar: "bg-orange-500",  text: "text-orange-500",  border: "border-orange-500/30" },
  confirmado:        { bg: "bg-emerald-500/10", bar: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/30" },
  fechado:           { bg: "bg-success/10",     bar: "bg-success",     text: "text-success",     border: "border-success/30" },
  perdido:           { bg: "bg-destructive/10", bar: "bg-destructive", text: "text-destructive", border: "border-destructive/30" },
  arquivado:         { bg: "bg-slate-500/10",   bar: "bg-slate-400",   text: "text-slate-400",   border: "border-slate-500/30" },
};

const ACTIVE_STAGES = ["novo", "qualificado", "contato_realizado", "proposta_enviada", "negociacao", "followup", "confirmado"];

function isOverdue(d?: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}

export default function FunilComercial() {
  const { leads, isLoading } = useLeads();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewModal, setViewModal] = useState<{ open: boolean; lead?: any }>({ open: false });
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; lead?: any }>({ open: false, mode: "create" });

  const stageData = useMemo(() => {
    const active = leads.filter(l => ACTIVE_STAGES.includes(l.status_lead ?? ""));
    const total = active.length;

    return STATUS_LEAD_OPTIONS
      .filter(s => ACTIVE_STAGES.includes(s.value))
      .map(s => {
        const stageLeads = leads.filter(l => l.status_lead === s.value);
        const valor = stageLeads.reduce((sum, l) => {
          const v = (l.orcamento_estimado ?? l.valor_estimado_cache ?? l.valor_estimado) as number | null | undefined;
          return sum + (v ?? 0);
        }, 0);
        return {
          ...s,
          leads: stageLeads,
          count: stageLeads.length,
          valor,
          pct: total > 0 ? Math.round((stageLeads.length / total) * 100) : 0,
        };
      });
  }, [leads]);

  const kpis = useMemo(() => {
    const activeLeads = leads.filter(l => ACTIVE_STAGES.includes(l.status_lead ?? ""));
    const totalValor = activeLeads.reduce((s, l) => {
      const v = (l.orcamento_estimado ?? l.valor_estimado_cache ?? l.valor_estimado) as number | null | undefined;
      return s + (v ?? 0);
    }, 0);
    const fechados = leads.filter(l => l.status_lead === "fechado").length;
    const totalComStatus = leads.filter(l => l.status_lead === "fechado" || l.status_lead === "perdido").length;
    const taxaConversao = totalComStatus > 0 ? Math.round((fechados / totalComStatus) * 100) : 0;
    const followupsAtrasados = leads.filter(l => isOverdue(l.data_proximo_contato as string) && ACTIVE_STAGES.includes(l.status_lead ?? "")).length;

    return {
      total: activeLeads.length,
      totalValor,
      taxaConversao,
      followupsAtrasados,
    };
  }, [leads]);

  const displayedLeads = useMemo(() => {
    const base = selectedStage ? leads.filter(l => l.status_lead === selectedStage) : leads.filter(l => ACTIVE_STAGES.includes(l.status_lead ?? ""));
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(l =>
      l.nome_contratante?.toLowerCase().includes(q) ||
      (l.nome_empresa as string)?.toLowerCase().includes(q) ||
      l.artista_interesse?.toLowerCase().includes(q)
    );
  }, [leads, selectedStage, search]);

  if (isLoading) {
    return (
      <MainLayout title="Funil Comercial" description="Visão do pipeline comercial">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Funil Comercial"
      description="Pipeline de oportunidades e acompanhamento comercial"
    >
      <div className="space-y-6">

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="funil-kpis">
          <Card className="border-t-2 border-t-primary">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads Ativos</p>
                  <p className="text-3xl font-semibold mt-1">{kpis.total}</p>
                </div>
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-success">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor em Pipeline</p>
                  <p className="text-xl font-mono font-semibold text-success mt-1">{formatCurrency(kpis.totalValor)}</p>
                </div>
                <div className="p-2.5 bg-success/10 border border-success/20 rounded-lg">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-primary">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-3xl font-semibold mt-1">{kpis.taxaConversao}%</p>
                </div>
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <Target className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-t-2", kpis.followupsAtrasados > 0 ? "border-t-destructive" : "border-t-muted")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow-ups Atrasados</p>
                  <p className={cn("text-3xl font-semibold mt-1", kpis.followupsAtrasados > 0 ? "text-destructive" : "")}>{kpis.followupsAtrasados}</p>
                </div>
                <div className={cn("p-2.5 rounded-lg border", kpis.followupsAtrasados > 0 ? "bg-destructive/10 border-destructive/20" : "bg-muted border-border")}>
                  <AlertTriangle className={cn("h-4 w-4", kpis.followupsAtrasados > 0 ? "text-destructive" : "text-muted-foreground")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Funil visual ── */}
        <Card data-testid="funil-visual">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Estágios do Funil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stageData.map((stage, idx) => {
              const colors = STAGE_COLORS[stage.value] ?? STAGE_COLORS.novo;
              const isSelected = selectedStage === stage.value;
              const maxCount = Math.max(...stageData.map(s => s.count), 1);
              const barPct = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 4 : 0);

              return (
                <button
                  key={stage.value}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                    isSelected
                      ? cn(colors.bg, colors.border, "ring-1 ring-primary/30")
                      : "bg-card border-border hover:border-primary/30 hover:bg-muted/30",
                  )}
                  onClick={() => setSelectedStage(isSelected ? null : stage.value)}
                  data-testid={`funil-stage-${stage.value}`}
                >
                  <div className="flex items-center gap-2 shrink-0 w-48">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", colors.bar)} />
                    <span className={cn("text-xs font-medium", isSelected ? colors.text : "text-foreground")}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                      style={{ width: `${barPct}%`, opacity: 0.75 }}
                    />
                  </div>
                  <div className="flex items-center gap-4 shrink-0 min-w-[160px] justify-end">
                    <Badge variant="outline" className={cn("font-mono text-[10px]", isSelected ? cn(colors.text, colors.border) : "")}>
                      {stage.count} lead{stage.count !== 1 ? "s" : ""}
                    </Badge>
                    {stage.valor > 0 && (
                      <span className="text-xs font-mono text-muted-foreground">{formatCurrency(stage.valor)}</span>
                    )}
                    {idx < stageData.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Lista de leads do estágio ── */}
        <Card data-testid="funil-leads-list">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold">
                {selectedStage ? `Leads — ${STATUS_LABELS[selectedStage] ?? selectedStage}` : "Todos os Leads Ativos"}
                <span className="ml-2 text-xs font-normal text-muted-foreground">({displayedLeads.length})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedStage && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedStage(null)}>
                    Ver todos
                  </Button>
                )}
                <div className="relative w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-7 text-xs bg-muted/30 border-border"
                    data-testid="funil-search"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 p-0">
            {displayedLeads.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhum lead neste estágio
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {displayedLeads.map(lead => {
                  const stageColor = STAGE_COLORS[lead.status_lead ?? "novo"] ?? STAGE_COLORS.novo;
                  const valor = (lead.orcamento_estimado ?? lead.valor_estimado_cache ?? lead.valor_estimado) as number | null | undefined;
                  const overdue = isOverdue(lead.data_proximo_contato as string);

                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                      data-testid={`funil-lead-${lead.id}`}
                    >
                      <div className={cn("w-1.5 h-8 rounded-full shrink-0", stageColor.bar)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{lead.nome_contratante || "(sem nome)"}</p>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", stageColor.text, stageColor.border)}>
                            {STATUS_LABELS[lead.status_lead ?? ""] ?? lead.status_lead}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                          {lead.nome_empresa && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />{lead.nome_empresa as string}
                            </span>
                          )}
                          {lead.artista_interesse && (
                            <span className="truncate">{lead.artista_interesse}</span>
                          )}
                          {lead.data_proximo_contato && (
                            <span className={cn("flex items-center gap-1", overdue ? "text-destructive font-medium" : "")}>
                              {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {new Date(lead.data_proximo_contato as string).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {lead.data_evento && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.data_evento as string).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      {valor != null && valor > 0 && (
                        <span className="text-sm font-mono font-semibold text-success shrink-0">{formatCurrency(valor)}</span>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => setViewModal({ open: true, lead })}
                          data-testid={`funil-view-${lead.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => setFormModal({ open: true, mode: "edit", lead })}
                          data-testid={`funil-edit-${lead.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LeadViewModal
        open={viewModal.open}
        onOpenChange={open => setViewModal({ ...viewModal, open })}
        lead={viewModal.lead}
        onEdit={lead => setFormModal({ open: true, mode: "edit", lead })}
      />
      <LeadFormModal
        open={formModal.open}
        onOpenChange={open => setFormModal({ ...formModal, open })}
        mode={formModal.mode}
        lead={formModal.lead}
      />
    </MainLayout>
  );
}
