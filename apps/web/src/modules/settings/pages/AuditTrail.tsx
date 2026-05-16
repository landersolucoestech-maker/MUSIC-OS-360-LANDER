/**
 * settings/pages/AuditTrail.tsx
 *
 * Audit Trail — historial de todas as mutações auditadas no sistema.
 * Acesso restrito a OWNER/ADMIN.
 *
 * Funcionalidades:
 *  - Tabela paginada com: timestamp, actor, role, ação, entidade, ID
 *  - Filtros: entity_type, date_from, date_to, user_id, action
 *  - Expansão de linha para ver diff visual before/after
 *  - Indicadores de ação (create/update/delete) com badges semânticos
 */

import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import {
  ShieldCheck, Search, ChevronDown, ChevronRight,
  User, Clock, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Mock data ─────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  http_method: string | null;
  http_path: string | null;
  ip_address: string | null;
  correlation_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
}

const MOCK_AUDIT_TRAIL: AuditLogEntry[] = [
  {
    id: "a001",
    created_at: "2026-05-16T10:23:45Z",
    user_id: "user_admin_01",
    actor_role: "owner",
    action: "contract.created",
    entity: "contract",
    entity_id: "ct-0045",
    http_method: "POST",
    http_path: "/api/v1/contracts",
    ip_address: "192.168.1.100",
    correlation_id: "corr-abc-001",
    before: null,
    after: { id: "ct-0045", titulo: "Contrato Gravação 2026", status: "rascunho" },
    diff: null,
  },
  {
    id: "a002",
    created_at: "2026-05-16T09:11:22Z",
    user_id: "user_manager_02",
    actor_role: "admin",
    action: "artist.updated",
    entity: "artist",
    entity_id: "art-0012",
    http_method: "PATCH",
    http_path: "/api/v1/artists/art-0012",
    ip_address: "192.168.1.101",
    correlation_id: "corr-abc-002",
    before: { nome_artistico: "Silva MC", genero_musical: "Funk" },
    after:  { nome_artistico: "Silva MC Jr.", genero_musical: "Trap" },
    diff: {
      nome_artistico: { from: "Silva MC", to: "Silva MC Jr." },
      genero_musical:  { from: "Funk",     to: "Trap" },
    },
  },
  {
    id: "a003",
    created_at: "2026-05-15T16:44:10Z",
    user_id: "user_admin_01",
    actor_role: "owner",
    action: "integration.connected",
    entity: "integration",
    entity_id: null,
    http_method: "POST",
    http_path: "/api/v1/integrations/spotify/callback",
    ip_address: "192.168.1.100",
    correlation_id: "corr-def-003",
    before: null,
    after: { platform: "spotify", status: "connected" },
    diff: null,
  },
  {
    id: "a004",
    created_at: "2026-05-15T14:30:05Z",
    user_id: "user_manager_02",
    actor_role: "admin",
    action: "release.updated",
    entity: "release",
    entity_id: "rel-0007",
    http_method: "PATCH",
    http_path: "/api/v1/releases/rel-0007",
    ip_address: "192.168.1.101",
    correlation_id: "corr-ghi-004",
    before: { status: "rascunho",  distribuidora: null },
    after:  { status: "aprovado",  distribuidora: "Believe" },
    diff: {
      status:        { from: "rascunho", to: "aprovado" },
      distribuidora: { from: null,       to: "Believe" },
    },
  },
  {
    id: "a005",
    created_at: "2026-05-14T11:05:33Z",
    user_id: "user_editor_03",
    actor_role: "editor",
    action: "upload.confirmed",
    entity: "upload",
    entity_id: "upl-0003",
    http_method: "POST",
    http_path: "/api/v1/uploads/upl-0003/confirm",
    ip_address: "192.168.1.102",
    correlation_id: "corr-jkl-005",
    before: { status: "pending" },
    after:  { status: "confirmed" },
    diff: { status: { from: "pending", to: "confirmed" } },
  },
  {
    id: "a006",
    created_at: "2026-05-14T09:20:00Z",
    user_id: "user_admin_01",
    actor_role: "owner",
    action: "billing.checkout_started",
    entity: "billing",
    entity_id: null,
    http_method: "POST",
    http_path: "/api/v1/billing/checkout",
    ip_address: "192.168.1.100",
    correlation_id: "corr-mno-006",
    before: null,
    after: { plan: "pro", status: "session_created" },
    diff: null,
  },
  {
    id: "a007",
    created_at: "2026-05-13T15:45:18Z",
    user_id: "user_manager_02",
    actor_role: "admin",
    action: "contract.cancelled",
    entity: "contract",
    entity_id: "ct-0032",
    http_method: "DELETE",
    http_path: "/api/v1/contracts/ct-0032",
    ip_address: "192.168.1.101",
    correlation_id: "corr-pqr-007",
    before: { status: "vigente", titulo: "Contrato Antigo" },
    after:  { status: "cancelado" },
    diff: { status: { from: "vigente", to: "cancelado" } },
  },
];

// ── Action badge helpers ───────────────────────────────────────────────────────

function getActionBadge(action: string) {
  if (action.endsWith(".created")  || action.endsWith(".connected")  || action.endsWith(".confirmed") || action.endsWith(".checkout_started")) {
    return <Badge className="bg-success/10 text-success border-success/20 text-xs">{action}</Badge>;
  }
  if (action.endsWith(".updated")) {
    return <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{action}</Badge>;
  }
  if (action.endsWith(".deleted") || action.endsWith(".cancelled") || action.endsWith(".disconnected")) {
    return <Badge variant="destructive" className="text-xs">{action}</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">{action}</Badge>;
}

function getRoleBadge(role: string | null) {
  if (!role) return null;
  const colors: Record<string, string> = {
    owner:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
    admin:  "bg-orange-500/10 text-orange-400 border-orange-500/20",
    editor: "bg-blue-500/10   text-blue-400   border-blue-500/20",
    viewer: "bg-muted         text-muted-foreground border-border",
  };
  return (
    <Badge className={`text-[10px] border ${colors[role] ?? colors.viewer}`}>
      {role}
    </Badge>
  );
}

// ── Diff viewer ───────────────────────────────────────────────────────────────

function DiffViewer({ diff, before, after }: {
  diff:   Record<string, { from: unknown; to: unknown }> | null;
  before: Record<string, unknown> | null;
  after:  Record<string, unknown> | null;
}) {
  if (!diff && !before && !after) {
    return <p className="text-xs text-muted-foreground italic">Sem dados de snapshot disponíveis.</p>;
  }

  if (diff && Object.keys(diff).length > 0) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground mb-2">CAMPOS MODIFICADOS</p>
        {Object.entries(diff).map(([field, change]) => (
          <div key={field} className="grid grid-cols-[140px_1fr_1fr] gap-2 text-xs">
            <span className="font-mono text-muted-foreground truncate">{field}</span>
            <span className="font-mono bg-destructive/10 text-destructive px-1 rounded truncate">
              {change.from === null || change.from === undefined ? <em>null</em> : String(change.from)}
            </span>
            <span className="font-mono bg-success/10 text-success px-1 rounded truncate">
              {change.to === null || change.to === undefined ? <em>null</em> : String(change.to)}
            </span>
          </div>
        ))}
        <div className="grid grid-cols-[140px_1fr_1fr] gap-2 mt-1 pt-1 border-t border-border">
          <span className="text-[10px] text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-semibold">ANTES</span>
          <span className="text-[10px] text-muted-foreground font-semibold">DEPOIS</span>
        </div>
      </div>
    );
  }

  // Fallback: show full before/after
  return (
    <div className="grid grid-cols-2 gap-4">
      {before && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">ANTES</p>
          <pre className="text-xs bg-muted/40 rounded p-2 overflow-auto max-h-32 font-mono">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
      )}
      {after && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">DEPOIS</p>
          <pre className="text-xs bg-success/5 rounded p-2 overflow-auto max-h-32 font-mono">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuditTrail() {
  const [search,       setSearch]       = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  const entities = useMemo(() => {
    const set = new Set(MOCK_AUDIT_TRAIL.map(e => e.entity));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const actionGroups = ["all", "created", "updated", "deleted", "connected", "disconnected", "other"];

  const filtered = useMemo(() => {
    return MOCK_AUDIT_TRAIL.filter(entry => {
      const matchSearch =
        !search ||
        entry.action.toLowerCase().includes(search.toLowerCase()) ||
        (entry.user_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (entry.entity_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (entry.correlation_id ?? "").toLowerCase().includes(search.toLowerCase());

      const matchEntity = entityFilter === "all" || entry.entity === entityFilter;

      const matchAction =
        actionFilter === "all" ||
        (actionFilter === "other"
          ? !["created", "updated", "deleted", "connected", "disconnected"].some(s => entry.action.endsWith(`.${s}`))
          : entry.action.endsWith(`.${actionFilter}`));

      return matchSearch && matchEntity && matchAction;
    });
  }, [search, entityFilter, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Audit Trail</h1>
              <p className="text-sm text-muted-foreground">
                Histórico imutável de todas as operações críticas — restrito a Owner/Admin
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total de eventos",    value: MOCK_AUDIT_TRAIL.length, sub: "audit logs" },
            { label: "Criações",            value: MOCK_AUDIT_TRAIL.filter(e => e.action.endsWith(".created")).length,   sub: "endpoints" },
            { label: "Actualizações",       value: MOCK_AUDIT_TRAIL.filter(e => e.action.endsWith(".updated")).length,   sub: "modificações" },
            { label: "Eliminações/Cancel.", value: MOCK_AUDIT_TRAIL.filter(e => e.action.endsWith(".deleted") || e.action.endsWith(".cancelled")).length, sub: "operações destrutivas" },
          ].map(stat => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="relative col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-audit-search"
                  placeholder="Pesquisar por acção, actor, ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger data-testid="select-audit-entity">
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(e => (
                    <SelectItem key={e} value={e}>
                      {e === "all" ? "Todas as entidades" : e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger data-testid="select-audit-action">
                  <SelectValue placeholder="Tipo de acção" />
                </SelectTrigger>
                <SelectContent>
                  {actionGroups.map(a => (
                    <SelectItem key={a} value={a}>
                      {a === "all" ? "Todas as acções" : a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit log table */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Eventos ({filtered.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Clique numa linha para expandir o diff before/after
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="w-[20px]" />
                    <TableHead className="text-xs w-[160px]">Timestamp</TableHead>
                    <TableHead className="text-xs w-[140px]">Actor</TableHead>
                    <TableHead className="text-xs w-[80px]">Role</TableHead>
                    <TableHead className="text-xs">Acção</TableHead>
                    <TableHead className="text-xs w-[100px]">Entidade</TableHead>
                    <TableHead className="text-xs w-[120px]">ID</TableHead>
                    <TableHead className="text-xs w-[70px]">Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                        Nenhum evento encontrado com os filtros actuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(entry => (
                      <>
                        <TableRow
                          key={entry.id}
                          data-testid={`row-audit-${entry.id}`}
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleExpand(entry.id)}
                        >
                          <TableCell className="py-2 pl-3 pr-0">
                            {expandedId === entry.id
                              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            }
                          </TableCell>
                          <TableCell className="py-2 text-xs font-mono text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              {format(new Date(entry.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="font-mono truncate max-w-[110px]" title={entry.user_id ?? undefined}>
                                {entry.user_id ?? <em className="text-muted-foreground">system</em>}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            {getRoleBadge(entry.actor_role)}
                          </TableCell>
                          <TableCell className="py-2">
                            {getActionBadge(entry.action)}
                          </TableCell>
                          <TableCell className="py-2 text-xs font-medium capitalize">
                            {entry.entity}
                          </TableCell>
                          <TableCell className="py-2 text-xs font-mono text-muted-foreground truncate max-w-[110px]">
                            {entry.entity_id ?? <em>—</em>}
                          </TableCell>
                          <TableCell className="py-2">
                            {entry.http_method && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  entry.http_method === "DELETE" ? "text-destructive border-destructive/30" :
                                  entry.http_method === "POST"   ? "text-success border-success/30" :
                                  entry.http_method === "PATCH"  ? "text-primary border-primary/30" : ""
                                }`}
                              >
                                {entry.http_method}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded diff panel */}
                        {expandedId === entry.id && (
                          <TableRow key={`${entry.id}-diff`} className="bg-muted/10 hover:bg-muted/10">
                            <TableCell colSpan={8} className="py-3 px-6">
                              <div className="space-y-3">
                                {/* Metadata row */}
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  {entry.ip_address && (
                                    <span>IP: <code className="font-mono">{entry.ip_address}</code></span>
                                  )}
                                  {entry.http_path && (
                                    <span>Path: <code className="font-mono">{entry.http_path}</code></span>
                                  )}
                                  {entry.correlation_id && (
                                    <span>Correlation: <code className="font-mono">{entry.correlation_id}</code></span>
                                  )}
                                </div>

                                {/* Diff */}
                                <DiffViewer
                                  diff={entry.diff}
                                  before={entry.before}
                                  after={entry.after}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Audit trail append-only — nenhum registo pode ser modificado ou eliminado após criação.
        </p>
      </div>
    </MainLayout>
  );
}
