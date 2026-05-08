import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  LayoutDashboard, Upload, Download, Activity,
  DollarSign, CheckCircle2,
  AlertTriangle, BarChart2, TrendingUp, Users, Eye, Play, Heart,
  MousePointer, Zap, ThumbsUp, MessageCircle, Share2,
  Music, FileText, Radio, Scale, Trash2, Truck, Share, FileSignature,
  ArrowLeftRight, Calculator, Receipt, Calendar, Package,
  Contact, UserPlus, Briefcase, Megaphone,
} from "lucide-react";
import { SiYoutube, SiMeta, SiGoogleads, SiInstagram, SiTiktok } from "react-icons/si";
import { cn } from "@/shared/lib/utils";
import { ImportEngine } from "../components/ImportEngine";
import { ExportEngine } from "../components/ExportEngine";
import {
  MOCK_IMPORT_JOBS,
  MOCK_EXPORT_JOBS,
  REPORT_OVERVIEW_KPIS,
} from "../services/mock-data";
import {
  YOUTUBE_MOCK, YOUTUBE_TOTALS,
  META_ADS_MOCK, GOOGLE_ADS_MOCK,
  INSTAGRAM_MOCK, INSTAGRAM_TOTALS,
  TIKTOK_MOCK, TIKTOK_TOTALS,
  fmtNum, type MonthlyPoint,
} from "@/modules/analytics/data/mockAnalytics";
import { formatCurrency } from "@/shared/lib/format-utils";

type TabId = "visao-geral" | "transferencias" | "analytics";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "visao-geral",    label: "Visão Geral",               icon: LayoutDashboard },
  { id: "transferencias", label: "Importações & Exportações",  icon: Activity },
  { id: "analytics",     label: "Analytics Social",           icon: BarChart2 },
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

// ─── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: MonthlyPoint[]; color: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className={cn("w-full rounded-sm transition-all", color)} style={{ height: `${Math.max(4, (d.value / max) * 40)}px` }} />
          <span className="text-[9px] text-muted-foreground">{d.mes}</span>
        </div>
      ))}
    </div>
  );
}

function KPI({ label, value, icon: Icon, sub }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }>; sub?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-xl font-bold text-foreground font-mono">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ onOpenImport, onOpenExport }: { onOpenImport: () => void; onOpenExport: () => void }) {
  const kpis = [
    { label: "Importações",          value: String(REPORT_OVERVIEW_KPIS.totalImports),          icon: Upload,        color: "text-primary",     bg: "bg-primary/10" },
    { label: "Exportações",          value: String(REPORT_OVERVIEW_KPIS.totalExports),          icon: Download,      color: "text-success",     bg: "bg-success/10" },
    { label: "Erros de importação",  value: String(REPORT_OVERVIEW_KPIS.importErrors),          icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Taxa de sucesso",      value: `${REPORT_OVERVIEW_KPIS.successRate}%`,             icon: CheckCircle2,  color: "text-success",     bg: "bg-success/10" },
    { label: "Registros importados", value: String(REPORT_OVERVIEW_KPIS.totalRecordsImported),  icon: Upload,        color: "text-primary",     bg: "bg-primary/10" },
    { label: "Registros exportados", value: String(REPORT_OVERVIEW_KPIS.totalRecordsExported),  icon: Download,      color: "text-success",     bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-6">
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
  // Group modules by category for visual separation
  const categories = Array.from(new Set(MODULE_LIST.map(m => m.category)));

  return (
    <div className="space-y-3">
      {categories.map(cat => {
        const modules = MODULE_LIST.filter(m => m.category === cat);
        return (
          <div key={cat} className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</p>
            </div>
            <div className="divide-y divide-border/50">
              {modules.map(mod => {
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
        );
      })}
    </div>
  );
}

// ─── Analytics Social Tab ──────────────────────────────────────────────────────
type PlatformId = "overview" | "youtube" | "tiktok" | "instagram" | "meta" | "google";
interface Platform { id: PlatformId; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; bg: string; brandStyle?: React.CSSProperties; }
const PLATFORMS: Platform[] = [
  { id: "overview",  label: "Visão Geral", icon: BarChart2,   color: "text-primary",            bg: "bg-primary/10" },
  { id: "youtube",   label: "YouTube",     icon: SiYoutube,   color: "text-primary",            bg: "bg-primary/10", brandStyle: { background: "linear-gradient(135deg, hsl(217 91% 52%) 0%, hsl(217 91% 40%) 100%)" } },
  { id: "tiktok",    label: "TikTok",      icon: SiTiktok,    color: "text-[hsl(271,91%,65%)]", bg: "bg-[hsl(271,91%,65%)]/10", brandStyle: { background: "linear-gradient(135deg, hsl(271 91% 55%) 0%, hsl(271 91% 40%) 100%)" } },
  { id: "instagram", label: "Instagram",   icon: SiInstagram, color: "text-warning",            bg: "bg-warning/10", brandStyle: { background: "linear-gradient(135deg, hsl(38 92% 44%) 0%, hsl(25 95% 46%) 100%)" } },
  { id: "meta",      label: "Meta Ads",    icon: SiMeta,      color: "text-primary",            bg: "bg-primary/10", brandStyle: { background: "linear-gradient(135deg, hsl(222 47% 28%) 0%, hsl(217 91% 35%) 100%)" } },
  { id: "google",    label: "Google Ads",  icon: SiGoogleads, color: "text-success",            bg: "bg-success/10", brandStyle: { background: "linear-gradient(135deg, hsl(142 76% 30%) 0%, hsl(142 76% 22%) 100%)" } },
];

function SimulatedNotice() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0" />
      <span>Dados simulados para demonstração. Conecte as plataformas em <strong>Configurações → Integrações</strong> para ver métricas reais.</span>
    </div>
  );
}

function AnalyticsSocialTab() {
  const [platform, setPlatform] = useState<PlatformId>("overview");
  const [ytSel, setYtSel] = useState(0);
  const [ttSel, setTtSel] = useState(0);
  const [igSel, setIgSel] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex gap-1 flex-wrap">
        {PLATFORMS.map(p => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap", platform === p.id ? `${p.bg} ${p.color} shadow-sm` : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}
              data-testid={`tab-platform-${p.id}`}
            >
              <Icon className="h-3.5 w-3.5" /> {p.label}
            </button>
          );
        })}
      </div>

      {platform === "overview" && (
        <div className="space-y-4">
          <SimulatedNotice />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {[
              { p: PLATFORMS[1], metrics: [{ label: "Views/mês", value: fmtNum(YOUTUBE_TOTALS.totalViewsMes) }, { label: "Inscritos", value: fmtNum(YOUTUBE_TOTALS.totalSubscribers) }, { label: "Watch hrs", value: fmtNum(YOUTUBE_TOTALS.totalWatchHoursMes) }] },
              { p: PLATFORMS[2], metrics: [{ label: "Seguidores", value: fmtNum(TIKTOK_TOTALS.totalFollowers) }, { label: "Views/mês", value: fmtNum(TIKTOK_TOTALS.totalViewsMes) }, { label: "Eng.", value: `${TIKTOK_TOTALS.avgEngagement}%` }] },
              { p: PLATFORMS[3], metrics: [{ label: "Seguidores", value: fmtNum(INSTAGRAM_TOTALS.totalFollowers) }, { label: "Alcance/mês", value: fmtNum(INSTAGRAM_TOTALS.totalAlcanceMes) }, { label: "Eng.", value: `${INSTAGRAM_TOTALS.avgEngagement}%` }] },
              { p: PLATFORMS[4], metrics: [{ label: "Impressões", value: fmtNum(META_ADS_MOCK.mes.impressoes) }, { label: "Cliques", value: fmtNum(META_ADS_MOCK.mes.cliques) }, { label: "CTR", value: `${META_ADS_MOCK.mes.ctr}%` }] },
              { p: PLATFORMS[5], metrics: [{ label: "Impressões", value: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes) }, { label: "Cliques", value: fmtNum(GOOGLE_ADS_MOCK.mes.cliques) }, { label: "Conversões", value: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes) }] },
            ].map(({ p, metrics }) => {
              const Icon = p.icon;
              return (
                <Card key={p.id} className="border-border overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between gap-2" style={p.brandStyle ?? { background: "hsl(var(--primary)/0.15)" }}>
                    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-white drop-shadow-sm" /><CardTitle className="text-sm font-semibold text-white drop-shadow-sm">{p.label}</CardTitle></div>
                    <Badge className="text-[9px] px-1.5 py-0 bg-black/20 text-white border-white/20 border">Simulado</Badge>
                  </div>
                  <CardContent className="px-4 pb-4 pt-3 grid grid-cols-3 gap-3">
                    {metrics.map(m => (<div key={m.label}><p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</p><p className="text-sm font-bold font-mono text-foreground">{m.value}</p></div>))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {platform === "youtube" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="flex gap-2 flex-wrap">
            {YOUTUBE_MOCK.map((a, i) => <button key={a.artistaId} onClick={() => setYtSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", ytSel === i ? "bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Inscritos", v: fmtNum(YOUTUBE_MOCK[ytSel].subscribers), i: Users }, { l: "Views/Mês", v: fmtNum(YOUTUBE_MOCK[ytSel].viewsMes), i: Eye }, { l: "Watch Hrs", v: fmtNum(YOUTUBE_MOCK[ytSel].watchHoursMes), i: Play }, { l: "Vídeos", v: String(YOUTUBE_MOCK[ytSel].videosPublicados), i: Play }].map(k => <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader><CardContent className="pt-0 space-y-2">{YOUTUBE_MOCK[ytSel].topVideos.map((v, i) => { const max = YOUTUBE_MOCK[ytSel].topVideos[0].views; return (<div key={i} className="space-y-1"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span><span className="text-xs font-medium truncate max-w-[160px]">{v.titulo}</span></div><span className="text-xs font-mono text-[#FF0000] shrink-0">{fmtNum(v.views)}</span></div><div className="h-1 bg-muted rounded-full overflow-hidden ml-6"><div className="h-full bg-[#FF0000]/50 rounded-full" style={{ width: `${(v.views / max) * 100}%` }} /></div></div>); })}</CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Views Mensais — 6 meses</CardTitle></CardHeader><CardContent className="pt-0"><MiniBarChart data={YOUTUBE_MOCK[ytSel].evolution} color="bg-[#FF0000]/60" /></CardContent></Card>
          </div>
        </div>
      )}

      {platform === "tiktok" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="flex gap-2 flex-wrap">
            {TIKTOK_MOCK.map((a, i) => <button key={a.artistaId} onClick={() => setTtSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", ttSel === i ? "bg-foreground/10 text-foreground border border-foreground/20" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Seguidores", v: fmtNum(TIKTOK_MOCK[ttSel].followers), i: Users }, { l: "Views/Mês", v: fmtNum(TIKTOK_MOCK[ttSel].viewsMes), i: Eye }, { l: "Vídeos/Mês", v: String(TIKTOK_MOCK[ttSel].videosMes), i: Play }, { l: "Engajamento", v: `${TIKTOK_MOCK[ttSel].engagementRate}%`, i: TrendingUp }].map(k => <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Top Vídeos</CardTitle></CardHeader><CardContent className="pt-0 space-y-3">{TIKTOK_MOCK[ttSel].topVideos.map((v, i) => { const max = TIKTOK_MOCK[ttSel].topVideos[0].views; return (<div key={i} className="space-y-1"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span><span className="text-xs font-medium truncate">{v.descricao}</span></div><span className="text-xs font-mono text-foreground shrink-0">{fmtNum(v.views)}</span></div><div className="h-1 bg-muted rounded-full overflow-hidden ml-6"><div className="h-full bg-foreground/40 rounded-full" style={{ width: `${(v.views / max) * 100}%` }} /></div><div className="flex gap-3 ml-6 text-[10px] text-muted-foreground"><span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{fmtNum(v.curtidas)}</span><span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{fmtNum(v.comentarios)}</span><span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />{fmtNum(v.compartilhamentos)}</span></div></div>); })}</CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Views Mensais — 6 meses</CardTitle></CardHeader><CardContent className="pt-0"><MiniBarChart data={TIKTOK_MOCK[ttSel].evolution} color="bg-foreground/50" /></CardContent></Card>
          </div>
        </div>
      )}

      {platform === "instagram" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="flex gap-2 flex-wrap">
            {INSTAGRAM_MOCK.map((a, i) => <button key={a.artistaId} onClick={() => setIgSel(i)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", igSel === i ? "bg-[#E1306C]/15 text-[#E1306C] border border-[#E1306C]/30" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>{a.nome}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Seguidores", v: fmtNum(INSTAGRAM_MOCK[igSel].followers), i: Users }, { l: "Alcance/Mês", v: fmtNum(INSTAGRAM_MOCK[igSel].alcanceMes), i: Eye }, { l: "Reels/Mês", v: String(INSTAGRAM_MOCK[igSel].reelsMes), i: Play }, { l: "Engajamento", v: `${INSTAGRAM_MOCK[igSel].engagementRate}%`, i: Heart }].map(k => <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>)}
          </div>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Crescimento de Seguidores — 6 meses</CardTitle></CardHeader><CardContent className="pt-0"><MiniBarChart data={INSTAGRAM_MOCK[igSel].evolution} color="bg-[#E1306C]/60" /></CardContent></Card>
        </div>
      )}

      {platform === "meta" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Impressões", v: fmtNum(META_ADS_MOCK.mes.impressoes), i: Eye }, { l: "Alcance", v: fmtNum(META_ADS_MOCK.mes.alcance), i: Users }, { l: "Cliques", v: fmtNum(META_ADS_MOCK.mes.cliques), i: MousePointer }, { l: "Investimento", v: formatCurrency(META_ADS_MOCK.mes.spend), i: DollarSign }].map(k => <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>)}
          </div>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader><CardContent className="pt-0"><MiniBarChart data={META_ADS_MOCK.evolution} color="bg-[#0082FB]/60" /></CardContent></Card>
        </div>
      )}

      {platform === "google" && (
        <div className="space-y-5">
          <SimulatedNotice />
          <div className="grid gap-4 sm:grid-cols-4">
            {[{ l: "Impressões", v: fmtNum(GOOGLE_ADS_MOCK.mes.impressoes), i: Eye }, { l: "Cliques", v: fmtNum(GOOGLE_ADS_MOCK.mes.cliques), i: MousePointer }, { l: "Conversões", v: fmtNum(GOOGLE_ADS_MOCK.mes.conversoes), i: TrendingUp }, { l: "Investimento", v: formatCurrency(GOOGLE_ADS_MOCK.mes.spend), i: DollarSign }].map(k => <Card key={k.l}><CardContent className="p-4"><KPI label={k.l} value={k.v} icon={k.i} /></CardContent></Card>)}
          </div>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Impressões Mensais — 6 meses</CardTitle></CardHeader><CardContent className="pt-0"><MiniBarChart data={GOOGLE_ADS_MOCK.evolution} color="bg-success/60" /></CardContent></Card>
        </div>
      )}
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
        {tab === "analytics"      && <AnalyticsSocialTab />}
      </div>

      <ImportEngine open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportEngine open={exportOpen} onClose={() => setExportOpen(false)} />
    </MainLayout>
  );
}
