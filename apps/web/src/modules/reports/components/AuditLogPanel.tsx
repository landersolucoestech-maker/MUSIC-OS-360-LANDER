import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Upload, Download, FilePen, Trash2, LogIn, ShieldCheck, Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { AuditLogEntry } from "../types";

const ACTION_CONFIG: Record<AuditLogEntry["action"], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  import:     { label: "Importação", icon: Upload,      color: "text-primary" },
  export:     { label: "Exportação", icon: Download,    color: "text-success" },
  create:     { label: "Criação",    icon: FilePen,     color: "text-success" },
  update:     { label: "Edição",     icon: FilePen,     color: "text-warning" },
  delete:     { label: "Exclusão",   icon: Trash2,      color: "text-destructive" },
  login:      { label: "Login",      icon: LogIn,       color: "text-muted-foreground" },
  permission: { label: "Permissão",  icon: ShieldCheck, color: "text-warning" },
};

const STATUS_CONFIG: Record<AuditLogEntry["status"], { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  success: { label: "Sucesso",  icon: CheckCircle2,   cls: "bg-success/15 text-success border-success/30" },
  error:   { label: "Erro",     icon: XCircle,        cls: "bg-destructive/15 text-destructive border-destructive/30" },
  warning: { label: "Aviso",    icon: AlertTriangle,  cls: "bg-warning/15 text-warning border-warning/30" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

const MODULE_OPTIONS = ["Todos", "Catálogo", "Artistas", "Contratos", "Financeiro", "Lançamentos", "Leads", "Marketing"];
const ACTION_OPTIONS = [
  { value: "all", label: "Todas as ações" },
  ...Object.entries(ACTION_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

interface AuditLogPanelProps {
  entries: AuditLogEntry[];
}

export function AuditLogPanel({ entries }: AuditLogPanelProps) {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("Todos");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = entries.filter(e => {
    if (moduleFilter !== "Todos" && e.module !== moduleFilter) return false;
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ação, módulo, usuário..."
            className="pl-9 h-9 bg-card border-border"
            data-testid="audit-search"
          />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-36 h-9 text-xs bg-card border-border" data-testid="audit-filter-module">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODULE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36 h-9 text-xs bg-card border-border" data-testid="audit-filter-action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9 text-xs bg-card border-border" data-testid="audit-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Data / Hora</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Ação</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Módulo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Usuário</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Registros</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro encontrado</TableCell>
              </TableRow>
            ) : filtered.map(e => {
              const ac = ACTION_CONFIG[e.action];
              const sc = STATUS_CONFIG[e.status];
              const ActionIcon = ac.icon;
              const StatusIcon = sc.icon;
              return (
                <TableRow key={e.id} data-testid={`audit-row-${e.id}`}>
                  <TableCell className="text-xs py-3 font-mono text-muted-foreground whitespace-nowrap">{formatDate(e.createdAt)}</TableCell>
                  <TableCell className="text-xs py-3">
                    <span className={cn("flex items-center gap-1.5 font-medium", ac.color)}>
                      <ActionIcon className="h-3.5 w-3.5 shrink-0" />
                      {ac.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge variant="outline" className="text-[10px]">{e.module}</Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3 max-w-[260px] truncate text-foreground">{e.description}</TableCell>
                  <TableCell className="text-xs py-3 text-muted-foreground whitespace-nowrap">{e.user}</TableCell>
                  <TableCell className="text-xs py-3 font-mono text-center">
                    {e.recordCount != null ? e.recordCount : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs py-3">
                    <Badge className={cn("text-[10px] border flex items-center gap-1 w-fit", sc.cls)}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {sc.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
            {filtered.length} de {entries.length} registros
          </div>
        )}
      </div>
    </div>
  );
}
