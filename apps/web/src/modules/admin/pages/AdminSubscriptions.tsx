// ============================================================================
// AdminSubscriptions — gestão de assinaturas dos clientes (Painel Admin).
// Fonte central de assinaturas: consulta de status, histórico de cobranças,
// cancelamentos e renovações. Modo mock (sem backend); a Stripe permanece
// responsável apenas pelo processamento financeiro real.
// ============================================================================

import { useMemo, useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ADMIN_SUBSCRIPTIONS } from "../data/admin-source";
import type { AdminSubscription, PlanTier, SubscriptionStatus } from "../types";
import {
  Search, MoreHorizontal, RefreshCw, XCircle, Receipt, DollarSign,
  CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

const PLAN_LABEL: Record<PlanTier, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
};

const STATUS_META: Record<SubscriptionStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Ativa", variant: "success" },
  trial: { label: "Trial", variant: "info" },
  past_due: { label: "Inadimplente", variant: "warning" },
  cancelled: { label: "Cancelada", variant: "danger" },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativas" },
  { value: "trial", label: "Trial" },
  { value: "past_due", label: "Inadimplentes" },
  { value: "cancelled", label: "Canceladas" },
];

/* ─────────────── Histórico de cobranças (mock derivado) ─────────────── */
interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
}

function buildInvoices(sub: AdminSubscription): Invoice[] {
  if (sub.mrr <= 0) return [];
  const invoices: Invoice[] = [];
  const start = new Date(sub.started_at);
  const now = new Date();
  const stepMonths = sub.billing_cycle === "annual" ? 12 : 1;
  const amount = sub.billing_cycle === "annual" ? sub.mrr * 12 : sub.mrr;

  const cursor = new Date(start);
  let i = 0;
  while (cursor <= now && i < 24) {
    invoices.push({
      id: `${sub.id}-inv-${i}`,
      date: cursor.toISOString(),
      amount,
      status: "paid",
    });
    cursor.setMonth(cursor.getMonth() + stepMonths);
    i += 1;
  }
  // Estado atual reflete a assinatura: última cobrança pendente/falha quando aplicável.
  if (invoices.length > 0) {
    if (sub.status === "past_due") invoices[invoices.length - 1].status = "failed";
    else if (sub.status === "cancelled") invoices[invoices.length - 1].status = "pending";
  }
  return invoices.reverse();
}

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
  if (status === "paid") return <Badge variant="success" className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />Pago</Badge>;
  if (status === "failed") return <Badge variant="danger" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />Falhou</Badge>;
  return <Badge variant="warning" className="text-[10px] gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
}

/* ─────────────── Diálogo de histórico de cobranças ─────────────── */
function BillingHistoryDialog({ sub, onClose }: { sub: AdminSubscription; onClose: () => void }) {
  const invoices = useMemo(() => buildInvoices(sub), [sub]);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-[15px]">
            <Receipt className="h-4 w-4 text-blue-400" />
            Histórico de Cobranças — {sub.tenant_name}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma cobrança registrada para esta assinatura.
            </p>
          ) : (
            <>
            <ListSectionHeader
              title="Histórico de Cobranças"
              count={invoices.length}
              description="Acompanhe faturas, valores e status de pagamento"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{fmtDate(inv.date)}</TableCell>
                    <TableCell className="font-sans text-sm">{fmtBRL(inv.amount)}</TableCell>
                    <TableCell className="text-right"><InvoiceStatusBadge status={inv.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Confirmação de cancelamento ─────────────── */
function CancelDialog({ sub, onConfirm, onClose }: { sub: AdminSubscription; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-[15px]">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Cancelar Assinatura
          </DialogTitle>
        </DialogHeader>
        <p className="py-2 text-[13px] text-muted-foreground">
          Tem certeza que deseja cancelar a assinatura de{" "}
          <span className="font-semibold text-foreground">{sub.tenant_name}</span>?
          O cliente perderá o acesso ao final do período vigente.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Voltar</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-500 text-foreground text-xs gap-1.5" onClick={onConfirm} data-testid="btn-confirm-cancel-sub">
            <XCircle className="h-3.5 w-3.5" />
            Cancelar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Página principal ─────────────── */
export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<AdminSubscription[]>(ADMIN_SUBSCRIPTIONS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historySub, setHistorySub] = useState<AdminSubscription | null>(null);
  const [cancelSub, setCancelSub] = useState<AdminSubscription | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (q && !s.tenant_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subs, search, statusFilter]);

  const { page, pageSize, total, pageItems, setPage, setPageSize } = usePagination(filtered, 10);

  const kpis = useMemo(() => ({
    total: subs.length,
    ativas: subs.filter((s) => s.status === "active").length,
    inadimplentes: subs.filter((s) => s.status === "past_due").length,
    mrr: subs.filter((s) => s.status === "active").reduce((acc, s) => acc + s.mrr, 0),
  }), [subs]);

  function renew(sub: AdminSubscription) {
    const next = new Date();
    next.setDate(next.getDate() + (sub.billing_cycle === "annual" ? 365 : 30));
    setSubs((prev) => prev.map((s) => s.id === sub.id
      ? { ...s, status: "active", current_period_end: next.toISOString(), next_payment_at: next.toISOString(), last_payment_at: new Date().toISOString() }
      : s));
  }

  function confirmCancel() {
    if (!cancelSub) return;
    setSubs((prev) => prev.map((s) => s.id === cancelSub.id ? { ...s, status: "cancelled" } : s));
    setCancelSub(null);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Gestão de assinaturas, cobranças, cancelamentos e renovações</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total de Assinaturas", value: kpis.total, icon: Receipt },
            { label: "Ativas", value: kpis.ativas, icon: CheckCircle2 },
            { label: "Inadimplentes", value: kpis.inadimplentes, icon: AlertTriangle },
            { label: "MRR (ativas)", value: fmtBRL(kpis.mrr), icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl mb-3 bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              className="pl-9 h-8 text-xs bg-muted border-border text-foreground placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-subscriptions"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[140px] bg-muted border-border text-muted-foreground" data-testid="select-sub-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ListSectionHeader
            title="Lista de Assinaturas"
            count={filtered.length}
            description="Acompanhe clientes, planos, ciclos, MRR e próximas cobranças"
            className="px-4 pt-4"
          />
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {["Cliente", "Plano", "Status", "Ciclo", "MRR", "Início", "Próx. Cobrança", "Método", ""].map((h, i) => (
                  <TableHead key={i} className="text-[11px] font-semibold text-muted-foreground tracking-wider whitespace-nowrap">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((s) => (
                <TableRow key={s.id} className="border-border hover:bg-muted transition-colors" data-testid={`subscription-${s.id}`}>
                  <TableCell className="font-medium text-foreground">{s.tenant_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{PLAN_LABEL[s.plan]}</TableCell>
                  <TableCell><Badge variant={STATUS_META[s.status].variant} className="text-[10px]">{STATUS_META[s.status].label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.billing_cycle === "annual" ? "Anual" : "Mensal"}</TableCell>
                  <TableCell className="font-sans text-sm text-muted-foreground">{fmtBRL(s.mrr)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(s.started_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(s.next_payment_at ?? s.current_period_end)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{s.payment_method}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" data-testid={`actions-sub-${s.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-card border-border text-muted-foreground">
                        <DropdownMenuItem className="gap-2 text-xs cursor-pointer hover:bg-muted focus:bg-muted" onClick={() => setHistorySub(s)} data-testid={`history-sub-${s.id}`}>
                          <Receipt className="h-3.5 w-3.5 text-blue-400" />
                          Histórico de cobranças
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-xs cursor-pointer hover:bg-muted focus:bg-muted" onClick={() => renew(s)} disabled={s.status === "active"} data-testid={`renew-sub-${s.id}`}>
                          <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                          Renovar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-muted" />
                        <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400" onClick={() => setCancelSub(s)} disabled={s.status === "cancelled"} data-testid={`cancel-sub-${s.id}`}>
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="assinaturas"
          />
        </div>
      </div>

      {historySub && <BillingHistoryDialog sub={historySub} onClose={() => setHistorySub(null)} />}
      {cancelSub && <CancelDialog sub={cancelSub} onConfirm={confirmCancel} onClose={() => setCancelSub(null)} />}
    </AdminLayout>
  );
}
