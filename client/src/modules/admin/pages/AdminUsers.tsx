import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import { MOCK_ADMIN_USERS } from "../data/mockAdmin";
import type { AdminRole } from "../types";
import { Search, Users, Shield, ShieldOff, Clock } from "lucide-react";

const ROLE_STYLE: Record<AdminRole, string> = {
  super_admin: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  admin:       "text-blue-400 bg-blue-500/10 border-blue-500/20",
  operator:    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  support:     "text-purple-400 bg-purple-500/10 border-purple-500/20",
  finance:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  viewer:      "text-white/40 bg-white/5 border-white/10",
};
const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super Admin", admin: "Admin",
  operator: "Operador", support: "Suporte",
  finance: "Financeiro", viewer: "Viewer",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_ADMIN_USERS.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.tenant_name.toLowerCase().includes(q);
  });

  const active  = MOCK_ADMIN_USERS.filter(u => u.status === "active").length;
  const blocked = MOCK_ADMIN_USERS.filter(u => u.status === "blocked").length;
  const mfa     = MOCK_ADMIN_USERS.filter(u => u.mfa_enabled).length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Gestão global de usuários</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Usuários Ativos", value: active,                       color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Users },
            { label: "Bloqueados",      value: blocked,                      color: "text-red-400",     bg: "bg-red-500/10",     icon: ShieldOff },
            { label: "Com MFA",         value: mfa,                          color: "text-blue-400",    bg: "bg-blue-500/10",    icon: Shield },
            { label: "Total",           value: MOCK_ADMIN_USERS.length,      color: "text-white/50",    bg: "bg-white/5",        icon: Users },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl mb-3", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Buscar usuários..."
            className="pl-9 h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white placeholder:text-white/25"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-users"
          />
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Usuário", "Tenant", "Role", "MFA", "Status", "Sessões", "Último Login"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((u) => {
                const statusColor = u.status === "active" ? "text-emerald-400" : u.status === "blocked" ? "text-red-400" : "text-white/40";
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" data-testid={`user-${u.id}`}>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-[13px] font-medium text-white">{u.name}</p>
                        <p className="text-[11px] text-white/35">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-white/50">{u.tenant_name}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className={cn("text-[10.5px] border", ROLE_STYLE[u.role])}>
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {u.mfa_enabled
                        ? <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        : <ShieldOff className="h-3.5 w-3.5 text-white/20" />}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-[12px] font-medium capitalize", statusColor)}>
                        {u.status === "active" ? "Ativo" : u.status === "blocked" ? "Bloqueado" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-white/40">{u.sessions_count}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-[11.5px] text-white/35">
                        <Clock className="h-3 w-3" />
                        {fmtDate(u.last_login)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
