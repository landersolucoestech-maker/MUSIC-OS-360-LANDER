import { useMemo, useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { CheckCircle2, Circle, Search, CheckCheck, SlidersHorizontal } from "lucide-react";
import { useTransacoes, type TransacaoWithRelations } from "@/modules/accounting/hooks/useTransacoes";
import { formatCurrency } from "@/shared/lib/format-utils";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function buildMonthOptions() {
  const opts: { label: string; month: number; year: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, month: d.getMonth(), year: d.getFullYear() });
  }
  return opts;
}

const MONTH_OPTIONS = buildMonthOptions();
type ConciliadoFilter = "todos" | "pendente" | "conciliado";

function StatusBadge({ conciliado }: { conciliado: boolean | null | undefined }) {
  if (conciliado) {
    return (
      <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1" variant="outline">
        <CheckCircle2 className="h-3 w-3" /> Conciliado
      </Badge>
    );
  }
  return (
    <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px] gap-1" variant="outline">
      <Circle className="h-3 w-3" /> Pendente
    </Badge>
  );
}

export default function Conciliacao() {
  const { transacoes, isLoading, updateTransacao } = useTransacoes();
  const now = new Date();
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = MONTH_OPTIONS.findIndex(o => o.month === now.getMonth() && o.year === now.getFullYear());
    return idx >= 0 ? idx : MONTH_OPTIONS.length - 1;
  });
  const [filter, setFilter] = useState<ConciliadoFilter>("todos");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const selected = MONTH_OPTIONS[selectedIdx];

  const monthTx = useMemo(() => {
    const { month, year } = selected;
    return transacoes.filter(t => {
      const d = new Date(t.data + "T12:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [transacoes, selected]);

  const filtered = useMemo(() => {
    return monthTx.filter(t => {
      const isConciliado = t.conciliado ?? false;
      if (filter === "conciliado" && !isConciliado) return false;
      if (filter === "pendente" && isConciliado) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.descricao?.toLowerCase().includes(q) ||
          t.categoria?.toLowerCase().includes(q) ||
          String(t.valor).includes(q)
        );
      }
      return true;
    });
  }, [monthTx, filter, search]);

  const stats = useMemo(() => {
    const conciliados = monthTx.filter(t => t.conciliado).length;
    const pendentes = monthTx.length - conciliados;
    const totalReceitas = monthTx.filter(t => t.tipo === "receita" && t.conciliado).reduce((s, t) => s + t.valor, 0);
    const totalDespesas = monthTx.filter(t => t.tipo === "despesa" && t.conciliado).reduce((s, t) => s + t.valor, 0);
    return { conciliados, pendentes, total: monthTx.length, totalReceitas, totalDespesas };
  }, [monthTx]);

  const handleToggle = async (t: TransacaoWithRelations) => {
    const newVal = !(t.conciliado ?? false);
    setPending(p => ({ ...p, [t.id]: true }));
    try {
      await updateTransacao.mutateAsync({ id: t.id, conciliado: newVal });
      toast.success(newVal ? "Transação marcada como conciliada." : "Marcação removida.");
    } catch {
      toast.error("Erro ao atualizar conciliação.");
    } finally {
      setPending(p => { const n = { ...p }; delete n[t.id]; return n; });
    }
  };

  const handleConciliarTodos = async () => {
    const pendentes = filtered.filter(t => !t.conciliado);
    if (pendentes.length === 0) { toast("Nenhuma pendente para conciliar."); return; }
    for (const t of pendentes) {
      try { await updateTransacao.mutateAsync({ id: t.id, conciliado: true }); } catch { /* continue */ }
    }
    toast.success(`${pendentes.length} transação(ões) conciliada(s).`);
  };

  return (
    <MainLayout
      title="Conciliação"
      description="Marque transações como conciliadas com o extrato bancário"
      actions={
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleConciliarTodos} data-testid="button-conciliar-todos">
          <CheckCheck className="h-3.5 w-3.5" /> Conciliar Visíveis
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total no Mês</p>
              <p className="text-xl font-bold font-mono text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">lançamentos</p>
            </CardContent>
          </Card>
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conciliados</p>
              </div>
              <p className="text-xl font-bold font-mono text-success">{stats.conciliados}</p>
              <p className="text-[10px] text-muted-foreground">
                {stats.total > 0 ? `${Math.round((stats.conciliados / stats.total) * 100)}%` : "—"} do total
              </p>
            </CardContent>
          </Card>
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Circle className="h-3.5 w-3.5 text-warning" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendentes</p>
              </div>
              <p className="text-xl font-bold font-mono text-warning">{stats.pendentes}</p>
              <p className="text-[10px] text-muted-foreground">a conciliar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Conciliado</p>
              <p className={cn("text-lg font-bold font-mono", (stats.totalReceitas - stats.totalDespesas) >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(stats.totalReceitas - stats.totalDespesas)}
              </p>
              <div className="flex gap-2 text-[10px]">
                <span className="text-success">+{formatCurrency(stats.totalReceitas)}</span>
                <span className="text-destructive">−{formatCurrency(stats.totalDespesas)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={String(selectedIdx)} onValueChange={v => setSelectedIdx(Number(v))}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-border" data-testid="select-mes-conciliacao">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o, i) => (
                <SelectItem key={i} value={String(i)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md overflow-hidden">
            {(["todos", "pendente", "conciliado"] as ConciliadoFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                )}
                data-testid={`filter-${f}`}
              >
                {f === "todos" ? "Todos" : f === "pendente" ? "Pendentes" : "Conciliados"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs bg-card border-border"
              placeholder="Buscar transação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-conciliacao"
            />
          </div>
          {(search || filter !== "todos") && (
            <Badge variant="secondary" className="text-[10px]">
              <SlidersHorizontal className="h-3 w-3 mr-1" /> {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Lançamentos</CardTitle>
            <CardDescription className="text-xs">Clique no ícone para marcar/desmarcar como conciliado</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Nenhum lançamento encontrado.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map(t => (
                  <div key={t.id} className={cn("flex items-center gap-3 py-3 transition-colors", t.conciliado ? "opacity-70" : "")} data-testid={`conciliacao-row-${t.id}`}>
                    <button
                      onClick={() => handleToggle(t)}
                      disabled={pending[t.id]}
                      className={cn(
                        "shrink-0 rounded-full transition-all",
                        t.conciliado ? "text-success hover:text-success/70" : "text-muted-foreground hover:text-success",
                        pending[t.id] && "opacity-50 cursor-wait"
                      )}
                      data-testid={`toggle-conciliado-${t.id}`}
                      title={t.conciliado ? "Clique para desmarcar" : "Clique para marcar como conciliado"}
                    >
                      {t.conciliado ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground truncate">{t.descricao}</span>
                        <StatusBadge conciliado={t.conciliado} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span className="font-mono">{t.data}</span>
                        {t.categoria && <span>· {t.categoria}</span>}
                        {t.artistas && <span>· {(t.artistas as { nome_artistico?: string }).nome_artistico}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-bold font-mono", t.tipo === "receita" ? "text-success" : "text-destructive")}>
                        {t.tipo === "receita" ? "+" : "−"}{formatCurrency(t.valor)}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{t.tipo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
