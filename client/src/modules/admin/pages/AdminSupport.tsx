import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import { MOCK_SUPPORT_TICKETS } from "../data/mockAdmin";
import type { TicketStatus, TicketPriority } from "../types";
import { Search, HeadphonesIcon, Clock, CheckCircle2, AlertCircle, Pause } from "lucide-react";

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: "Aberto",      color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  in_progress: { label: "Em andamento",color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
  resolved:    { label: "Resolvido",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  closed:      { label: "Fechado",     color: "text-white/30",    bg: "bg-white/5 border-white/10" },
  waiting:     { label: "Aguardando",  color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
};
const PRIORITY_CFG: Record<TicketPriority, { label: string; color: string }> = {
  critical: { label: "Crítica", color: "text-red-400" },
  high:     { label: "Alta",    color: "text-orange-400" },
  medium:   { label: "Média",   color: "text-yellow-400" },
  low:      { label: "Baixa",   color: "text-white/35" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function AdminSupport() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = MOCK_SUPPORT_TICKETS.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.tenant_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const open       = MOCK_SUPPORT_TICKETS.filter(t => t.status === "open").length;
  const inProgress = MOCK_SUPPORT_TICKETS.filter(t => t.status === "in_progress").length;
  const resolved   = MOCK_SUPPORT_TICKETS.filter(t => t.status === "resolved").length;
  const waiting    = MOCK_SUPPORT_TICKETS.filter(t => t.status === "waiting").length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Support Hub</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Gestão global de tickets de suporte</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Abertos",      value: open,       icon: AlertCircle,    color: "text-blue-400",    bg: "bg-blue-500/10" },
            { label: "Em Andamento", value: inProgress, icon: Clock,          color: "text-yellow-400",  bg: "bg-yellow-500/10" },
            { label: "Aguardando",   value: waiting,    icon: Pause,          color: "text-purple-400",  bg: "bg-purple-500/10" },
            { label: "Resolvidos",   value: resolved,   icon: CheckCircle2,   color: "text-emerald-400", bg: "bg-emerald-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl mb-3", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input placeholder="Buscar tickets..." className="pl-9 h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white placeholder:text-white/25" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-tickets" />
          </div>
          <div className="flex gap-1">
            {[
              { key: "all", label: "Todos" },
              { key: "open", label: "Abertos" },
              { key: "in_progress", label: "Em Andamento" },
              { key: "resolved", label: "Resolvidos" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                  filter === key
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
                )}
                data-testid={`filter-${key}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["#", "Assunto", "Tenant", "Prioridade", "Status", "Atribuído", "Criado"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((t) => {
                const sc = STATUS_CFG[t.status];
                const pc = PRIORITY_CFG[t.priority];
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors" data-testid={`ticket-${t.id}`}>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-white/25">#{t.id.slice(-4)}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-white">{t.subject}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">{t.category}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-white/50">{t.tenant_name}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-[12px] font-semibold", pc.color)}>{pc.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className={cn("text-[10.5px] border", sc.bg, sc.color)}>
                        {sc.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {t.assigned_to ? (
                        <div className="flex items-center gap-1.5">
                          <HeadphonesIcon className="h-3 w-3 text-white/25" />
                          <span className="text-[12px] text-white/50">{t.assigned_to}</span>
                        </div>
                      ) : (
                        <span className="text-[11.5px] text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-[11.5px] text-white/30">
                        <Clock className="h-3 w-3" />{fmtDate(t.created_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-3">
              <HeadphonesIcon className="h-8 w-8 text-white/10" />
              <p className="text-[13px] text-white/30">Nenhum ticket encontrado</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
