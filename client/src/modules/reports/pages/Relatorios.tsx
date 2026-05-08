import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  LayoutDashboard, Upload, Download, Activity,
  CheckCircle2, AlertTriangle, Users,
  Music, FileText, Radio, Scale, Trash2, Truck, Share, FileSignature,
  ArrowLeftRight, Calculator, Receipt, Calendar, Package,
  Contact, UserPlus, Briefcase, Megaphone,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ImportEngine } from "../components/ImportEngine";
import { ExportEngine } from "../components/ExportEngine";
import {
  MOCK_IMPORT_JOBS,
  MOCK_EXPORT_JOBS,
  REPORT_OVERVIEW_KPIS,
} from "../services/mock-data";

type TabId = "visao-geral" | "transferencias";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "visao-geral",    label: "Visão Geral",               icon: LayoutDashboard },
  { id: "transferencias", label: "Importações & Exportações",  icon: Activity },
];

// ─── Module list for transfers tab ────────────────────────────────────────────
interface ModuleEntry {
  id: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const MODULE_LIST: ModuleEntry[] = [
  { id: "artistas",       label: "Artistas",             sub: "Perfis, contratos, histórico",          icon: Users,          category: "Artistas" },
  { id: "projetos",       label: "Projetos",             sub: "Álbuns, EPs, singles, timelines",       icon: FileText,       category: "Produção" },
  { id: "obras",          label: "Registro de Obras",    sub: "Obras musicais, compositores, ISWC",    icon: Music,          category: "Catálogo" },
  { id: "fonogramas",     label: "Registro de Fonogramas", sub: "Fonogramas, ISRC, masters",          icon: Radio,          category: "Catálogo" },
  { id: "monitoramento",  label: "Monitoramento",        sub: "ECAD, execuções, relatórios",           icon: Activity,       category: "Direitos" },
  { id: "licenciamento",  label: "Licenciamento",        sub: "Licenças, sincronias, autorizações",    icon: Scale,          category: "Direitos" },
  { id: "takedowns",      label: "Takedowns",            sub: "Solicitações, plataformas, status",     icon: Trash2,         category: "Direitos" },
  { id: "distribuicao",   label: "Distribuição",         sub: "Plataformas digitais, DSPs, releases",  icon: Truck,          category: "Lançamentos" },
  { id: "gestao-shares",  label: "Gestão de Shares",     sub: "Participações, splits, percentuais",    icon: Share,          category: "Lançamentos" },
  { id: "contratos",      label: "Contratos",            sub: "Templates, assinaturas, vencimentos",   icon: FileSignature,  category: "Jurídico" },
  { id: "transacoes",     label: "Transações",           sub: "Receitas, despesas, OFX, conciliação",  icon: ArrowLeftRight, category: "Financeiro" },
  { id: "contabilidade",  label: "Contabilidade",        sub: "P&L, fluxo de caixa, recoupment",      icon: Calculator,     category: "Financeiro" },
  { id: "nota-fiscal",    label: "Nota Fiscal",          sub: "Emissão, NFS-e, NF-e, histórico",      icon: Receipt,        category: "Financeiro" },
  { id: "agenda",         label: "Agenda",               sub: "Shows, eventos, compromissos",          icon: Calendar,       category: "Operações" },
  { id: "inventario",     label: "Inventário",           sub: "Equipamentos, patrimônio, controle",    icon: Package,        category: "Operações" },
  { id: "crm",            label: "CRM",                  sub: "Contatos, clientes, relacionamento",    icon: Contact,        category: "Comercial" },
  { id: "leads",          label: "Leads",                sub: "Pipeline, Kanban, oportunidades",       icon: UserPlus,       category: "Comercial" },
  { id: "rh",             label: "Recursos Humanos",     sub: "Funcionários, folha, férias, docs",     icon: Briefcase,      category: "Operações" },
  { id: "marketing",      label: "Marketing",            sub: "Campanhas · Calendário · Briefings · Tarefas · IA Criativa", icon: Megaphone, category: "Marketing" },
];

const STATUS_IMPORT: Record<string, { label: string; cls: string }> = {
  done:      { label: "Concluído",    cls: "bg-success/15 text-success border-success/30" },
  error:     { label: "Erro",         cls: "bg-destructive/15 text-destructive border-destructive/30" },
  importing: { label: "Em andamento", cls: "bg-primary/15 text-primary border-primary/30" },
  idle:      { label: "Aguardando",   cls: "bg-muted text-muted-foreground border-border" },
};
const STATUS_EXPORT: Record<string, { label: string; cls: string }> = {
  done:      { label: "Concluído", cls: "bg-success/15 text-success border-success/30" },
  error:     { label: "Erro",      cls: "bg-destructive/15 text-destructive border-destructive/30" },
  generating:{ label: "Gerando",   cls: "bg-primary/15 text-primary border-primary/30" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ onOpenImport, onOpenExport }: { onOpenImport: () => void; onOpenExport: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Importações recentes</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenImport} data-testid="overview-btn-import">
              <Upload className="h-3 w-3 mr-1" /> Nova importação
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {MOCK_IMPORT_JOBS.slice(0, 4).map(j => {
              const sc = STATUS_IMPORT[j.status] ?? STATUS_IMPORT.idle;
              return (
                <div key={j.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{j.filename}</p>
                    <p className="text-[10px] text-muted-foreground">{j.module} · {j.processedRows}/{j.totalRows} registros</p>
                  </div>
                  <Badge className={cn("text-[10px] border shrink-0", sc.cls)}>{sc.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4 text-success" /> Exportações recentes</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenExport} data-testid="overview-btn-export">
              <Download className="h-3 w-3 mr-1" /> Nova exportação
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {MOCK_EXPORT_JOBS.slice(0, 4).map(j => {
              const sc = STATUS_EXPORT[j.status] ?? STATUS_EXPORT.done;
              return (
                <div key={j.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{j.filename}</p>
                    <p className="text-[10px] text-muted-foreground">{j.module} · {j.totalRows} registros · {j.format.toUpperCase()}</p>
                  </div>
                  <Badge className={cn("text-[10px] border shrink-0", sc.cls)}>{sc.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Importações & Exportações Tab — lista de módulos ─────────────────────────
function TransferenciasTab({ onOpenImport, onOpenExport }: { onOpenImport: () => void; onOpenExport: () => void }) {
  const kpis = [
    { label: "Importações",          value: String(REPORT_OVERVIEW_KPIS.totalImports),         icon: Upload,        color: "text-primary",     bg: "bg-primary/10" },
    { label: "Exportações",          value: String(REPORT_OVERVIEW_KPIS.totalExports),         icon: Download,      color: "text-success",     bg: "bg-success/10" },
    { label: "Erros de importação",  value: String(REPORT_OVERVIEW_KPIS.importErrors),         icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Taxa de sucesso",      value: `${REPORT_OVERVIEW_KPIS.successRate}%`,            icon: CheckCircle2,  color: "text-success",     bg: "bg-success/10" },
    { label: "Registros importados", value: String(REPORT_OVERVIEW_KPIS.totalRecordsImported), icon: Upload,        color: "text-primary",     bg: "bg-primary/10" },
    { label: "Registros exportados", value: String(REPORT_OVERVIEW_KPIS.totalRecordsExported), icon: Download,      color: "text-success",     bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", k.bg)}>
                  <Icon className={cn("h-4 w-4", k.color)} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                  <p className="text-xl font-bold font-mono text-foreground">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="divide-y divide-border/50">
          {MODULE_LIST.map(mod => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
                data-testid={`module-row-${mod.id}`}
              >
                <div className="p-1.5 rounded-md bg-muted shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{mod.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{mod.sub}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={onOpenImport}
                    data-testid={`btn-import-${mod.id}`}
                  >
                    <Upload className="h-3 w-3" /> Importar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={onOpenExport}
                    data-testid={`btn-export-${mod.id}`}
                  >
                    <Download className="h-3 w-3" /> Exportar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [tab, setTab] = useState<TabId>("visao-geral");
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <MainLayout
      title="Relatórios"
      subtitle="Central de relatórios, importações, exportações e analytics social"
    >
      <div className="space-y-6">
        {/* Tabs — pill style, no underline */}
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                data-testid={`tab-${t.id}`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "visao-geral"    && <OverviewTab onOpenImport={() => setImportOpen(true)} onOpenExport={() => setExportOpen(true)} />}
        {tab === "transferencias" && <TransferenciasTab onOpenImport={() => setImportOpen(true)} onOpenExport={() => setExportOpen(true)} />}
      </div>

      <ImportEngine open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportEngine open={exportOpen} onClose={() => setExportOpen(false)} />
    </MainLayout>
  );
}
