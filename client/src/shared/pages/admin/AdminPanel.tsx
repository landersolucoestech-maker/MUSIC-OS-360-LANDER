/**
 * Admin Panel — painel super-admin usando os endpoints GET /admin/* do backend.
 *
 * Acessível apenas para usuários com role=super_admin.
 * Em modo mock (VITE_USE_MOCK=true) usa dados estáticos para demonstração.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { BarChart3, Building2, ScrollText, Users, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

// VITE_USE_MOCK is the canonical flag; VITE_MOCK_MODE kept for back-compat.
const MOCK_MODE =
  import.meta.env.VITE_USE_MOCK !== "false" &&
  import.meta.env.VITE_MOCK_MODE !== "false";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminMetrics {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalArtists: number;
  totalContracts: number;
  totalRevenue?: number;
}

interface Organization {
  id: string;
  nome: string;
  status: string;
  plan?: string;
  createdAt?: string;
}

interface AuditLogEntry {
  id: string;
  entity: string;
  entity_id: string;
  action: string;
  user_id: string;
  org_id: string;
  timestamp?: string;
  created_at?: string;
}

// ─── Mock data (development) ──────────────────────────────────────────────────

const MOCK_METRICS: AdminMetrics = {
  totalOrgs: 12, activeOrgs: 10, totalUsers: 87,
  totalArtists: 234, totalContracts: 156, totalRevenue: 48900,
};
const MOCK_ORGS: Organization[] = [
  { id: "1", nome: "Universal Music Brasil", status: "active", plan: "enterprise" },
  { id: "2", nome: "Sony Music Entertainment", status: "active", plan: "pro" },
  { id: "3", nome: "Warner Music Brasil", status: "active", plan: "pro" },
  { id: "4", nome: "Independente Records", status: "inactive", plan: "starter" },
];
const MOCK_AUDIT: AuditLogEntry[] = [
  { id: "1", entity: "Artist", entity_id: "art-1", action: "create", user_id: "u1", org_id: "org-1", created_at: new Date().toISOString() },
  { id: "2", entity: "Contract", entity_id: "c-1", action: "update", user_id: "u2", org_id: "org-2", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "3", entity: "Transaction", entity_id: "t-1", action: "create", user_id: "u1", org_id: "org-1", created_at: new Date(Date.now() - 7200000).toISOString() },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAdminMetrics() {
  return useQuery<AdminMetrics>({
    queryKey: ["admin", "metrics"],
    queryFn: MOCK_MODE
      ? async () => MOCK_METRICS
      : () => api.get<AdminMetrics>("/admin/metrics"),
    staleTime: 60_000,
  });
}

function useAdminOrgs() {
  return useQuery<Organization[]>({
    queryKey: ["admin", "organizations"],
    queryFn: MOCK_MODE
      ? async () => MOCK_ORGS
      : () => api.get<Organization[]>("/admin/organizations"),
    staleTime: 60_000,
  });
}

function useAdminAudit() {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["admin", "audit-log"],
    queryFn: MOCK_MODE
      ? async () => MOCK_AUDIT
      : () => api.get<AuditLogEntry[]>("/admin/audit-log?limit=50"),
    staleTime: 30_000,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color = "text-primary" }: {
  label: string; value: number | string; icon: typeof BarChart3; color?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-center gap-4" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "default" : "secondary";
  return <Badge variant={variant}>{status === "active" ? "Ativo" : "Inativo"}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const metrics = useAdminMetrics();
  const orgs    = useAdminOrgs();
  const audit   = useAdminAudit();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel Super-Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão global de todas as organizações e atividades do sistema.
          </p>
        </div>
        {MOCK_MODE && (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="w-3 h-3" /> Modo demonstração
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="admin-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="organizations" data-testid="tab-organizations">Organizações</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          {metrics.isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          ) : metrics.data ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard label="Total de Organizações" value={metrics.data.totalOrgs} icon={Building2} />
              <MetricCard label="Organizações Ativas"   value={metrics.data.activeOrgs} icon={TrendingUp} color="text-success" />
              <MetricCard label="Usuários"              value={metrics.data.totalUsers} icon={Users} />
              <MetricCard label="Artistas"              value={metrics.data.totalArtists} icon={BarChart3} />
              <MetricCard label="Contratos"             value={metrics.data.totalContracts} icon={ScrollText} />
              {metrics.data.totalRevenue !== undefined && (
                <MetricCard
                  label="Receita Total"
                  value={`R$ ${(metrics.data.totalRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  icon={TrendingUp}
                  color="text-emerald-500"
                />
              )}
            </div>
          ) : null}
        </TabsContent>

        {/* Organizations */}
        <TabsContent value="organizations">
          {orgs.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Organização</th>
                    <th className="text-left px-4 py-3 font-medium">Plano</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(orgs.data ?? []).map((org) => (
                    <tr key={org.id} className="hover:bg-muted/30" data-testid={`row-org-${org.id}`}>
                      <td className="px-4 py-3 font-medium">{org.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{org.plan ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={org.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" data-testid={`button-view-org-${org.id}`}>
                          Ver detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          {audit.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Entidade</th>
                    <th className="text-left px-4 py-3 font-medium">Ação</th>
                    <th className="text-left px-4 py-3 font-medium">Usuário</th>
                    <th className="text-left px-4 py-3 font-medium">Org</th>
                    <th className="text-left px-4 py-3 font-medium">Quando</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(audit.data ?? []).map((entry) => {
                    const ts = entry.timestamp ?? entry.created_at;
                    return (
                      <tr key={entry.id} className="hover:bg-muted/30" data-testid={`row-audit-${entry.id}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium">{entry.entity}</span>
                          <span className="text-muted-foreground ml-1 text-xs">#{entry.entity_id.slice(0, 8)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={entry.action === "delete" ? "destructive" : entry.action === "create" ? "default" : "secondary"}>
                            {entry.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{entry.user_id.slice(0, 12)}…</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{entry.org_id.slice(0, 12)}…</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {ts ? new Date(ts).toLocaleString("pt-BR") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
