import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Activity,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useAudit } from "@/shared/hooks/useAudit";
import { AUDIT_MODULES, type AuditIssue, type AuditModuleId, type AuditSeverity } from "@/shared/lib/audit/types";
import { AuditLogPanel } from "@/modules/reports/components/AuditLogPanel";
import { MOCK_AUDIT_LOG } from "@/modules/reports/services/mock-data";
import { cn } from "@/shared/lib/utils";

type ModuleFilter = "all" | AuditModuleId;
type SeverityFilter = "all" | AuditSeverity;
type TabId = "dados" | "operacoes" | "logs";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dados",      label: "Dados",               icon: ShieldAlert },
  { id: "operacoes",  label: "Auditoria de Operações", icon: ClipboardList },
  { id: "logs",       label: "Logs do Sistema",     icon: Activity },
];

const SYSTEM_LOGS = [
  { ts: "2026-05-08T09:15:43Z", level: "INFO",  msg: "[import] imp-001: 142 registros importados em Catálogo (CSV)", module: "reports" },
  { ts: "2026-05-08T10:00:08Z", level: "INFO",  msg: "[export] exp-001: Catálogo exportado em XLSX (142 registros)", module: "reports" },
  { ts: "2026-05-07T14:22:18Z", level: "ERROR", msg: "[import] imp-002: 7 erros na importação de Artistas — campos inválidos", module: "reports" },
  { ts: "2026-05-07T16:45:22Z", level: "INFO",  msg: "[export] exp-002: Relatório financeiro exportado em PDF", module: "reports" },
  { ts: "2026-05-07T11:30:00Z", level: "WARN",  msg: "[contract] CT-0045: cláusula 3 atualizada por Admin", module: "contratos" },
  { ts: "2026-05-06T11:00:29Z", level: "INFO",  msg: "[import] imp-003: 22 contratos importados via CSV", module: "reports" },
  { ts: "2026-05-06T10:15:00Z", level: "WARN",  msg: "[catalog] 3 obras removidas do catálogo por Admin", module: "catalog" },
  { ts: "2026-05-01T08:31:02Z", level: "INFO",  msg: "[import] imp-004: 318 transações OFX importadas em Financeiro", module: "reports" },
];

const LEVEL_COLORS: Record<string, string> = {
  INFO:  "text-success",
  WARN:  "text-warning",
  ERROR: "text-destructive",
};

function LogsTab() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden font-mono text-xs">
      <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground font-medium">System Logs — {SYSTEM_LOGS.length} entradas</span>
      </div>
      <div className="divide-y divide-border/30">
        {SYSTEM_LOGS.map((l, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors" data-testid={`log-row-${i}`}>
            <span className="text-muted-foreground whitespace-nowrap shrink-0">{new Date(l.ts).toLocaleString("pt-BR")}</span>
            <span className={cn("font-bold w-12 shrink-0", LEVEL_COLORS[l.level] ?? "text-muted-foreground")}>{l.level}</span>
            <span className="text-foreground break-all">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DadosTab() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useAudit();

  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [openModules, setOpenModules] = useState<AuditModuleId[]>([]);

  const issues = data?.issues ?? [];
  const summary = data?.summary;

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return issues.filter((issue) => {
      if (moduleFilter !== "all" && issue.module !== moduleFilter) return false;
      if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
      if (term && !issue.entity_label.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [issues, moduleFilter, severityFilter, search]);

  const issuesByModule = useMemo(() => {
    const map = new Map<AuditModuleId, AuditIssue[]>();
    for (const issue of filteredIssues) {
      const arr = map.get(issue.module) ?? [];
      arr.push(issue);
      map.set(issue.module, arr);
    }
    return map;
  }, [filteredIssues]);

  const toggleModule = (moduleId: AuditModuleId) => {
    setOpenModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId],
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground" data-testid="text-audit-error">
            Não foi possível executar a auditoria. Tente novamente.
          </p>
          <Button onClick={() => refetch()} data-testid="button-retry-audit">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-summary-total">
          <CardHeader className="pb-2">
            <CardDescription>Total de problemas</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-summary-total">
              {summary?.total_issues ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Atualizado em {data?.generated_at ? new Date(data.generated_at).toLocaleString("pt-BR") : "-"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-obrigatorio">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Obrigatórios
            </CardDescription>
            <CardTitle className="text-3xl text-destructive" data-testid="text-summary-obrigatorio">
              {summary?.obrigatorio ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Campos essenciais que precisam ser preenchidos.
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-recomendado">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Recomendados
            </CardDescription>
            <CardTitle className="text-3xl text-warning" data-testid="text-summary-recomendado">
              {summary?.recomendado ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Campos opcionais que melhoram relatórios e integrações.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do registro"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-audit"
              />
            </div>
            <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as ModuleFilter)}>
              <SelectTrigger data-testid="select-module-filter">
                <SelectValue placeholder="Todos os módulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {AUDIT_MODULES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
              <SelectTrigger data-testid="select-severity-filter">
                <SelectValue placeholder="Todas as severidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                <SelectItem value="obrigatorio">Obrigatórios</SelectItem>
                <SelectItem value="recomendado">Recomendados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista por módulo */}
      {filteredIssues.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto text-success" />
            <p className="font-medium" data-testid="text-no-issues">
              Nenhum problema encontrado com os filtros atuais.
            </p>
            <p className="text-sm text-muted-foreground">
              Tudo certo por aqui — ou ajuste os filtros para investigar mais.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {AUDIT_MODULES.map((m) => {
            const list = issuesByModule.get(m.id);
            if (!list || list.length === 0) return null;
            const isOpen = openModules.includes(m.id);
            const obrigatorios = list.filter((i) => i.severity === "obrigatorio").length;
            const recomendados = list.filter((i) => i.severity === "recomendado").length;

            return (
              <Card key={m.id} data-testid={`card-module-${m.id}`}>
                <Collapsible open={isOpen} onOpenChange={() => toggleModule(m.id)}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-4 hover-elevate text-left"
                      data-testid={`button-toggle-module-${m.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div>
                          <p className="font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {list.length} problema(s) · {obrigatorios} obrigatório(s), {recomendados} recomendado(s)
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" data-testid={`badge-issues-${m.id}`}>
                        {list.length}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t divide-y">
                      {list.map((issue) => (
                        <div
                          key={issue.id}
                          className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                          data-testid={`row-issue-${issue.id}`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {issue.entity_type}
                              </span>
                              <Badge
                                variant={issue.severity === "obrigatorio" ? "destructive" : "secondary"}
                                className={
                                  issue.severity === "recomendado"
                                    ? "bg-warning/10 text-warning hover:bg-warning/10"
                                    : ""
                                }
                                data-testid={`badge-severity-${issue.id}`}
                              >
                                {issue.severity === "obrigatorio" ? "Obrigatório" : "Recomendado"}
                              </Badge>
                            </div>
                            <p className="font-medium" data-testid={`text-entity-${issue.id}`}>
                              {issue.entity_label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Faltando:{" "}
                              <span className="text-foreground" data-testid={`text-missing-${issue.id}`}>
                                {issue.missing_fields.join(", ")}
                              </span>
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(issue.fix_path)}
                            data-testid={`button-fix-${issue.id}`}
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Corrigir
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Auditoria() {
  const { isFetching, refetch } = useAudit();
  const [tab, setTab] = useState<TabId>("dados");

  const headerActions = (
    <Button
      onClick={() => refetch()}
      disabled={isFetching}
      variant="outline"
      data-testid="button-refresh-audit"
    >
      {isFetching ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Atualizar auditoria
    </Button>
  );

  return (
    <MainLayout
      title="Auditoria"
      description="Encontre dados faltantes, inconsistências e registros de operações"
      actions={headerActions}
    >
      <div className="space-y-6 pt-[10px] pb-[10px]">
        {/* Tabs */}
        <div className="flex gap-1 flex-wrap border-b border-border pb-0">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
                data-testid={`tab-audit-${t.id}`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "dados"     && <DadosTab />}
        {tab === "operacoes" && <AuditLogPanel entries={MOCK_AUDIT_LOG} />}
        {tab === "logs"      && <LogsTab />}
      </div>
    </MainLayout>
  );
}
