import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Upload, Download, Activity,
  CheckCircle2, AlertTriangle, Users,
  Music, FileText, Radio, Scale, Trash2, Truck, Share, FileSignature,
  ArrowLeftRight, Calculator, Receipt, Calendar, Package,
  Contact, UserPlus, Briefcase, Megaphone,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ImportEngine } from "../components/ImportEngine";
import { ExportEngine } from "../components/ExportEngine";
import { REPORT_OVERVIEW_KPIS } from "../services/mock-data";

// ─── Module list ───────────────────────────────────────────────────────────────
interface ModuleEntry {
  id: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODULE_LIST: ModuleEntry[] = [
  { id: "artistas",       label: "Artistas",               sub: "Perfis, contratos, histórico",                             icon: Users          },
  { id: "projetos",       label: "Projetos",               sub: "Álbuns, EPs, singles, timelines",                          icon: FileText       },
  { id: "obras",          label: "Registro de Obras",      sub: "Obras musicais, compositores, ISWC",                       icon: Music          },
  { id: "fonogramas",     label: "Registro de Fonogramas", sub: "Fonogramas, ISRC, masters",                                icon: Radio          },
  { id: "monitoramento",  label: "Monitoramento",          sub: "ECAD, execuções, relatórios",                              icon: Activity       },
  { id: "licenciamento",  label: "Licenciamento",          sub: "Licenças, sincronias, autorizações",                       icon: Scale          },
  { id: "takedowns",      label: "Takedowns",              sub: "Solicitações, plataformas, status",                        icon: Trash2         },
  { id: "distribuicao",   label: "Distribuição",           sub: "Plataformas digitais, DSPs, releases",                     icon: Truck          },
  { id: "gestao-shares",  label: "Gestão de Shares",       sub: "Participações, splits, percentuais",                       icon: Share          },
  { id: "contratos",      label: "Contratos",              sub: "Templates, assinaturas, vencimentos",                      icon: FileSignature  },
  { id: "transacoes",     label: "Transações",             sub: "Receitas, despesas, OFX, conciliação",                     icon: ArrowLeftRight },
  { id: "contabilidade",  label: "Contabilidade",          sub: "P&L, fluxo de caixa, recoupment",                         icon: Calculator     },
  { id: "nota-fiscal",    label: "Nota Fiscal",            sub: "Emissão, NFS-e, NF-e, histórico",                         icon: Receipt        },
  { id: "agenda",         label: "Agenda",                 sub: "Shows, eventos, compromissos",                             icon: Calendar       },
  { id: "inventario",     label: "Inventário",             sub: "Equipamentos, patrimônio, controle",                       icon: Package        },
  { id: "crm",            label: "CRM",                    sub: "Contatos, clientes, relacionamento",                       icon: Contact        },
  { id: "leads",          label: "Leads",                  sub: "Pipeline, Kanban, oportunidades",                          icon: UserPlus       },
  { id: "rh",             label: "Recursos Humanos",       sub: "Funcionários, folha, férias, docs",                        icon: Briefcase      },
  { id: "marketing",      label: "Marketing",              sub: "Campanhas · Calendário · Briefings · Tarefas · IA Criativa", icon: Megaphone   },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const kpis = [
    { label: "Importações",          value: String(REPORT_OVERVIEW_KPIS.totalImports),         icon: Upload,        color: "text-primary",     bg: "bg-primary/10" },
    { label: "Exportações",          value: String(REPORT_OVERVIEW_KPIS.totalExports),         icon: Download,      color: "text-success",     bg: "bg-success/10" },
    { label: "Erros de importação",  value: String(REPORT_OVERVIEW_KPIS.importErrors),         icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Taxa de sucesso",      value: `${REPORT_OVERVIEW_KPIS.successRate}%`,            icon: CheckCircle2,  color: "text-success",     bg: "bg-success/10" },
    { label: "Registros importados", value: String(REPORT_OVERVIEW_KPIS.totalRecordsImported), icon: Upload,        color: "text-primary",     bg: "bg-primary/10" },
    { label: "Registros exportados", value: String(REPORT_OVERVIEW_KPIS.totalRecordsExported), icon: Download,      color: "text-success",     bg: "bg-success/10" },
  ];

  return (
    <MainLayout
      title="Relatórios"
      subtitle="Central de importações e exportações por módulo"
    >
      <div className="space-y-4">
        {/* KPI cards */}
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

        {/* Module list */}
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
                      onClick={() => setImportOpen(true)}
                      data-testid={`btn-import-${mod.id}`}
                    >
                      <Upload className="h-3 w-3" /> Importar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setExportOpen(true)}
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

      <ImportEngine open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportEngine open={exportOpen} onClose={() => setExportOpen(false)} />
    </MainLayout>
  );
}
