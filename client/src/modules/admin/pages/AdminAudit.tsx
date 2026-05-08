import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import { MOCK_AUDIT_LOGS } from "../data/mockAdmin";
import type { AuditAction } from "../types";
import { Search, ScrollText, Globe, Clock } from "lucide-react";

const ACTION_STYLE: Record<AuditAction, string> = {
  create:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  update:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
  delete:      "text-red-400 bg-red-500/10 border-red-500/20",
  login:       "text-white/50 bg-white/5 border-white/10",
  logout:      "text-white/30 bg-white/5 border-white/5",
  impersonate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  plan_change: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  suspend:     "text-red-400 bg-red-500/10 border-red-500/20",
  activate:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  export:      "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};
const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Criação", update: "Atualização", delete: "Exclusão",
  login: "Login", logout: "Logout", impersonate: "Impersonation",
  plan_change: "Mudança de Plano", suspend: "Suspensão",
  activate: "Ativação", export: "Exportação",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAudit() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_AUDIT_LOGS.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.user_name.toLowerCase().includes(q) ||
      log.tenant_name.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      log.action.includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Logs & Auditoria</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Trilha de auditoria e ações administrativas</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Eventos Totais",   value: MOCK_AUDIT_LOGS.length },
            { label: "Hoje",             value: MOCK_AUDIT_LOGS.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length },
            { label: "Ações Críticas",   value: MOCK_AUDIT_LOGS.filter(l => ["suspend","delete","impersonate"].includes(l.action)).length },
            { label: "Exportações",      value: MOCK_AUDIT_LOGS.filter(l => l.action === "export").length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl mb-3 bg-white/5">
                <ScrollText className="h-4 w-4 text-white/30" />
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Buscar por usuário, tenant, ação..."
            className="pl-9 h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white placeholder:text-white/25"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-audit"
          />
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Ação", "Entidade", "Usuário", "Tenant", "IP", "Detalhes", "Quando"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors" data-testid={`audit-${log.id}`}>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className={cn("text-[10.5px] border", ACTION_STYLE[log.action])}>
                      {ACTION_LABEL[log.action]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[12.5px] font-medium text-white/70">{log.entity}</span>
                    <span className="text-[10px] text-white/30 ml-1.5 font-mono">#{log.entity_id.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[12px] text-white/70">{log.user_name}</p>
                    <p className="text-[10.5px] text-white/30">{log.user_email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-white/50">{log.tenant_name}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-white/30">
                      <Globe className="h-3 w-3 shrink-0" />{log.ip_address}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[11.5px] text-white/40 max-w-[150px] truncate">
                    {log.details ?? "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-[11px] text-white/30">
                      <Clock className="h-3 w-3" />{fmtDate(log.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
