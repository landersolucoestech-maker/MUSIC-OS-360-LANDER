import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  CheckCircle2, XCircle, Info, Settings2, Pencil, Eye, RotateCcw, AlertTriangle,
} from "lucide-react";
import {
  tiposTransacao,
  tiposCliente,
  initialFormData,
  getCategoriasParaTipoTransacao,
} from "@/modules/accounting/lib/transacao-constants";
import {
  computeFinancialRules,
  DISPLAY_RULES,
} from "@/modules/accounting/components/transacao-form/rules/financial-form-rules";
import {
  useRuleOverrides,
} from "@/modules/accounting/components/transacao-form/hooks/useRuleOverrides";
import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";

// ── Rule labels ───────────────────────────────────────────────────────────────
const RULE_META: Record<string, { label: string; description: string }> = {
  exibirTipoCliente:      { label: "Tipo de Cliente",      description: "Para quem pagar / Receber de" },
  exibirCategoria:        { label: "Categoria",             description: "Categoria da transação" },
  exibirSubcategoria:     { label: "Subcategoria",          description: "Tipo / Subcategoria" },
  exibirItemInvestimento: { label: "Item de Investimento",  description: "Item específico (só em Investimento)" },
  exibirArtista:          { label: "Artista Vinculado",     description: "Artista relacionado à transação" },
  exibirProjeto:          { label: "Projeto / Música",      description: "Projeto ou música vinculada" },
  projetoObrigatorio:     { label: "Projeto Obrigatório",   description: "Projeto é campo obrigatório (vs opcional)" },
  exibirEvento:           { label: "Show / Evento",         description: "Evento vinculado à transação" },
  exibirFornecedor:       { label: "Fornecedor / Cliente",  description: "Vínculo com CRM" },
  exibirOrgaoArrecadador: { label: "Órgão Arrecadador",     description: "Receita Federal, Prefeitura, etc." },
  exibirMotivoViagem:     { label: "Motivo da Viagem",      description: "Texto livre — append nas observações" },
  exibirNomePublicidade:  { label: "Nome da Publicidade",   description: "Nome da campanha/comercial" },
  exibirParcelamento:     { label: "Parcelamento",          description: "Campos de parcelas e intervalo" },
};

const RULE_KEYS = Object.keys(RULE_META) as (keyof typeof RULE_META)[];

// ── Matrix row ────────────────────────────────────────────────────────────────
interface MatrixRow {
  tipoTransacao: string;
  tipoCliente:   string;
  categoria:     string;
  computed:      Record<string, boolean>;
}

function buildMatrixRows(): MatrixRow[] {
  const rows: MatrixRow[] = [];
  const tipos = tiposTransacao.map(t => t.value);
  const clientes = ["", "empresa", "artista", "pessoa"];

  for (const tipo of tipos) {
    const clienteOpts = tipo === "imposto" || tipo === "transferencia" || tipo === "investimento"
      ? [""]
      : clientes;

    for (const cliente of clienteOpts) {
      const baseData: TransacaoFormData = { ...initialFormData, tipoTransacao: tipo, tipoCliente: cliente };
      const categorias = getCategoriasParaTipoTransacao(tipo, cliente);

      if (categorias.length === 0) {
        const r = computeFinancialRules(baseData);
        rows.push({ tipoTransacao: tipo, tipoCliente: cliente, categoria: "", computed: r as unknown as Record<string, boolean> });
      } else {
        for (const cat of categorias) {
          const data: TransacaoFormData = { ...baseData, categoria: cat.value };
          const r = computeFinancialRules(data);
          rows.push({ tipoTransacao: tipo, tipoCliente: cliente, categoria: cat.value, computed: r as unknown as Record<string, boolean> });
        }
      }
    }
  }
  return rows;
}

// ── Tipo badge ────────────────────────────────────────────────────────────────
function TipoTransacaoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, string> = {
    receita:      "bg-green-500/15 text-green-400 border-green-500/30",
    despesa:      "bg-red-500/15 text-red-400 border-red-500/30",
    investimento: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    imposto:      "bg-orange-500/15 text-orange-400 border-orange-500/30",
    transferencia:"bg-purple-500/15 text-purple-400 border-purple-500/30",
  };
  const labels: Record<string, string> = {
    receita: "Receita", despesa: "Despesa", investimento: "Investimento",
    imposto: "Imposto", transferencia: "Transferência",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${map[tipo] ?? ""}`}>
      {labels[tipo] ?? tipo}
    </span>
  );
}

// ── Rule cell (read-only or editable) ─────────────────────────────────────────
interface RuleCellProps {
  isActive:    boolean;
  isOverriden: boolean;
  isEditMode:  boolean;
  onToggle:    () => void;
}

function RuleCell({ isActive, isOverriden, isEditMode, onToggle }: RuleCellProps) {
  if (!isEditMode) {
    return isActive
      ? <CheckCircle2 className={`h-3.5 w-3.5 mx-auto ${isOverriden ? "text-amber-400" : "text-green-500"}`} />
      : <XCircle      className={`h-3.5 w-3.5 mx-auto ${isOverriden ? "text-amber-400/50" : "text-muted-foreground/25"}`} />;
  }
  return (
    <button
      onClick={onToggle}
      title={isOverriden ? "Override activo — clique para remover" : "Clique para forçar este campo"}
      className={`h-5 w-5 rounded flex items-center justify-center mx-auto transition-colors border ${
        isActive
          ? isOverriden
            ? "bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30"
            : "bg-green-500/20 border-green-500/40 hover:bg-red-500/20 hover:border-red-500/40"
          : isOverriden
            ? "bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30"
            : "bg-muted/40 border-border hover:bg-green-500/20 hover:border-green-500/40"
      }`}
    >
      {isActive
        ? <CheckCircle2 className={`h-3 w-3 ${isOverriden ? "text-amber-400" : "text-green-500"}`} />
        : <XCircle      className={`h-3 w-3 ${isOverriden ? "text-amber-400" : "text-muted-foreground/30"}`} />
      }
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const NONE_SENTINEL = "__none__";

export default function TransacaoRules() {
  const [filterTipo,    setFilterTipo]    = useState<string>("all");
  const [filterCliente, setFilterCliente] = useState<string>("all");
  const [activeTab,     setActiveTab]     = useState<"matrix" | "catalog">("matrix");
  const [isEditMode,    setIsEditMode]    = useState(false);

  const allRows = useMemo(() => buildMatrixRows(), []);

  const { overrides, toggleOverride, clearOverrides, hasOverrides, getEffective } = useRuleOverrides();

  const filteredRows = useMemo(() => {
    const clienteFilter = filterCliente === NONE_SENTINEL ? "" : filterCliente;
    return allRows.filter(row => {
      if (filterTipo !== "all" && row.tipoTransacao !== filterTipo) return false;
      if (clienteFilter !== "all" && row.tipoCliente !== clienteFilter) return false;
      return true;
    });
  }, [allRows, filterTipo, filterCliente]);

  const overrideCount = Object.keys(overrides).length;
  const totalRules    = Object.keys(DISPLAY_RULES).length;
  const totalCombos   = allRows.length;

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Settings2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold">Regras de Transações</h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Mapa configurável das regras que controlam quais campos aparecem no formulário.
              Derivadas do{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">DISPLAY_RULES</code> map em{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">financial-form-rules.ts</code>.
              {hasOverrides && (
                <span className="ml-2 text-amber-400">
                  {overrideCount} override{overrideCount > 1 ? "s" : ""} activo{overrideCount > 1 ? "s" : ""}.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalRules}</p>
              <p className="text-xs text-muted-foreground">Regras</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalCombos}</p>
              <p className="text-xs text-muted-foreground">Combinações</p>
            </div>
            {hasOverrides && (
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{overrideCount}</p>
                <p className="text-xs text-muted-foreground">Overrides</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Override warning ── */}
        {hasOverrides && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300 flex-1">
                Existem <strong>{overrideCount}</strong> override{overrideCount > 1 ? "s" : ""} activos. O formulário de transação
                irá usar estas configurações em vez das regras base.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 shrink-0"
                onClick={clearOverrides}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Limpar overrides
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Tabs ── */}
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex gap-1">
            {(["matrix", "catalog"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "matrix" ? "Matriz de Campos" : "Catálogo de Regras"}
              </button>
            ))}
          </div>
          {activeTab === "matrix" && (
            <Button
              size="sm"
              variant={isEditMode ? "default" : "outline"}
              onClick={() => setIsEditMode(v => !v)}
              className={isEditMode ? "bg-primary text-primary-foreground" : ""}
            >
              {isEditMode
                ? <><Eye className="h-3.5 w-3.5 mr-1.5" />Modo Visualização</>
                : <><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar Regras</>
              }
            </Button>
          )}
        </div>

        {/* ── Edit mode hint ── */}
        {isEditMode && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-2.5 px-4 flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-xs text-primary/80">
                <strong>Modo Edição activo.</strong> Clique em qualquer célula da matriz para forçar ou suprimir um campo
                para aquela combinação. As alterações são aplicadas imediatamente ao formulário de transação.
                Células a <span className="text-amber-400 font-medium">amarelo</span> têm override activo.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── MATRIZ DE CAMPOS ── */}
        {activeTab === "matrix" && (
          <div className="space-y-4">
            {/* Filters */}
            <Card className="bg-muted/20 border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="w-44 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {tiposTransacao.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Cliente:</span>
                    <Select value={filterCliente} onValueChange={setFilterCliente}>
                      <SelectTrigger className="w-44 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value={NONE_SENTINEL}>— (sem tipo cliente)</SelectItem>
                        {tiposCliente.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {filteredRows.length} combinaçõe{filteredRows.length !== 1 ? "s" : ""} visíveis
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Matrix table */}
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="sticky left-0 bg-muted/40 z-10 min-w-[110px] text-xs">Tipo</TableHead>
                      <TableHead className="sticky left-[110px] bg-muted/40 z-10 min-w-[85px] text-xs">Cliente</TableHead>
                      <TableHead className="sticky left-[195px] bg-muted/40 z-10 min-w-[140px] text-xs">Categoria</TableHead>
                      {RULE_KEYS.map(key => (
                        <TableHead key={key} className="text-center min-w-[52px] px-1 text-xs" title={RULE_META[key].description}>
                          {RULE_META[key].label.split(" ").map((w, i) => (
                            <span key={i} className="block text-[10px] leading-tight whitespace-nowrap">{w}</span>
                          ))}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/20">
                        <TableCell className="sticky left-0 bg-background z-10 py-1.5">
                          <TipoTransacaoBadge tipo={row.tipoTransacao} />
                        </TableCell>
                        <TableCell className="sticky left-[110px] bg-background z-10 py-1.5 text-xs text-muted-foreground capitalize">
                          {row.tipoCliente || <span className="italic text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="sticky left-[195px] bg-background z-10 py-1.5 text-xs text-muted-foreground">
                          {row.categoria || <span className="italic text-muted-foreground/40">—</span>}
                        </TableCell>
                        {RULE_KEYS.map(key => {
                          const computed   = Boolean(row.computed[key]);
                          const effective  = getEffective(row.tipoTransacao, row.tipoCliente, row.categoria, key, computed);
                          const isOverriden = effective !== computed;
                          return (
                            <TableCell key={key} className="text-center py-1.5 px-1">
                              <RuleCell
                                isActive={effective}
                                isOverriden={isOverriden}
                                isEditMode={isEditMode}
                                onToggle={() => toggleOverride(row.tipoTransacao, row.tipoCliente, row.categoria, key, computed)}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Campo activo (regra base)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Campo activo (override)
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-amber-400/50" /> Campo oculto (override)
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/25" /> Campo oculto (regra base)
              </span>
            </div>
          </div>
        )}

        {/* ── CATÁLOGO DE REGRAS ── */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RULE_KEYS.map(key => {
              const meta        = RULE_META[key];
              const activeCount = allRows.filter(r => {
                const computed  = Boolean(r.computed[key]);
                return getEffective(r.tipoTransacao, r.tipoCliente, r.categoria, key, computed);
              }).length;
              const overrideCountForKey = allRows.filter(r => {
                const computed  = Boolean(r.computed[key]);
                return getEffective(r.tipoTransacao, r.tipoCliente, r.categoria, key, computed) !== computed;
              }).length;
              const pct = Math.round((activeCount / allRows.length) * 100);
              return (
                <Card key={key} className="bg-muted/20 border-border">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-semibold">{meta.label}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{meta.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {overrideCountForKey > 0 && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                            {overrideCountForKey} override{overrideCountForKey > 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {activeCount}/{allRows.length} ({pct}%)
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        Activo em <strong>{activeCount}</strong> das <strong>{allRows.length}</strong> combinações tipo × cliente × categoria.
                      </span>
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-1.5 truncate">
                      DISPLAY_RULES.{key}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
