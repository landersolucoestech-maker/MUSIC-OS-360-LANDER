import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Play,
  XCircle,
  Filter,
  RefreshCw,
  ListChecks,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { useCrmTasks, type CrmTask } from "../hooks/useCrmTasks";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  urgent: { label: "Urgente",  icon: Flame,    className: "text-destructive border-destructive/30 bg-destructive/10" },
  high:   { label: "Alta",     icon: ArrowUp,  className: "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/30" },
  medium: { label: "Média",    icon: Minus,    className: "text-warning border-warning/30 bg-warning/10" },
  low:    { label: "Baixa",    icon: ArrowDown, className: "text-muted-foreground border-border bg-muted/50" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pendente",    className: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em andamento", className: "bg-primary/10 text-primary" },
  done:        { label: "Concluída",   className: "bg-success/10 text-success" },
  cancelled:   { label: "Cancelada",  className: "bg-muted/50 text-muted-foreground line-through" },
};

function workflowLabel(type?: string | null): string {
  if (!type) return "Geral";
  if (type.startsWith("artist.onboarding")) return "Onboarding";
  if (type.startsWith("contract.execution")) return "Contrato";
  if (type.startsWith("contract.renewal")) return "Renovação";
  if (type.startsWith("transaction.reconciliation")) return "Financeiro";
  if (type.startsWith("invoice.overdue")) return "Cobrança";
  if (type.startsWith("crm.")) return "CRM";
  return "Operacional";
}

function slaStatus(due: string | null | undefined): "ok" | "warning" | "overdue" | null {
  if (!due) return null;
  try {
    const d = parseISO(due);
    const diff = differenceInDays(d, new Date());
    if (isPast(d)) return "overdue";
    if (diff <= 2) return "warning";
    return "ok";
  } catch { return null; }
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onStatusChange }: { task: CrmTask; onStatusChange: (id: string, status: CrmTask["status"]) => void }) {
  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const s = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const sla = slaStatus(task.due_date);
  const PriorityIcon = p.icon;
  const isDone = task.status === "done";
  const isCancelled = task.status === "cancelled";

  return (
    <div className={cn(
      "group relative flex gap-3 rounded-lg border p-4 transition-all hover:shadow-sm",
      isDone ? "opacity-60 bg-muted/20" : "bg-card",
      sla === "overdue" && !isDone && "border-destructive/40 bg-destructive/5",
      sla === "warning" && !isDone && "border-warning/40 bg-warning/5",
    )}>
      {/* Priority stripe */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", {
        "bg-destructive":   task.priority === "urgent",
        "bg-orange-500":    task.priority === "high",
        "bg-warning":       task.priority === "medium",
        "bg-border":        task.priority === "low",
      })} />

      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium leading-snug", isDone && "line-through text-muted-foreground")}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
            )}
          </div>

          {!isDone && !isCancelled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {task.status === "pending" && (
                  <DropdownMenuItem onClick={() => onStatusChange(task.id, "in_progress")}>
                    <Play className="h-3.5 w-3.5 mr-2 text-primary" /> Iniciar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onStatusChange(task.id, "done")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-success" /> Concluir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(task.id, "cancelled")} className="text-destructive focus:text-destructive">
                  <XCircle className="h-3.5 w-3.5 mr-2" /> Cancelar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium gap-1", p.className)}>
            <PriorityIcon className="h-2.5 w-2.5" />
            {p.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/20">
            {workflowLabel(task.type)}
          </Badge>
          <span className={cn("text-xs px-1.5 py-0 rounded-sm", s.className)}>
            {s.label}
          </span>

          {task.due_date && (
            <span className={cn("ml-auto flex items-center gap-1 text-xs font-mono",
              sla === "overdue" ? "text-destructive font-semibold" :
              sla === "warning" ? "text-warning font-semibold" :
              "text-muted-foreground",
            )}>
              {sla === "overdue" && <AlertTriangle className="h-3 w-3" />}
              {sla === "warning" && <Clock className="h-3 w-3" />}
              {(() => {
                try { return format(parseISO(task.due_date), "dd/MM", { locale: ptBR }); } catch { return "—"; }
              })()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ tasks }: { tasks: CrmTask[] }) {
  const pending   = tasks.filter((t) => t.status === "pending").length;
  const progress  = tasks.filter((t) => t.status === "in_progress").length;
  const done      = tasks.filter((t) => t.status === "done").length;
  const overdue   = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled" && slaStatus(t.due_date) === "overdue").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Pendentes",    value: pending,  className: "border-muted" },
        { label: "Em andamento", value: progress, className: "border-primary/30" },
        { label: "Concluídas",   value: done,     className: "border-success/30" },
        { label: "Atrasadas",    value: overdue,  className: overdue > 0 ? "border-destructive/40 bg-destructive/5" : "border-muted" },
      ].map((s) => (
        <Card key={s.label} className={cn("border", s.className)}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-mono font-semibold mt-1">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Task Center Page ─────────────────────────────────────────────────────────

const PRIORITY_GROUPS = ["urgent", "high", "medium", "low"] as const;

export default function TaskCenter() {
  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"priority" | "workflow">("priority");

  const { tasks, isLoading, updateTask, refetch: _refetch } = useCrmTasks();

  const filtered = useMemo(() => {
    let list = tasks;
    if (statusFilter === "active")    list = list.filter((t) => t.status !== "done" && t.status !== "cancelled");
    else if (statusFilter !== "all")  list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all")     list = list.filter((t) => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
  }, [tasks, statusFilter, priorityFilter, search]);

  const grouped = useMemo(() => {
    if (groupBy === "priority") {
      return PRIORITY_GROUPS.map((p) => ({
        key: p,
        label: PRIORITY_CONFIG[p]?.label ?? p,
        tasks: filtered.filter((t) => t.priority === p),
      })).filter((g) => g.tasks.length > 0);
    }
    const workflowMap = new Map<string, CrmTask[]>();
    for (const t of filtered) {
      const wl = workflowLabel(t.type);
      const arr = workflowMap.get(wl) ?? [];
      arr.push(t);
      workflowMap.set(wl, arr);
    }
    return Array.from(workflowMap.entries()).map(([key, tasks]) => ({ key, label: key, tasks }));
  }, [filtered, groupBy]);

  const handleStatusChange = (id: string, status: CrmTask["status"]) => {
    updateTask({ id, status });
  };

  if (isLoading) {
    return (
      <MainLayout title="Central de Tarefas">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Central de Tarefas"
      description="Todas as tarefas operacionais — onboarding, financeiro, jurídico, distribuição"
      actions={
        <Button variant="outline" size="sm" onClick={() => void _refetch()} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        <StatsBar tasks={tasks} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="done">Concluídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant={groupBy === "priority" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setGroupBy("priority")}
            >
              Por prioridade
            </Button>
            <Button
              variant={groupBy === "workflow" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setGroupBy("workflow")}
            >
              Por workflow
            </Button>
          </div>
        </div>

        {/* Task groups */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-muted/60 border border-border p-4 mb-4">
                <ListChecks className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Tente outros termos de busca" : "Todas as tarefas foram concluídas!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                  <Badge variant="secondary" className="font-mono text-xs">{group.tasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
