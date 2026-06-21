import { useMemo, useState, type ReactNode } from "react";
import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AlertTriangle, XCircle, Info, CheckCircle, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { IS_PROD } from "@/shared/lib/env";
import { formatRightsDate } from "../utils/date-format";

export type DivergenciaSeverity = "critica" | "alta" | "media" | "baixa";

export interface DivergenciaHistoricoEntry {
  data: string;
  acao: string;
  por?: string;
}

export interface Divergencia {
  id: string;
  tipo: string;
  descricao: string;
  obra?: string;
  isrc?: string;
  origem?: string;
  severity: DivergenciaSeverity;
  risco_score: number;
  data: string;
  status: "aberta" | "em_resolucao" | "resolvida";
  // Campos de rastreabilidade (opcionais; alimentados pelo fluxo de resolução)
  data_criacao?: string;
  responsavel?: string;
  observacoes?: string;
  data_resolucao?: string;
  historico?: DivergenciaHistoricoEntry[];
}

const SEVERITY_CONFIG: Record<DivergenciaSeverity, { label: string; variant: BadgeVariant; icon: ReactNode; border: string }> = {
  critica: { label: "Crítica",  variant: "danger",  icon: <XCircle className="h-4 w-4 text-destructive" />,    border: "border-l-destructive" },
  alta:    { label: "Alta",     variant: "warning", icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, border: "border-l-orange-500" },
  media:   { label: "Média",    variant: "warning", icon: <AlertTriangle className="h-4 w-4 text-warning" />,    border: "border-l-warning" },
  baixa:   { label: "Baixa",    variant: "neutral", icon: <Info className="h-4 w-4 text-muted-foreground" />,    border: "border-l-border" },
};

// Dados dev-only. Gate IS_PROD garante que `MOCK_DIVERGENCIAS` é array vazio
// em build de produção — backend ainda não tem endpoint real de divergências.
const _DEV_DIVERGENCIAS: Divergencia[] = [
  { id: "div-001", tipo: "Execução sem conciliação ECAD", descricao: "Execução detectada na Rádio Globo FM mas sem registro correspondente no relatório ECAD Q1/2026.", obra: "Frequência 440", isrc: "BRMSC2500003", origem: "Rádio Globo FM", severity: "critica", risco_score: 92, data: "2026-05-07", status: "aberta" },
  { id: "div-002", tipo: "ISRC ausente no relatório ECAD", descricao: "Relatório ECAD importado contém obra sem ISRC identificado. Correspondência manual necessária.", obra: "Cidade Mágica", isrc: "BRMSC2500006", origem: "ECAD Q1/2026", severity: "alta", risco_score: 78, data: "2026-05-06", status: "aberta" },
  { id: "div-003", tipo: "Publisher não identificado", descricao: "Execução registrada sem publisher vinculado. Recebimentos externos de direitos podem não ser distribuídos corretamente.", obra: "Trap do Norte", isrc: "BRMSC2500008", origem: "Festival Rec Beat", severity: "alta", risco_score: 74, data: "2026-05-04", status: "em_resolucao" },
  { id: "div-004", tipo: "Diferença financeira detectada", descricao: "Valor arrecadado pelo ECAD (R$ 87,50) difere do estimado (R$ 124,00) em mais de 20%.", obra: "Frequência 440", isrc: "BRMSC2500003", origem: "Multishow", severity: "media", risco_score: 55, data: "2026-05-07", status: "aberta" },
  { id: "div-005", tipo: "Execução sem obra cadastrada", descricao: "Sinal de broadcast detectado via ACRCloud sem correspondência no catálogo interno.", obra: undefined, isrc: "BRMSC2599999", origem: "Web Rádio Samba Brasil", severity: "media", risco_score: 48, data: "2026-05-06", status: "aberta" },
  { id: "div-006", tipo: "Setlist não enviado ao ECAD", descricao: "Show realizado em 2026-03-28 (Festival Lollapalooza) sem setlist enviado dentro do prazo.", obra: undefined, isrc: undefined, origem: "Lollapalooza Brasil", severity: "baixa", risco_score: 31, data: "2026-04-05", status: "aberta" },
];

export const MOCK_DIVERGENCIAS: Divergencia[] = IS_PROD ? [] : _DEV_DIVERGENCIAS;

interface Props {
  divergencias: Divergencia[];
  onResolve?: (div: Divergencia) => void;
  onBulkDelete?: (ids: string[]) => void;
}

type SortKey = "tipo" | "obra" | "isrc" | "origem" | "severity" | "risco_score" | "data" | "status";
type SortDirection = "asc" | "desc";

export function DivergenciasPanel({ divergencias, onResolve, onBulkDelete }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const abertas = divergencias.filter(d => d.status !== "resolvida");
  const sortedDivergencias = useMemo(() => {
    const normalise = (value: unknown) => value ?? "";
    return [...abertas].sort((a, b) => {
      const av = normalise(a[sortKey]);
      const bv = normalise(b[sortKey]);
      if (typeof av === "number" && typeof bv === "number") {
        return sortDirection === "asc" ? av - bv : bv - av;
      }
      const result = String(av).localeCompare(String(bv), "pt-BR", { sensitivity: "base", numeric: true });
      return sortDirection === "asc" ? result : -result;
    });
  }, [abertas, sortDirection, sortKey]);
  const divergenciasPg = usePagination(sortedDivergencias, 10);
  const allSelected = abertas.length > 0 && selectedIds.length === abertas.length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const SortButton = ({ keyName, label, align = "left" }: { keyName: SortKey; label: string; align?: "left" | "right" }) => {
    const active = sortKey === keyName;
    const Icon = !active ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground ${align === "right" ? "justify-end" : ""}`}
        onClick={() => handleSort(keyName)}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : abertas.map((d) => d.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onBulkDelete?.(selectedIds);
    setSelectedIds([]);
  };

  if (abertas.length === 0) {
    return (
      <>
        <ListSectionHeader
          title="Painel de Divergências"
          count={0}
          description="Inconsistências detectadas entre execuções monitoradas e relatórios ECAD"
        />
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle className="h-10 w-10 mb-3 text-success opacity-60" />
        <p className="text-sm font-medium">Nenhuma divergência aberta</p>
        <p className="text-xs mt-1">Todas as execuções estão conciliadas corretamente</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ListSectionHeader
        title="Painel de Divergências"
        count={abertas.length}
        description="Inconsistências detectadas entre execuções monitoradas e relatórios ECAD"
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {selectedIds.length > 0 && onBulkDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleBulkDelete}
                data-testid="button-delete-selected-divergencias"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir selecionadas
              </Button>
            )}
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Selecionar todas as divergências"
              data-testid="checkbox-select-all-divergencias"
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.length > 0 ? `${selectedIds.length} selecionada(s)` : "Selecionar todos"}
            </span>
          </div>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead><SortButton keyName="tipo" label="Tipo" /></TableHead>
            <TableHead><SortButton keyName="obra" label="Obra" /></TableHead>
            <TableHead><SortButton keyName="isrc" label="ISRC" /></TableHead>
            <TableHead><SortButton keyName="origem" label="Origem" /></TableHead>
            <TableHead><SortButton keyName="severity" label="Severidade" /></TableHead>
            <TableHead><SortButton keyName="risco_score" label="Risco" /></TableHead>
            <TableHead><SortButton keyName="data" label="Data" /></TableHead>
            <TableHead><SortButton keyName="status" label="Status" /></TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {divergenciasPg.pageItems.map((div) => {
            const cfg = SEVERITY_CONFIG[div.severity];
            return (
              <TableRow key={div.id} data-testid={`row-divergencia-${div.id}`} className={selectedIds.includes(div.id) ? "bg-muted/20" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(div.id)}
                    onCheckedChange={() => toggleSelect(div.id)}
                    aria-label={`Selecionar divergência ${div.tipo}`}
                    data-testid={`checkbox-divergencia-${div.id}`}
                  />
                </TableCell>
                <TableCell>
                  <p className="max-w-[260px] truncate font-medium">{div.tipo}</p>
                  <p className="max-w-[320px] truncate text-xs text-muted-foreground">{div.descricao}</p>
                </TableCell>
                <TableCell className="text-sm">{div.obra || "—"}</TableCell>
                <TableCell className="text-sm">{div.isrc || "—"}</TableCell>
                <TableCell className="text-sm">{div.origem || "—"}</TableCell>
                <TableCell>
                  <Badge variant={cfg.variant} className="gap-1">{cfg.icon}{cfg.label}</Badge>
                </TableCell>
                <TableCell className="text-sm">Risco {div.risco_score}/100</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{formatRightsDate(div.data)}</TableCell>
                <TableCell>
                  {div.status === "em_resolucao" ? <Badge variant="info">Em resolução</Badge> : <Badge variant="warning">Aberta</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8"
                    onClick={() => onResolve?.(div)}
                  >
                    Resolver <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        total={divergenciasPg.total}
        page={divergenciasPg.page}
        pageSize={divergenciasPg.pageSize}
        onPageChange={divergenciasPg.setPage}
        onPageSizeChange={divergenciasPg.setPageSize}
        itemLabel="divergências"
      />
    </>
  );
}
