import { useState } from "react";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { ESPECIALIDADES_LABELS } from "@/modules/artist/mappers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Progress } from "@/shared/ui/progress";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import {
  Music,
  Disc,
  Rocket,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  Target,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Building,
  Share2,
  TrendingUp,
  History,
  Globe,
  Mic,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  Zap,
  Users,
  Award,
  Lightbulb,
  BarChart3,
  ImageIcon,
  Video,
  Briefcase,
  Headphones,
  Link2,
} from "lucide-react";
import { ArtistaEvolucaoSection } from "@/modules/artist/components/ArtistaEvolucaoSection";
import { PlatformMiniTrend } from "@/modules/artist/components/PlatformMiniTrend";
import { ArtistaPlatformMetrics } from "@/modules/artist/components/ArtistaPlatformMetrics";

const formatDateDMY = (d?: string | null): string => {
  if (!d) return "Não informado";
  if (/^\d{2}-\d{2}-\d{4}$/.test(d)) return d;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d.replace(/\//g, "-");
  const datePart = d.split("T")[0];
  const parts = datePart.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  }
  return d;
};

const estagiosCarreira = [
  { nivel: 1, nome: "Iniciante", descricao: "Começando a carreira musical" },
  { nivel: 2, nome: "Emergente", descricao: "Construindo uma base de fãs" },
  {
    nivel: 3,
    nome: "Em Desenvolvimento",
    descricao: "Ganhando tração no mercado",
  },
  {
    nivel: 4,
    nome: "Promissor",
    descricao: "Potencial reconhecido pela indústria",
  },
  {
    nivel: 5,
    nome: "Estabelecido",
    descricao: "Presença consolidada no mercado",
  },
  {
    nivel: 6,
    nome: "Sustentável",
    descricao: "Receita recorrente e base de fãs leal",
  },
  { nivel: 7, nome: "Influente", descricao: "Referência no gênero musical" },
  { nivel: 8, nome: "Dominante", descricao: "Liderança no mercado nacional" },
  { nivel: 9, nome: "Elite", descricao: "Top do mercado brasileiro" },
  { nivel: 10, nome: "Lendário", descricao: "Ícone da música brasileira" },
];

function CircularProgress({
  value,
  label,
  sublabel,
  color = "teal",
  badge,
}: {
  value: number;
  label: string;
  sublabel?: string;
  color?: "teal" | "green" | "amber" | "red";
  badge?: { text: string; variant: "high" | "medium" | "low" };
}) {
  const colors = {
    teal: { stroke: "stroke-teal-500", text: "text-teal-500" },
    green: { stroke: "stroke-success", text: "text-success" },
    amber: { stroke: "stroke-[hsl(var(--warning))]", text: "text-warning" },
    /* intentional: SVG stroke for donut chart — CSS var cannot drive SVG stroke directly */
    red: { stroke: "stroke-red-500", text: "text-red-500" },
  };

  const badgeColors = {
    high: "bg-success text-success-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-destructive text-white",
  };

  const c = colors[color];
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      {badge && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${badgeColors[badge.variant]}`}
        >
          {badge.text}
        </span>
      )}
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={6}
            className="text-muted/20"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={c.stroke}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-lg ${c.text}`}>{value}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
      {sublabel && (
        <span className="text-[10px] text-muted-foreground text-center max-w-[70px] truncate">
          {sublabel}
        </span>
      )}
    </div>
  );
}
import { formatCurrency } from "@/shared/lib/format-utils";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useMetas } from "@/modules/marketing/hooks/useMetas";
import {
  useContratos,
  type ContratoWithRelations,
} from "@/modules/contracts/hooks/useContratos";
import { useTransacoes } from "@/modules/accounting/hooks/useTransacoes";
import {
  ContratoStatusBadge,
  getContratoSituacao,
} from "@/modules/contracts/components/ContratoStatusBadge";

interface Meta {
  id: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoria: string;
  valorMeta: number;
  valorAtual: number;
  unidade: string;
  dataInicio: string;
  dataFim: string;
  status: "em_progresso" | "concluida" | "pausada" | "cancelada";
}

interface ArtistaVisao360ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artista?: any;
}

const getHistoricoIcon = (tipo: string) => {
  switch (tipo) {
    case "criacao":
      return <Plus className="h-4 w-4" />;
    case "edicao":
      return <Edit className="h-4 w-4" />;
    case "obra":
      return <Music className="h-4 w-4" />;
    case "contrato":
      return <FileText className="h-4 w-4" />;
    case "financeiro":
      return <DollarSign className="h-4 w-4" />;
    case "exclusao":
      return <Trash2 className="h-4 w-4" />;
    case "status":
      return <Zap className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getHistoricoBadge = (tipo: string) => {
  switch (tipo) {
    case "criacao":
      return <Badge className="bg-success text-[#000000]">Criação</Badge>;
    case "edicao":
      return <Badge className="bg-blue-600 text-[#ffffff]">Edição</Badge>;
    case "obra":
      return <Badge className="bg-purple-600">Obra</Badge>;
    case "contrato":
      return (
        <Badge className="bg-warning text-warning-foreground">Contrato</Badge>
      );
    case "financeiro":
      return <Badge className="bg-emerald-600">Financeiro</Badge>;
    case "exclusao":
      return <Badge variant="destructive">Exclusão</Badge>;
    case "status":
      return <Badge className="bg-primary">Status</Badge>;
    default:
      return <Badge variant="secondary">Outro</Badge>;
  }
};

const tiposMeta = [
  { value: "streams", label: "Streams" },
  { value: "seguidores", label: "Seguidores" },
  { value: "lancamentos", label: "Lançamentos" },
  { value: "receita", label: "Receita" },
  { value: "eventos", label: "Shows/Eventos" },
  { value: "outros", label: "Outros" },
];

const categoriasMeta = [
  { value: "crescimento", label: "Crescimento" },
  { value: "financeiro", label: "Financeiro" },
  { value: "producao", label: "Produção" },
  { value: "marketing", label: "Marketing" },
  { value: "carreira", label: "Carreira" },
];

const statusMeta = [
  { value: "em_progresso", label: "Em Progresso", color: "bg-warning" },
  { value: "concluida", label: "Concluída", color: "bg-success" },
  { value: "pausada", label: "Pausada", color: "bg-gray-500" },
  { value: "cancelada", label: "Cancelada", color: "bg-destructive" },
];

export function ArtistaVisao360Modal({
  open,
  onOpenChange,
  artista,
}: ArtistaVisao360ModalProps) {
  const { obras } = useObras();
  const { fonogramas } = useFonogramas();
  const { lancamentos } = useLancamentos();
  const { projetos } = useProjetos();
  const {
    metas: metasList,
    addMeta,
    updateMeta,
    deleteMeta,
    getProgressPercent: calcProgress,
  } = useMetas();
  const { contratos } = useContratos();
  const { transacoes } = useTransacoes();

  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);

  // Filter data by artista_id
  const artistaId = artista?.id;
  const obrasReais = obras.filter((o: any) => o.artista_id === artistaId);
  const fonogramasReais = fonogramas.filter(
    (f: any) => f.artista_id === artistaId,
  );
  const lancamentosReais = lancamentos.filter(
    (l: any) => l.artista_id === artistaId,
  );
  const projetosReais = projetos.filter((p: any) => p.artista_id === artistaId);
  const metasReais = metasList.filter((m: any) => m.artista_id === artistaId);
  const contratosReais: ContratoWithRelations[] = contratos.filter(
    (c) => c.artista_id === artistaId,
  );
  const transacoesArtista = transacoes.filter(
    (t) => t.artista_id === artistaId,
  );

  // ── Financeiro real ──────────────────────────────────────────────────
  const receitasTotal = transacoesArtista
    .filter((t) => t.tipo === "receita" && t.status === "pago")
    .reduce((sum, t) => sum + (t.valor ?? 0), 0);
  const despesasTotal = transacoesArtista
    .filter((t) => t.tipo === "despesa" && t.status === "pago")
    .reduce((sum, t) => sum + (t.valor ?? 0), 0);
  const saldoTotal = receitasTotal - despesasTotal;
  const pendentesTotal = transacoesArtista
    .filter((t) => t.status === "pendente" || t.status === "a_receber")
    .reduce((sum, t) => sum + (t.valor ?? 0), 0);

  // ── Métricas de contratos ────────────────────────────────────────────
  const today = new Date();
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const ATIVOS_STATUS = ["assinado", "vigente"];
  const contratosAtivos = contratosReais.filter((c) =>
    ATIVOS_STATUS.includes(c.status ?? ""),
  ).length;
  const contratosVencendo = contratosReais.filter((c) => {
    if (!c.data_fim || !ATIVOS_STATUS.includes(c.status ?? "")) return false;
    const fim = new Date(c.data_fim);
    return fim > today && fim <= in60Days;
  }).length;

  // ── Histórico derivado de dados reais ────────────────────────────────
  const historicoReal: {
    id: string;
    tipo: string;
    descricao: string;
    data: string;
    usuario: string;
  }[] = [];
  if (artista?.created_at) {
    historicoReal.push({
      id: "criacao",
      tipo: "criacao",
      descricao: "Artista cadastrado no sistema",
      data: artista.created_at,
      usuario: "Admin",
    });
  }
  contratosReais.forEach((c) => {
    if (c.created_at)
      historicoReal.push({
        id: `ctr-${c.id}`,
        tipo: "contrato",
        descricao: `Contrato assinado: ${c.titulo}`,
        data: c.created_at,
        usuario: "Admin",
      });
  });
  obrasReais.slice(0, 5).forEach((o: any) => {
    if (o.created_at)
      historicoReal.push({
        id: `obra-${o.id}`,
        tipo: "obra",
        descricao: `Obra registrada: ${o.titulo}`,
        data: o.created_at,
        usuario: "Produtor",
      });
  });
  lancamentosReais.slice(0, 5).forEach((l: any) => {
    if (l.created_at)
      historicoReal.push({
        id: `lanc-${l.id}`,
        tipo: "obra",
        descricao: `Lançamento registrado: ${l.titulo}`,
        data: l.created_at,
        usuario: "Admin",
      });
  });
  transacoesArtista.slice(0, 3).forEach((t) => {
    if (t.created_at)
      historicoReal.push({
        id: `txn-${t.id}`,
        tipo: "financeiro",
        descricao: t.descricao,
        data: t.created_at,
        usuario: "Financeiro",
      });
  });
  // Status-change events derivados do status atual do artista
  const STATUS_LABELS: Record<string, string> = {
    contratado: "Artista contratado",
    em_negociacao: "Negociação iniciada",
    onboarding: "Artista em processo de onboarding",
    inativo: "Artista inativado",
    suspenso: "Artista suspenso",
  };
  if (
    artista?.status &&
    artista.status !== "contratado" &&
    artista.updated_at
  ) {
    const label =
      STATUS_LABELS[artista.status] ??
      `Status alterado para: ${artista.status}`;
    historicoReal.push({
      id: `status-${artista.status}`,
      tipo: "status",
      descricao: label,
      data: artista.updated_at,
      usuario: "Admin",
    });
  }
  historicoReal.sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  );

  // Tendência da evolução (Task #361): chips de "↑/↓/—" nos cards de
  // plataforma do dashboard 360 reusam os mesmos snapshots diários
  // (`record_artista_metric_snapshot`) já consumidos pela aba "Evolução".
  // Os hooks só disparam a query quando o artista tem ID configurado para
  // a plataforma — assim evita chamadas inúteis para perfis não vinculados.

  const [metaForm, setMetaForm] = useState({
    titulo: "",
    descricao: "",
    tipo: "",
    categoria: "",
    valorMeta: "",
    valorAtual: "",
    unidade: "",
    dataInicio: "",
    dataFim: "",
    status: "em_progresso" as Meta["status"],
  });

  if (!artista) return null;

  const resetForm = () => {
    setMetaForm({
      titulo: "",
      descricao: "",
      tipo: "",
      categoria: "",
      valorMeta: "",
      valorAtual: "",
      unidade: "",
      dataInicio: "",
      dataFim: "",
      status: "em_progresso",
    });
    setEditingMeta(null);
    setShowMetaForm(false);
  };

  const handleSaveMeta = async () => {
    if (!metaForm.titulo || !metaForm.tipo || !metaForm.valorMeta) return;
    const payload = {
      artista_id: artistaId,
      titulo: metaForm.titulo,
      descricao: metaForm.descricao,
      tipo_meta: metaForm.tipo,
      categoria: metaForm.categoria,
      valor_meta: Number(metaForm.valorMeta),
      valor_atual: Number(metaForm.valorAtual) || 0,
      unidade: metaForm.unidade,
      data_inicio: metaForm.dataInicio || null,
      data_fim: metaForm.dataFim || null,
      status: metaForm.status,
    };
    if (editingMeta) {
      await updateMeta(String(editingMeta.id), payload);
    } else {
      await addMeta(payload);
    }
    resetForm();
  };

  const handleEditMeta = (meta: any) => {
    setMetaForm({
      titulo: meta.titulo || meta.tipo_meta || "",
      descricao: meta.descricao || "",
      tipo: meta.tipo_meta || meta.tipo || "",
      categoria: meta.categoria || "",
      valorMeta: String(meta.valor_meta ?? meta.valorMeta ?? ""),
      valorAtual: String(meta.valor_atual ?? meta.valorAtual ?? ""),
      unidade: meta.unidade || "",
      dataInicio: meta.data_inicio || meta.dataInicio || "",
      dataFim: meta.data_fim || meta.dataFim || "",
      status: (meta.status as Meta["status"]) || "em_progresso",
    });
    setEditingMeta(meta);
    setShowMetaForm(true);
  };

  const handleDeleteMeta = async (id: string | number) => {
    await deleteMeta(String(id));
  };

  const metasEmProgresso = metasReais.filter(
    (m) => m.status === "em_progresso",
  ).length;
  const metasConcluidas = metasReais.filter(
    (m) => m.status === "concluida",
  ).length;
  const progressoMedio =
    metasReais.length > 0
      ? Math.round(
          metasReais.reduce((acc, m) => acc + calcProgress(m), 0) /
            metasReais.length,
        )
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        {/* Header com Banner */}
        <div className="border-b border-border">
          {artista.banner_url && (
            <div className="relative h-28 overflow-hidden">
              <img
                src={artista.banner_url}
                alt="Banner do artista"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
          )}
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`h-14 w-14 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-white shrink-0 ${artista.banner_url ? "-mt-8 ring-4 ring-background" : ""}`}
                >
                  {artista.foto_url ? (
                    <img
                      src={artista.foto_url}
                      alt={artista.nome_artistico}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    artista.nome_artistico?.[0] || "A"
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {artista.nome_artistico}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-muted">
                      {artista.genero_musical || "Não informado"}
                    </Badge>
                    {artista.status === "onboarding" ? (
                      <Badge className="bg-warning text-warning-foreground">
                        Onboarding
                      </Badge>
                    ) : (
                      (() => {
                        const ATIVO_S = new Set([
                          "ativo",
                          "assinado",
                          "vigente",
                          "vencendo",
                        ]);
                        const isExclusivo = contratosReais.some(
                          (c) =>
                            c.exclusivo === true &&
                            ATIVO_S.has((c.status || "").toLowerCase()),
                        );
                        return isExclusivo ? (
                          <Badge className="bg-success hover:bg-success text-success-foreground">
                            Artista exclusivo
                          </Badge>
                        ) : (
                          <Badge className="bg-primary hover:bg-primary text-primary-foreground">
                            Artista parceiro
                          </Badge>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger
              value="visao-geral"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="perfil"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Perfil
            </TabsTrigger>
            <TabsTrigger
              value="catalogo"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Catálogo
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Financeiro
            </TabsTrigger>
            <TabsTrigger
              value="contratos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Contratos
            </TabsTrigger>
            <TabsTrigger
              value="metas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Metas
            </TabsTrigger>
            <TabsTrigger
              value="evolucao"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              data-testid="tab-evolucao"
            >
              Evolução
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-200px)]">
            {/* Visão Geral */}
            <TabsContent value="visao-geral" className="p-6 space-y-6 mt-0">
              {/* Estágio da Carreira + Benchmark */}
              <div className="grid grid-cols-2 gap-4">
                {/* Estágio da Carreira */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-teal-500" />
                      <h3 className="font-semibold">Estágio da Carreira</h3>
                    </div>
                    {artista.estagio_carreira ? (
                      <>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-full bg-teal-500/20 border-4 border-teal-500 flex items-center justify-center">
                              <span className="text-xl font-bold text-teal-400">
                                {artista.estagio_carreira}
                              </span>
                            </div>
                            <span className="absolute -top-1 -right-1 text-[9px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full">
                              de 10
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-teal-400">
                              {
                                estagiosCarreira[artista.estagio_carreira - 1]
                                  ?.nome
                              }
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {
                                estagiosCarreira[artista.estagio_carreira - 1]
                                  ?.descricao
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <div
                              key={n}
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                                n < artista.estagio_carreira
                                  ? "bg-teal-500 text-white"
                                  : n === artista.estagio_carreira
                                    ? "bg-teal-500 text-white ring-2 ring-teal-400 ring-offset-1 ring-offset-background"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                        <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Estágio não definido
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          Edite o perfil do artista e defina o estágio da
                          carreira (1–10).
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Benchmark de Mercado */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="h-5 w-5 text-warning" />
                      <h3 className="font-semibold">Benchmark de Mercado</h3>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Sem dados de mercado
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Conecte uma fonte de análise de mercado para visualizar
                        o benchmark comparativo.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-5 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Building className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Projetos</span>
                    </div>
                    <p className="text-2xl font-bold">{projetosReais.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Music className="h-4 w-4 text-primary" />
                      <span className="text-sm">Obras</span>
                    </div>
                    <p className="text-2xl font-bold">{obrasReais.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Disc className="h-4 w-4 text-success" />
                      <span className="text-sm">Fonogramas</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {fonogramasReais.length}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Rocket className="h-4 w-4 text-warning" />
                      <span className="text-sm">Lançamentos</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {lancamentosReais.length}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Contratos</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {contratosReais.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Plano de Aceleração */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-warning" />
                    <h3 className="font-semibold">Plano de Aceleração</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                    <Zap className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Plano não configurado
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      O plano de aceleração será exibido quando métricas
                      validadas forem cadastradas para este artista.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnóstico + Riscos */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-teal-500" />
                      <div>
                        <h3 className="font-semibold">
                          Diagnóstico de Gargalo
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
                      <Lightbulb className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Sem diagnóstico disponível
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Preencha os dados do artista para gerar análise de
                        gargalos.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <h3 className="font-semibold">Principais Riscos</h3>
                    </div>
                    <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Sem riscos identificados
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        A análise de riscos estará disponível quando houver
                        dados suficientes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo Financeiro */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Resumo Financeiro</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Receitas</p>
                      <p className="text-xl font-bold text-success">
                        {formatCurrency(receitasTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Despesas</p>
                      <p className="text-xl font-bold text-destructive">
                        {formatCurrency(despesasTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo</p>
                      <p
                        className={`text-xl font-bold ${saldoTotal >= 0 ? "text-blue-500" : "text-destructive"}`}
                      >
                        {formatCurrency(saldoTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="text-xl font-bold text-warning">
                        {formatCurrency(pendentesTotal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progresso das Metas */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Progresso das Metas</h3>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Progresso Médio
                    </span>
                    <span className="text-sm font-medium">
                      {progressoMedio}%
                    </span>
                  </div>
                  <Progress value={progressoMedio} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-warning">
                        {metasEmProgresso}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Em Progresso
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-success">
                        {metasConcluidas}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Concluídas
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{metasReais.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Foco dos Próximos 90 Dias */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-teal-500" />
                    <h3 className="font-semibold">Foco dos Próximos 90 Dias</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
                    <Target className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Foco não definido
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Crie metas com prazo para que o foco dos próximos 90 dias
                      seja gerado automaticamente.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Perfil */}
            <TabsContent value="perfil" className="p-6 space-y-6 mt-0">
              {/* Informações Básicas */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Mic className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Informações Básicas</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Nome Artístico
                      </p>
                      <p className="text-sm font-medium">
                        {artista.nome_artistico || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Gênero Musical
                      </p>
                      <p className="text-sm font-medium capitalize">
                        {artista.genero_musical || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Função</p>
                      <p className="text-sm font-medium">
                        {(() => {
                          const esp = Array.isArray(artista.especialidades)
                            ? artista.especialidades
                            : [];
                          if (esp.length === 0) return "Não informado";
                          return esp
                            .map((e: string) => ESPECIALIDADES_LABELS[e] ?? e)
                            .join(", ");
                        })()}
                      </p>
                    </div>
                  </div>
                  {artista.observacoes && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground">Biografia</p>
                      <p className="text-sm font-medium">
                        {artista.observacoes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dados Pessoais */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Dados Pessoais</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Nome Completo
                      </p>
                      <p className="text-sm font-medium">
                        {artista.nome_civil ||
                          artista.nome_artistico ||
                          "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Data de Nascimento
                      </p>
                      <p className="text-sm font-medium">
                        {formatDateDMY(artista.data_nascimento as string | null)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                      <p className="text-sm font-medium">
                        {artista.cpf_cnpj || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">RG</p>
                      <p className="text-sm font-medium">
                        {artista.rg || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gênero</p>
                      <p className="text-sm font-medium">
                        {(artista as Record<string, unknown>).genero as string || "Não informado"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contato e Endereço */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Contato e Endereço</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="text-sm font-medium">
                        {artista.email || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm font-medium">
                        {artista.telefone || "Não informado"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço</p>
                      <p className="text-sm font-medium">
                        {artista.endereco || "Não informado"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados Bancários */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Dados Bancários</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Banco</p>
                      <p className="text-sm font-medium capitalize">
                        {artista.banco?.replace(/_/g, " ") || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Agência</p>
                      <p className="text-sm font-medium">
                        {artista.agencia || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conta</p>
                      <p className="text-sm font-medium">
                        {artista.conta || "Não informado"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Titular da Conta
                      </p>
                      <p className="text-sm font-medium">
                        {artista.titular_conta ||
                          artista.nome_civil ||
                          "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Chave PIX</p>
                      <p className="text-sm font-medium">
                        {artista.chave_pix || "Não informado"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Perfis e Redes Sociais */}
              <ArtistaPlatformMetrics
                artistaId={artista.id}
                instagramUrl={artista.instagram ?? null}
                instagramSeguidores={artista.instagram_seguidores ?? null}
                tiktokUrl={artista.tiktok ?? null}
                tiktokSeguidores={artista.tiktok_seguidores ?? null}
                spotifyArtistId={artista.spotify_artist_id ?? null}
                spotifyOuvintes={artista.spotify_ouvintes ?? null}
                youtubeChannelId={artista.youtube_channel_id ?? null}
                youtubeInscritos={artista.youtube_inscritos ?? null}
                deezerUrl={artista.deezer_url ?? null}
                deezerFas={artista.deezer_fas ?? null}
                appleMusicUrl={artista.apple_music_url ?? null}
                appleMusicAlbuns={artista.apple_music_albuns ?? null}
                soundcloudUrl={artista.soundcloud_url ?? null}
                soundcloudSeguidores={artista.soundcloud_seguidores ?? null}
              />

              {/* Tipo de Perfil */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Tipo de Perfil</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <Badge variant="outline" className="capitalize">
                        {artista.tipo_perfil === "independente"
                          ? "Independente"
                          : artista.tipo_perfil === "com_empresario"
                            ? "Com Empresário"
                            : artista.tipo_perfil === "gravadora"
                              ? "Gravadora"
                              : artista.tipo_perfil === "editora"
                                ? "Editora"
                                : "Não informado"}
                      </Badge>
                    </div>
                    {artista.tipo_perfil === "com_empresario" && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Nome do Empresário
                          </p>
                          <p className="text-sm font-medium">
                            {artista.empresario_nome || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Telefone do Empresário
                          </p>
                          <p className="text-sm font-medium">
                            {artista.empresario_telefone || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            E-mail do Empresário
                          </p>
                          <p className="text-sm font-medium">
                            {artista.empresario_email || "Não informado"}
                          </p>
                        </div>
                      </>
                    )}
                    {artista.tipo_perfil === "gravadora" && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Nome da Gravadora
                          </p>
                          <p className="text-sm font-medium">
                            {artista.gravadora_nome || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Contato na Gravadora
                          </p>
                          <p className="text-sm font-medium">
                            {artista.gravadora_responsavel_nome ||
                              "Não informado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Telefone da Gravadora
                          </p>
                          <p className="text-sm font-medium">
                            {artista.gravadora_telefone || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            E-mail da Gravadora
                          </p>
                          <p className="text-sm font-medium">
                            {artista.gravadora_email || "Não informado"}
                          </p>
                        </div>
                      </>
                    )}
                    {artista.tipo_perfil === "editora" && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Nome do Responsável
                          </p>
                          <p className="text-sm font-medium">
                            {artista.gravadora_responsavel_nome ||
                              "Não informado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Telefone do Responsável
                          </p>
                          <p className="text-sm font-medium">
                            {artista.gravadora_responsavel_telefone ||
                              "Não informado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            E-mail do Responsável
                          </p>
                          <p className="text-sm font-medium">
                            {artista.gravadora_responsavel_email ||
                              "Não informado"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Distribuidoras */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">
                      Distribuidoras / Agregadoras
                    </h3>
                  </div>
                  {(() => {
                    const distSel = artista.distribuidoras_selecionadas ?? {};
                    const ativas = Object.entries(distSel)
                      .filter(([, v]) => v)
                      .map(([k]) => k);
                    const emails = artista.distribuidoras_emails ?? {};
                    return ativas.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {ativas.map((dist: string) => (
                            <Badge
                              key={dist}
                              variant="secondary"
                              className="capitalize"
                            >
                              {dist === "cdbaby"
                                ? "CD Baby"
                                : dist === "distrokid"
                                  ? "DistroKid"
                                  : dist === "tunecore"
                                    ? "TuneCore"
                                    : dist === "ditto"
                                      ? "Ditto Music"
                                      : dist === "onerpm"
                                        ? "ONErpm"
                                        : dist === "imusics"
                                          ? "iMusics"
                                          : dist === "symphonic"
                                            ? "Symphonic Distribution"
                                            : dist}
                            </Badge>
                          ))}
                        </div>
                        {Object.keys(emails).length > 0 && (
                          <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-border">
                            {Object.entries(emails).map(([distId, email]) => {
                              const distName =
                                distId === "cdbaby"
                                  ? "CD Baby"
                                  : distId === "distrokid"
                                    ? "DistroKid"
                                    : distId === "tunecore"
                                      ? "TuneCore"
                                      : distId === "ditto"
                                        ? "Ditto Music"
                                        : distId === "onerpm"
                                          ? "ONErpm"
                                          : distId === "imusics"
                                            ? "iMusics"
                                            : distId === "symphonic"
                                              ? "Symphonic Distribution"
                                              : distId;
                              return (
                                <div key={distId}>
                                  <p className="text-xs text-muted-foreground">
                                    E-mail Share - {distName}
                                  </p>
                                  <p className="text-sm font-medium">
                                    {(email as string) || "Não informado"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma distribuidora vinculada
                      </p>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Distribuidoras / Agregadoras (novo formato — secção 5 do formulário) */}
              {(() => {
                const distsGerais: Array<{ id: string; email: string; nomeCustom?: string }> =
                  Array.isArray((artista as Record<string, unknown>).distribuidoras_gerais)
                    ? ((artista as Record<string, unknown>).distribuidoras_gerais as Array<{ id: string; email: string; nomeCustom?: string }>)
                    : [];
                if (distsGerais.length === 0) return null;
                const DIST_LABEL: Record<string, string> = {
                  onerpm: "ONErpm", distrokid: "DistroKid", "30por1": "30 Por 1",
                  symphonic: "Symphonic", musicpro: "MusicPro", somvibe: "Somvibe",
                };
                return (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Distribuidoras / Agregadoras</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {distsGerais.map((d) => (
                          <Badge key={d.id} variant="secondary">
                            {d.id === "outros" ? (d.nomeCustom || "Outros") : (DIST_LABEL[d.id] ?? d.id)}
                          </Badge>
                        ))}
                      </div>
                      {distsGerais.some((d) => d.email) && (
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                          {distsGerais.filter((d) => d.email).map((d) => (
                            <div key={d.id}>
                              <p className="text-xs text-muted-foreground">
                                E-mail Share — {d.id === "outros" ? (d.nomeCustom || "Outros") : (DIST_LABEL[d.id] ?? d.id)}
                              </p>
                              <p className="text-sm font-medium">{d.email}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Equipa / Contactos */}
              {(() => {
                type ContatoEquipeItem = { nome: string; categoria: string; telefone: string; email: string; distribuidoras?: Array<{ id: string; email: string; nomeCustom?: string }> };
                const equipe: ContatoEquipeItem[] = Array.isArray((artista as Record<string, unknown>).contatos_equipe)
                  ? ((artista as Record<string, unknown>).contatos_equipe as ContatoEquipeItem[]).filter((c) => c.nome || c.email || c.telefone)
                  : [];
                if (equipe.length === 0) return null;
                const CAT_LABEL: Record<string, string> = {
                  booker: "Booker", assessoria: "Assessoria de Imprensa", juridico: "Jurídico",
                  financeiro: "Financeiro", contador: "Contador", editora_musical: "Editora Musical",
                  roadie: "Roadie", gestor: "Gestor", empresario: "Empresário",
                };
                const DIST_LABEL: Record<string, string> = {
                  onerpm: "ONErpm", distrokid: "DistroKid", "30por1": "30 Por 1",
                  symphonic: "Symphonic", musicpro: "MusicPro", somvibe: "Somvibe",
                };
                return (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Equipa / Contactos</h3>
                      </div>
                      <div className="space-y-4">
                        {equipe.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-border/50 bg-background/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">{c.nome || "—"}</p>
                              {c.categoria && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {CAT_LABEL[c.categoria] ?? c.categoria}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {c.telefone && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Telefone</p>
                                  <p className="text-sm">{c.telefone}</p>
                                </div>
                              )}
                              {c.email && (
                                <div>
                                  <p className="text-xs text-muted-foreground">E-mail</p>
                                  <p className="text-sm">{c.email}</p>
                                </div>
                              )}
                            </div>
                            {Array.isArray(c.distribuidoras) && c.distribuidoras.length > 0 && (
                              <div className="pt-2 border-t border-border/40">
                                <p className="text-xs text-muted-foreground mb-1.5">Distribuidoras</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {c.distribuidoras.map((d) => (
                                    <Badge key={d.id} variant="secondary" className="text-xs">
                                      {d.id === "outros" ? (d.nomeCustom || "Outros") : (DIST_LABEL[d.id] ?? d.id)}
                                    </Badge>
                                  ))}
                                </div>
                                {c.distribuidoras.some((d) => d.email) && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {c.distribuidoras.filter((d) => d.email).map((d) => (
                                      <div key={d.id}>
                                        <p className="text-xs text-muted-foreground">
                                          Share — {d.id === "outros" ? (d.nomeCustom || "Outros") : (DIST_LABEL[d.id] ?? d.id)}
                                        </p>
                                        <p className="text-sm">{d.email}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Observações */}
              {artista.observacoes && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Observações</h3>
                    </div>
                    <p className="text-sm">{artista.observacoes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Data de Cadastro */}
              <div className="text-sm text-muted-foreground">
                <span>Data de Cadastro: </span>
                <span>
                  {artista.created_at
                    ? new Date(artista.created_at).toLocaleDateString("pt-BR")
                    : new Date().toLocaleDateString("pt-BR")}
                </span>
              </div>
            </TabsContent>

            {/* Mídia */}
            <TabsContent value="midia" className="p-6 space-y-6 mt-0">
              {/* Galeria de Fotos */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Galeria de Fotos</h3>
                  </div>
                  {Array.isArray(artista.galeria_urls) &&
                  artista.galeria_urls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {(artista.galeria_urls as string[]).map((url, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group"
                        >
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                              (e.currentTarget
                                .nextSibling as HTMLElement)!.style.display =
                                "flex";
                            }}
                          />
                          <div className="hidden w-full h-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <ExternalLink className="h-5 w-5 text-white" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma foto na galeria
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Adicione URLs de fotos na edição do artista
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vídeo de Apresentação */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Vídeo de Apresentação</h3>
                  </div>
                  {artista.video_apresentacao_url ? (
                    <div className="space-y-3">
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                        <iframe
                          src={(() => {
                            const url =
                              artista.video_apresentacao_url as string;
                            const match = url.match(
                              /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
                            );
                            if (match)
                              return `https://www.youtube.com/embed/${match[1]}`;
                            return url;
                          })()}
                          className="w-full h-full"
                          allowFullScreen
                          title="Vídeo de apresentação"
                        />
                      </div>
                      <a
                        href={artista.video_apresentacao_url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        data-testid="link-video-apresentacao"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir no YouTube
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <Video className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum vídeo de apresentação cadastrado
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Adicione uma URL do YouTube na edição do artista
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documentos */}
            <TabsContent value="documentos" className="p-6 space-y-6 mt-0">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Documentos Vinculados</h3>
                  </div>
                  {Array.isArray(artista.documentos) &&
                  artista.documentos.length > 0 ? (
                    <div className="space-y-2">
                      {(
                        artista.documentos as { nome: string; url: string }[]
                      ).map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
                          data-testid={`row-documento-${idx}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.nome}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {doc.url}
                              </p>
                            </div>
                          </div>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 ml-4"
                            data-testid={`link-documento-${idx}`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <FileText className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum documento vinculado
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Adicione documentos (press kit, bio PDF, rider) na
                        edição do artista
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Links de documentos legados */}
              {(artista.documentos_pessoais_url || artista.presskit_url) && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Arquivos Rápidos</h3>
                    <div className="space-y-2">
                      {artista.documentos_pessoais_url && (
                        <a
                          href={artista.documentos_pessoais_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded text-sm text-primary"
                        >
                          <FileText className="h-4 w-4" />
                          Documentos Pessoais
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </a>
                      )}
                      {artista.presskit_url && (
                        <a
                          href={artista.presskit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded text-sm text-primary"
                        >
                          <Link2 className="h-4 w-4" />
                          Press Kit
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Catálogo */}
            <TabsContent value="catalogo" className="p-6 space-y-6 mt-0">
              {/* Estatísticas */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">
                    Estatísticas do Catálogo
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <Building className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">
                        {projetosReais.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Projetos</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <Music className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{obrasReais.length}</p>
                      <p className="text-xs text-muted-foreground">Obras</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <Disc className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">
                        {fonogramasReais.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fonogramas
                      </p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <Rocket className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">
                        {lancamentosReais.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lançamentos
                      </p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">
                        {artista.spotify_ouvintes != null
                          ? Number(artista.spotify_ouvintes).toLocaleString(
                              "pt-BR",
                            )
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Streams</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {obrasReais.length +
                fonogramasReais.length +
                lancamentosReais.length +
                projetosReais.length ===
              0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-2">
                    <Music className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Nenhum registro de catálogo vinculado
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Cadastre projetos, obras, fonogramas ou lançamentos e
                      vincule-os a este artista para que apareçam aqui.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {obrasReais.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">
                          Obras Musicais ({obrasReais.length})
                        </h3>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-2">
                            {obrasReais.map((obra) => (
                              <div
                                key={obra.id}
                                className="flex items-center justify-between py-1 border-b border-border/40 last:border-0"
                              >
                                <span className="text-sm truncate flex-1 mr-2">
                                  {obra.titulo}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize shrink-0"
                                >
                                  {obra.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {fonogramasReais.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">
                          Fonogramas ({fonogramasReais.length})
                        </h3>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-2">
                            {fonogramasReais.map((fono) => (
                              <div
                                key={fono.id}
                                className="flex items-center justify-between py-1 border-b border-border/40 last:border-0"
                              >
                                <div className="flex-1 min-w-0 mr-2">
                                  <p className="text-sm font-medium truncate">
                                    {fono.titulo}
                                  </p>
                                  {fono.gravadora && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {fono.gravadora}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize shrink-0"
                                >
                                  {fono.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {lancamentosReais.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">
                          Lançamentos ({lancamentosReais.length})
                        </h3>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-2">
                            {lancamentosReais.map((lanc) => (
                              <div
                                key={lanc.id}
                                className="flex items-center justify-between py-1 border-b border-border/40 last:border-0"
                              >
                                <div className="flex-1 min-w-0 mr-2">
                                  <p className="text-sm font-medium truncate">
                                    {lanc.titulo}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {lanc.data_lancamento
                                      ? new Date(
                                          lanc.data_lancamento,
                                        ).toLocaleDateString("pt-BR")
                                      : "Sem data"}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize shrink-0"
                                >
                                  {lanc.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {projetosReais.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">
                          Projetos ({projetosReais.length})
                        </h3>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-2">
                            {projetosReais.map((proj) => (
                              <div
                                key={proj.id}
                                className="flex items-center justify-between py-1 border-b border-border/40 last:border-0"
                              >
                                <div className="flex-1 min-w-0 mr-2">
                                  <p className="text-sm font-medium truncate">
                                    {proj.titulo}
                                  </p>
                                  {Array.isArray(proj.produtores) &&
                                    (proj.produtores as string[]).length >
                                      0 && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {(proj.produtores as string[]).join(
                                          ", ",
                                        )}
                                      </p>
                                    )}
                                </div>
                                <Badge
                                  className={`text-xs shrink-0 ${proj.status === "concluido" ? "bg-success" : proj.status === "em_andamento" ? "bg-blue-600" : "bg-gray-600"}`}
                                >
                                  {proj.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Financeiro */}
            <TabsContent value="financeiro" className="p-6 space-y-6 mt-0">
              {/* Cards de Valores */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-success/10 border-success/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Receitas Total
                    </p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(receitasTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/10 border-destructive/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Despesas Total
                    </p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(despesasTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-600/10 border-blue-600/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p
                      className={`text-2xl font-bold ${saldoTotal >= 0 ? "text-blue-500" : "text-destructive"}`}
                    >
                      {formatCurrency(saldoTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-warning/10 border-warning/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-warning">
                      {formatCurrency(pendentesTotal)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Últimas Transações */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">
                    Últimas Transações ({transacoesArtista.length})
                  </h3>
                  {transacoesArtista.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma transação vinculada a este artista
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transacoesArtista.slice(0, 10).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {t.descricao}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.data
                                ? new Date(t.data).toLocaleDateString("pt-BR")
                                : "—"}
                              {t.categoria &&
                                ` · ${t.categoria.replace(/_/g, " ")}`}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <p
                              className={`text-sm font-bold ${t.tipo === "receita" ? "text-success" : "text-destructive"}`}
                            >
                              {t.tipo === "receita" ? "+" : "-"}
                              {formatCurrency(t.valor)}
                            </p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {t.status?.replace(/_/g, " ") ?? "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contratos */}
            <TabsContent value="contratos" className="p-6 space-y-6 mt-0">
              {/* Métricas de Contratos */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
                    <p className="text-2xl font-bold">{contratosAtivos}</p>
                    <p className="text-sm text-muted-foreground">Ativos</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 mx-auto text-warning mb-2" />
                    <p className="text-2xl font-bold">{contratosVencendo}</p>
                    <p className="text-sm text-muted-foreground">
                      Vencendo em 60d
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold">
                      {contratosReais.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Contratos */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">
                    Contratos ({contratosReais.length})
                  </h3>
                  {contratosReais.length > 0 ? (
                    <div className="space-y-3">
                      {contratosReais.map((contrato) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const in30Days = new Date(today);
                        in30Days.setDate(in30Days.getDate() + 30);
                        const dataFim = contrato.data_fim
                          ? new Date(contrato.data_fim)
                          : null;
                        const expirando =
                          dataFim && dataFim >= today && dataFim <= in30Days;
                        const diasRestantes = dataFim
                          ? Math.ceil(
                              (dataFim.getTime() - today.getTime()) /
                                (1000 * 60 * 60 * 24),
                            )
                          : null;

                        return (
                          <div
                            key={contrato.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">
                                  {contrato.titulo}
                                </p>
                                {expirando && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-warning border border-warning/20 bg-warning/10 rounded px-1 py-0.5 shrink-0">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {diasRestantes}d
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {contrato.data_inicio
                                  ? new Date(
                                      contrato.data_inicio,
                                    ).toLocaleDateString("pt-BR")
                                  : "—"}
                                {" → "}
                                {contrato.data_fim
                                  ? new Date(
                                      contrato.data_fim,
                                    ).toLocaleDateString("pt-BR")
                                  : "Indeterminado"}
                              </p>
                              {contrato.valor != null && (
                                <p className="text-xs text-muted-foreground">
                                  Valor: {formatCurrency(contrato.valor)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <ContratoStatusBadge contratos={[contrato]} />
                              {contrato.arquivo_url && (
                                <a
                                  href={contrato.arquivo_url as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-testid={`link-contrato-pdf-${contrato.id}`}
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    PDF
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum contrato vinculado a este artista
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metas */}
            <TabsContent value="metas" className="p-6 space-y-6 mt-0">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Metas & OKRs</h3>
                        <p className="text-sm text-muted-foreground">
                          {artista.nome_artistico}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => setShowMetaForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Meta
                    </Button>
                  </div>

                  {/* Resumo */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{metasReais.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-3 bg-warning/10 rounded-lg">
                      <p className="text-2xl font-bold text-warning">
                        {metasEmProgresso}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Em Progresso
                      </p>
                    </div>
                    <div className="text-center p-3 bg-success/10 rounded-lg">
                      <p className="text-2xl font-bold text-success">
                        {metasConcluidas}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Concluídas
                      </p>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-blue-500">
                        {progressoMedio}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Progresso Médio
                      </p>
                    </div>
                  </div>

                  {metasReais.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Target className="h-16 w-16 text-muted-foreground mb-4" />
                      <h4 className="font-medium mb-1">
                        Nenhuma meta definida
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Defina metas para acompanhar o progresso do artista
                      </p>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => setShowMetaForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Criar Primeira Meta
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {metasReais.map((meta) => {
                        const progress = calcProgress(meta);
                        const statusInfo = statusMeta.find(
                          (s) => s.value === meta.status,
                        );
                        const titulo =
                          (meta as any).titulo ||
                          meta.tipo_meta ||
                          meta.descricao ||
                          "Meta";
                        const tipoMeta =
                          (meta as any).tipo_meta || (meta as any).tipo;
                        const categoria = (meta as any).categoria;
                        const dataInicio =
                          meta.data_inicio || (meta as any).dataInicio;
                        const dataFim = meta.data_fim || (meta as any).dataFim;
                        return (
                          <Card key={meta.id} className="bg-background/50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{titulo}</h4>
                                    <Badge
                                      className={
                                        statusInfo?.color ?? "bg-gray-500"
                                      }
                                    >
                                      {statusInfo?.label ?? meta.status}
                                    </Badge>
                                  </div>
                                  {meta.descricao &&
                                    titulo !== meta.descricao && (
                                      <p className="text-sm text-muted-foreground">
                                        {meta.descricao}
                                      </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditMeta(meta)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteMeta(meta.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-muted-foreground">
                                      {(meta.valor_atual ?? 0).toLocaleString()}{" "}
                                      /{" "}
                                      {(meta.valor_meta ?? 0).toLocaleString()}{" "}
                                      {meta.unidade}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {progress}%
                                    </span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {dataInicio && dataFim && (
                                    <span>
                                      {new Date(dataInicio).toLocaleDateString(
                                        "pt-BR",
                                      )}{" "}
                                      -{" "}
                                      {new Date(dataFim).toLocaleDateString(
                                        "pt-BR",
                                      )}
                                    </span>
                                  )}
                                </div>
                                {categoria && (
                                  <Badge variant="outline" className="text-xs">
                                    {categoriasMeta.find(
                                      (c) => c.value === categoria,
                                    )?.label ?? categoria}
                                  </Badge>
                                )}
                                {tipoMeta && (
                                  <Badge variant="outline" className="text-xs">
                                    {tiposMeta.find((t) => t.value === tipoMeta)
                                      ?.label ?? tipoMeta}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Evolução */}
            <TabsContent value="evolucao" className="p-6 space-y-6 mt-0">
              <ArtistaEvolucaoSection artista={artista} />
            </TabsContent>

            {/* Histórico */}
            <TabsContent value="historico" className="p-6 space-y-6 mt-0">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Histórico de Atividades</h3>
                  </div>

                  <div className="space-y-4">
                    {historicoReal.length > 0 ? (
                      historicoReal.map((item, index) => (
                        <div key={item.id} className="relative">
                          {index < historicoReal.length - 1 && (
                            <div className="absolute left-5 top-10 w-0.5 h-full bg-border" />
                          )}

                          <div className="flex items-start gap-4 p-3 bg-background/50 rounded-lg">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {getHistoricoIcon(item.tipo)}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{item.descricao}</p>
                                {getHistoricoBadge(item.tipo)}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(item.data).toLocaleDateString(
                                    "pt-BR",
                                  )}{" "}
                                  às{" "}
                                  {new Date(item.data).toLocaleTimeString(
                                    "pt-BR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {item.usuario}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        Nenhum registro de histórico encontrado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Modal de Nova/Editar Meta */}
        <Dialog
          open={showMetaForm}
          onOpenChange={(open) => !open && resetForm()}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingMeta ? "Editar Meta" : "Nova Meta"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <Label>Título da Meta *</Label>
                <Input
                  value={metaForm.titulo}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, titulo: e.target.value })
                  }
                  placeholder="Ex: Alcançar 1M de streams"
                />
              </div>

              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={metaForm.descricao}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, descricao: e.target.value })
                  }
                  placeholder="Descreva a meta em detalhes..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Tipo de Meta *</Label>
                <Select
                  value={metaForm.tipo}
                  onValueChange={(v) => setMetaForm({ ...metaForm, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposMeta.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Categoria</Label>
                <Select
                  value={metaForm.categoria}
                  onValueChange={(v) =>
                    setMetaForm({ ...metaForm, categoria: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasMeta.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor da Meta *</Label>
                <Input
                  type="number"
                  value={metaForm.valorMeta}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, valorMeta: e.target.value })
                  }
                  placeholder="1000000"
                />
              </div>

              <div>
                <Label>Valor Atual</Label>
                <Input
                  type="number"
                  value={metaForm.valorAtual}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, valorAtual: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Unidade de Medida</Label>
                <Input
                  value={metaForm.unidade}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, unidade: e.target.value })
                  }
                  placeholder="Ex: streams, seguidores, R$"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={metaForm.status}
                  onValueChange={(v) =>
                    setMetaForm({ ...metaForm, status: v as Meta["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusMeta.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data de Início</Label>
                <DatePickerField
                  value={metaForm.dataInicio}
                  onChange={(iso) => setMetaForm({ ...metaForm, dataInicio: iso })}
                  placeholder="Selecione a data"
                  data-testid="datepicker-meta-data-inicio"
                />
              </div>

              <div>
                <Label>Data de Fim</Label>
                <DatePickerField
                  value={metaForm.dataFim}
                  onChange={(iso) => setMetaForm({ ...metaForm, dataFim: iso })}
                  placeholder="Selecione a data"
                  data-testid="datepicker-meta-data-fim"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveMeta}
                className="bg-primary hover:bg-primary/90"
              >
                {editingMeta ? "Salvar Alterações" : "Criar Meta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
