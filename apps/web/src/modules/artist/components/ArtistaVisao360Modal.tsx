import { useMemo, useState } from "react";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { ESPECIALIDADES_LABELS } from "@/modules/artist/mappers";
import { useContacts } from "@/modules/crm-relationships/hooks/useContacts";
import { contactTypeOptions, labelFor } from "@/modules/crm-relationships/constants";
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
  MapPin,
  CreditCard,
  Building,
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
  Link2,
} from "lucide-react";
import { ArtistaEvolucaoSection } from "@/modules/artist/components/ArtistaEvolucaoSection";
import { PositioningCard } from "@/modules/artist/components/PositioningCard";
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

// imports movidos para cá após remoção de CircularProgress
import { formatCurrency, getCurrencyToneClass, getMonetarySemanticClass } from "@/shared/lib/format-utils";
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
import { ContratoStatusBadge } from "@/modules/contracts/components/ContratoStatusBadge";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { getBackendEventTypeLabel } from "@/modules/events/lib/event-type";
import { useMarketingContents } from "@/modules/marketing/hooks/useMarketingContents";
import { useMarketingCampaigns } from "@/modules/marketing/hooks/useMarketingCampaigns";

// ── Marketing: rótulos de campanha/canal ──────────────────────────────────
const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho", agendada: "Agendada", ativa: "Ativa",
  pausada: "Pausada", concluida: "Concluída", cancelada: "Cancelada",
};
const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube",
  twitter: "Twitter", threads: "Threads", linkedin: "LinkedIn", shorts: "Shorts",
  reels: "Reels", stories: "Stories", blog: "Blog", podcast: "Podcast",
  campanha: "Campanha", portal_noticias: "Portal", material_publicitario: "Publicidade",
};
const CAMPANHA_SECOES: Array<{ key: string; label: string; status: string[] }> = [
  { key: "ativas", label: "Campanhas Ativas", status: ["ativa", "pausada"] },
  { key: "encerradas", label: "Campanhas Encerradas", status: ["concluida", "cancelada"] },
  { key: "planejadas", label: "Campanhas Planejadas", status: ["rascunho", "agendada"] },
];

// ── Financeiro: receitas por natureza ──────────────────────────────────────
const NATUREZA_BUCKETS: Array<{ label: string; keywords: string[] }> = [
  { label: "Royalties", keywords: ["royalt"] },
  { label: "Shows", keywords: ["show", "cache", "cachê"] },
  { label: "Licenciamentos", keywords: ["licenc", "sync"] },
  { label: "Publicidade", keywords: ["public", "publi", "ads", "anuncio", "patroc"] },
  { label: "Distribuição", keywords: ["distrib", "streaming"] },
];

// ── Contratos: filtros por tipo ────────────────────────────────────────────
const CONTRATO_FILTERS: Array<{ key: string; label: string; tipos?: string[] }> = [
  { key: "todos", label: "Todos" },
  { key: "empresarial", label: "Empresarial", tipos: ["exclusivo", "nao_exclusivo", "gestao", "representacao"] },
  { key: "distribuicao", label: "Distribuição", tipos: ["distribuicao"] },
  { key: "licenciamento", label: "Licenciamento", tipos: ["licenciamento"] },
  { key: "producao", label: "Produção", tipos: ["producao"] },
  { key: "parcerias", label: "Parcerias", tipos: ["parceria"] },
  { key: "servicos", label: "Serviços", tipos: ["servicos"] },
  { key: "outros", label: "Outros", tipos: ["outro"] },
];

// ── Agenda: rótulos e filtros ──────────────────────────────────────────────
// events.tipo só guarda o enum coarse do backend (show/festival/recording/
// meeting/interview/tour/other) — ver modules/events/lib/event-type.ts para
// os rótulos reais. "Ensaios" e "Gravações" viram um único filtro porque a
// coluna real não distingue as duas (ambas coarseiam para "recording").
const EVENTO_STATUS_LABELS: Record<string, string> = {
  planejado: "Planejado", agendado: "Agendado", confirmado: "Confirmado",
  realizado: "Realizado", concluido: "Concluído", cancelado: "Cancelado", adiado: "Adiado",
};
const AGENDA_FILTERS: Array<{ key: string; label: string; tipos?: string[] }> = [
  { key: "todos", label: "Todos" },
  { key: "shows", label: "Shows", tipos: ["show", "festival"] },
  { key: "reunioes", label: "Reuniões", tipos: ["meeting"] },
  { key: "entrevistas", label: "Entrevistas", tipos: ["interview"] },
  { key: "gravacoes", label: "Gravações/Ensaios", tipos: ["recording"] },
  { key: "turnes", label: "Turnês", tipos: ["tour"] },
  { key: "outros", label: "Outros", tipos: ["other"] },
];

// ── Conteúdos: rótulos e filtros ───────────────────────────────────────────
const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: "Post", feed: "Feed", stories: "Stories", reels: "Reels", shorts: "Shorts",
  video: "Vídeo", carrossel: "Carrossel", anuncio: "Anúncio", rede_social: "Rede Social",
  institucional: "Institucional", comercial: "Comercial", artista: "Artista",
  bastidores: "Bastidores", reuniao: "Reunião", evento: "Evento", portal: "Portal",
  blog: "Blog", publicidade: "Publicidade",
};
const CONTENT_STATUS_LABELS: Record<string, string> = {
  ideia: "Planejado", producao: "Em Produção", revisao: "Em Revisão",
  agendado: "Agendado", publicado: "Publicado", falhou: "Falhou", atrasado: "Atrasado",
};
const CONTEUDO_FILTERS: Array<{ key: string; label: string; status?: string[] }> = [
  { key: "todos", label: "Todos" },
  { key: "planejados", label: "Planejados", status: ["ideia", "agendado"] },
  { key: "producao", label: "Em Produção", status: ["producao", "revisao"] },
  { key: "publicado", label: "Publicado", status: ["publicado"] },
];

interface Meta {
  id: number;
  title: string;
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
      return <Badge variant="success">Criação</Badge>;
    case "edicao":
      return <Badge variant="info">Edição</Badge>;
    case "obra":
      return <Badge variant="info">Obra</Badge>;
    case "contrato":
      return (
        <Badge variant="warning">Contrato</Badge>
      );
    case "financeiro":
      return <Badge variant="success">Financeiro</Badge>;
    case "exclusao":
      return <Badge variant="danger">Exclusão</Badge>;
    case "status":
      return <Badge variant="info">Status</Badge>;
    default:
      return <Badge variant="neutral">Outro</Badge>;
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

const primaryCompactButtonClass = "h-8 text-xs gap-1.5";
const activeBlueBadgeClass = "bg-primary text-primary-foreground border-primary";

const statusMeta = [
  { value: "em_progresso", label: "Em Progresso", color: activeBlueBadgeClass },
  { value: "concluida", label: "Concluída", color: "bg-success" },
  { value: "pausada", label: "Pausada", color: "bg-gray-500" },
  { value: "cancelada", label: "Cancelada", color: "bg-destructive" },
];

const getProjectStatusBadgeClass = (status?: string | null) => {
  if (status === "em_andamento") return activeBlueBadgeClass;
  if (status === "concluido") return "bg-success";
  return "bg-gray-600 text-white border-gray-600";
};

const STATUS_LABELS_PT_BR: Record<string, string> = {
  analise: "Análise",
  em_analise: "Em Análise",
  em_producao: "Em Produção",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  concluida: "Concluída",
  ativo: "Ativo",
  registrado: "Registrado",
  pendente: "Pendente",
};

const formatStatusPtBr = (status?: string | null): string => {
  const normalized = (status ?? "").trim().toLowerCase();
  if (!normalized) return "Não informado";

  const key = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  return STATUS_LABELS_PT_BR[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
};

export function ArtistaVisao360Modal({
  open,
  onOpenChange,
  artista,
}: ArtistaVisao360ModalProps) {
  // Consultas pesadas do hub 360 só fazem sentido com o modal aberto — ver
  // Task F: mantê-las sempre ativas fazia Dashboard/Artistas baixarem ~11
  // tabelas inteiras a cada carregamento de página, mesmo com o modal
  // fechado. `enabled: open` preserva o comportamento de todo outro
  // consumidor desses hooks (default `true`).
  //
  // Task G: cada uma agora também é filtrada por artist_id NO SERVIDOR
  // (backend já suporta — ver QueryPhonogramDto/QueryContractDto/
  // QueryTransactionDto/QueryEventDto/projects.dto.ts/artist-goals — works
  // ganhou o filtro nesta task). Antes, o modal baixava a tabela inteira do
  // tenant e filtrava no cliente com `.filter(x => x.artist_id === id)`
  // (padrão que a Task G pede para eliminar) — trocar de artista reaproveitava
  // até o mesmo cache incorreto, já que a queryKey não distinguia o artista.
  const artistId = artista?.id;
  const { obras: obrasReais } = useObras(open, artistId);
  const { fonogramas: fonogramasReais } = useFonogramas(open, artistId);
  const { lancamentos: lancamentosReais } = useLancamentos(open, artistId);
  const { projetos: projetosReais } = useProjetos(open, artistId);
  const {
    metas: metasReais,
    addMeta,
    updateMeta,
    deleteMeta,
    getProgressPercent: calcProgress,
  } = useMetas(open, artistId);
  const { contratos: contratosReais } = useContratos(open, artistId);
  const { transacoes: transacoesArtista } = useTransacoes(open, artistId);
  const { contacts } = useContacts(open);
  const { eventos: eventosReais } = useEventos(open, artistId);
  const { data: marketingContents = [] } = useMarketingContents(open);
  const { data: marketingCampaigns = [] } = useMarketingCampaigns(open);

  // Resolve os contatos vinculados (referências) com os dados atuais do CRM.
  const contatosVinculadosResolvidos = useMemo(() => {
    const raw = (artista as Record<string, unknown> | null | undefined)?.contatos_vinculados;
    if (!Array.isArray(raw)) return [];
    const byId = new Map(contacts.map((c) => [c.id, c]));
    return (raw as Array<{ contactId?: string }>)
      .map((v) => (typeof v?.contactId === "string" ? byId.get(v.contactId) : undefined))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [artista, contacts]);

  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [agendaFilter, setAgendaFilter] = useState("todos");
  const [conteudoFilter, setConteudoFilter] = useState("todos");
  const [contratoFilter, setContratoFilter] = useState("todos");

  // ── Agenda (eventos do artista) ────────────────────────────────────────
  const agendaFiltrada = (eventosReais as any[]).filter((e) => {
    const cfg = AGENDA_FILTERS.find((f) => f.key === agendaFilter);
    if (!cfg || !cfg.tipos) return true;
    return cfg.tipos.includes(String(e.tipo ?? "").toLowerCase());
  });

  // ── Conteúdos (marketing contents do artista) ──────────────────────────
  const conteudosReais = marketingContents.filter(
    (c) => c.targetType === "artista" && c.targetId === artistId,
  );
  const conteudosFiltrados = conteudosReais.filter((c) => {
    const cfg = CONTEUDO_FILTERS.find((f) => f.key === conteudoFilter);
    if (!cfg || !cfg.status) return true;
    return cfg.status.includes(String(c.status ?? "").toLowerCase());
  });

  // ── Marketing (campanhas do artista) ───────────────────────────────────
  const campanhasReais = marketingCampaigns.filter(
    (c) => c.targetType === "artista" && c.targetId === artistId,
  );

  // ── Movimentação (timeline operacional derivada dos dados do artista) ──
  const movimentacaoItems: {
    id: string;
    tipo: string;
    descricao: string;
    data: string;
    responsavel: string;
  }[] = [];
  contratosReais.forEach((c) => {
    const d = (c as { created_at?: string }).created_at;
    if (d) movimentacaoItems.push({ id: `mv-ctr-${c.id}`, tipo: "Jurídico", descricao: `Contrato: ${c.title}`, data: d, responsavel: "Admin" });
  });
  transacoesArtista.forEach((t) => {
    const d = (t as { created_at?: string; data?: string }).created_at ?? (t as { data?: string }).data;
    if (d) movimentacaoItems.push({ id: `mv-txn-${t.id}`, tipo: "Financeiro", descricao: t.descricao ?? (t.tipo === "receita" ? "Pagamento recebido" : "Despesa registrada"), data: d, responsavel: "Financeiro" });
  });
  eventosReais.forEach((e) => {
    const ev = e as { data?: string; tipo?: string; created_at?: string };
    const d = ev.data ?? ev.created_at;
    if (d) movimentacaoItems.push({ id: `mv-evt-${e.id}`, tipo: "Agenda", descricao: `${getBackendEventTypeLabel(ev.tipo)}: ${e.title}`, data: d, responsavel: "—" });
  });
  lancamentosReais.forEach((l: any) => {
    const d = l.created_at ?? l.data_lancamento;
    if (d) movimentacaoItems.push({ id: `mv-lan-${l.id}`, tipo: "Produção", descricao: `Lançamento: ${l.title ?? ""}`, data: d, responsavel: "Admin" });
  });
  campanhasReais.forEach((c) => {
    const d = c.startDate ?? c.createdAt;
    if (d) movimentacaoItems.push({ id: `mv-cmp-${c.id}`, tipo: "Marketing", descricao: `Campanha: ${c.name}`, data: d, responsavel: c.owner || "—" });
  });
  conteudosReais.forEach((c) => {
    const d = c.publishDate ?? c.createdAt;
    if (d) movimentacaoItems.push({ id: `mv-cnt-${c.id}`, tipo: "Marketing", descricao: `Conteúdo: ${c.title}`, data: d, responsavel: c.owner || "—" });
  });
  movimentacaoItems.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // ── Visão Geral: KPIs executivos + widgets ─────────────────────────────
  const nowTs = Date.now();
  const showsConfirmados = (eventosReais as any[]).filter(
    (e) =>
      ["show", "festival"].includes(String(e.tipo ?? "").toLowerCase()) &&
      ["confirmado", "realizado", "concluido"].includes(String(e.status ?? "").toLowerCase()),
  ).length;
  const lancamentosAtivos = lancamentosReais.length;
  const campanhasAtivasCount = campanhasReais.filter(
    (c) => String(c.status ?? "").toLowerCase() === "ativa",
  ).length;
  const conteudosPendentes = conteudosReais.filter((c) =>
    ["ideia", "producao", "revisao", "agendado", "atrasado"].includes(String(c.status ?? "").toLowerCase()),
  ).length;
  const proximoShow = (eventosReais as any[])
    .filter(
      (e) =>
        ["show", "festival"].includes(String(e.tipo ?? "").toLowerCase()) &&
        e.data &&
        new Date(e.data).getTime() >= nowTs,
    )
    .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime())[0];
  const proximoLancamento = (lancamentosReais as any[])
    .filter((l) => l.data_lancamento && new Date(l.data_lancamento).getTime() >= nowTs)
    .sort((a, b) => new Date(a.data_lancamento).getTime() - new Date(b.data_lancamento).getTime())[0];

  // ── Evolução: marcos (milestones) derivados ────────────────────────────
  const marcosEvolucao: { id: string; label: string; descricao: string; data: string }[] = [];
  if (artista?.created_at) marcosEvolucao.push({ id: "m-cad", label: "Cadastro", descricao: "Artista cadastrado no sistema", data: artista.created_at });
  const primeiroLanc = (lancamentosReais as any[])
    .filter((l) => l.created_at || l.data_lancamento)
    .sort((a, b) => new Date(a.created_at ?? a.data_lancamento).getTime() - new Date(b.created_at ?? b.data_lancamento).getTime())[0];
  if (primeiroLanc) marcosEvolucao.push({ id: "m-lan", label: "Primeiro Lançamento", descricao: primeiroLanc.title ?? "Lançamento", data: primeiroLanc.created_at ?? primeiroLanc.data_lancamento });
  const primeiroShow = (eventosReais as any[])
    .filter((e) => ["show", "festival"].includes(String(e.tipo ?? "").toLowerCase()) && e.data)
    .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime())[0];
  if (primeiroShow) marcosEvolucao.push({ id: "m-show", label: "Primeira Turnê/Show", descricao: primeiroShow.title, data: primeiroShow.data! });
  const primeiroContrato = (contratosReais as any[])
    .filter((c) => c.created_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
  if (primeiroContrato) marcosEvolucao.push({ id: "m-ctr", label: "Contrato Assinado", descricao: primeiroContrato.title, data: primeiroContrato.created_at });
  marcosEvolucao.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  // ── Financeiro real ──────────────────────────────────────────────────
  const receitasTotal = transacoesArtista
    .filter((t) => t.tipo === "receita" && t.status === "pago")
    .reduce((sum, t) => sum + (t.valor ?? 0), 0);
  const despesasTotal = transacoesArtista
    .filter((t) => t.tipo === "despesa" && t.status === "pago")
    .reduce((sum, t) => sum + (t.valor ?? 0), 0);
  const saldoTotal = receitasTotal - despesasTotal;
  const roiGeral = despesasTotal > 0 ? saldoTotal / despesasTotal : null;
  const margemGeral = receitasTotal > 0 ? saldoTotal / receitasTotal : null;
  const receitasPagas = transacoesArtista.filter(
    (t) => t.tipo === "receita" && t.status === "pago",
  );
  const receitasNatureza = NATUREZA_BUCKETS.map((b) => ({
    label: b.label,
    total: receitasPagas
      .filter((t) => b.keywords.some((k) => String((t as { categoria?: string }).categoria ?? "").toLowerCase().includes(k)))
      .reduce((s, t) => s + (t.valor ?? 0), 0),
  }));
  const receitasNaturezaOutros = receitasPagas
    .filter((t) => !NATUREZA_BUCKETS.some((b) => b.keywords.some((k) => String((t as { categoria?: string }).categoria ?? "").toLowerCase().includes(k))))
    .reduce((s, t) => s + (t.valor ?? 0), 0);
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
  const contratosFiltrados = contratosReais.filter((c) => {
    const cfg = CONTRATO_FILTERS.find((f) => f.key === contratoFilter);
    if (!cfg || !cfg.tipos) return true;
    return cfg.tipos.includes(String(c.tipo ?? "").toLowerCase());
  });

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
        descricao: `Contrato assinado: ${c.title}`,
        data: c.created_at,
        usuario: "Admin",
      });
  });
  obrasReais.slice(0, 5).forEach((o: any) => {
    if (o.created_at)
      historicoReal.push({
        id: `obra-${o.id}`,
        tipo: "obra",
        descricao: `Obra registrada: ${o.title}`,
        data: o.created_at,
        usuario: "Produtor",
      });
  });
  lancamentosReais.slice(0, 5).forEach((l: any) => {
    if (l.created_at)
      historicoReal.push({
        id: `lanc-${l.id}`,
        tipo: "obra",
        descricao: `Lançamento registrado: ${l.title}`,
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
    title: "",
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
      title: "",
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
    if (!metaForm.title || !metaForm.tipo || !metaForm.valorMeta) return;
    const payload = {
      artist_id: artistId,
      title: metaForm.title,
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
      await updateMeta({ id: String(editingMeta.id), ...payload });
    } else {
      await addMeta(payload);
    }
    resetForm();
  };

  const handleEditMeta = (meta: any) => {
    setMetaForm({
      title: meta.title || meta.tipo_meta || "",
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
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden bg-card">
        <DialogTitle className="sr-only">
          Visão 360 do artista {artista.nome_artistico}
        </DialogTitle>
        <div className="border-b border-border shrink-0 bg-card">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-foreground shrink-0"
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
                    <Badge variant="neutral">
                      {artista.genero_musical || "Não informado"}
                    </Badge>
                    {artista.status === "onboarding" ? (
                      <Badge variant="warning">
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
                          <Badge variant="success">Artista exclusivo</Badge>
                        ) : (
                          <Badge variant="info">Artista parceiro</Badge>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-1 flex-col min-h-0 bg-card">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 overflow-x-auto shrink-0">
            <TabsTrigger
              value="visao-geral"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="perfil"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Perfil
            </TabsTrigger>
            <TabsTrigger
              value="catalogo"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Catálogo
            </TabsTrigger>
            <TabsTrigger
              value="agenda"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Agenda
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Financeiro
            </TabsTrigger>
            <TabsTrigger
              value="contratos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Contratos
            </TabsTrigger>
            <TabsTrigger
              value="evolucao"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
              data-testid="tab-evolucao"
            >
              Evolução
            </TabsTrigger>
            <TabsTrigger
              value="marketing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Marketing
            </TabsTrigger>
            <TabsTrigger
              value="conteudos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Conteúdos
            </TabsTrigger>
            <TabsTrigger
              value="movimentacao"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Movimentação
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Scroll owner do modal. Usa overflow nativo em vez de ScrollArea:
              o Viewport do Radix depende de height:100%, que NÃO resolve contra um
              pai dimensionado por flex-grow — media 1467px dentro de um Root de 681px,
              logo scrollHeight === clientHeight e o scroll nunca acontecia. Um container
              de overflow nativo é dimensionado pelo próprio flex e rola de facto. */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
            data-testid="visao360-scroll"
            tabIndex={0}
            role="region"
            aria-label="Conteúdo da Visão 360"
          >
            {/* Visão Geral */}
            <TabsContent value="visao-geral" className="p-6 space-y-6 mt-0">
              {/* KPIs executivos */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Resumo Executivo</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <DollarSign className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className={`text-lg font-bold ${getCurrencyToneClass(receitasTotal)}`}>{formatCurrency(receitasTotal)}</p>
                      <p className="text-xs text-muted-foreground">Receita Total</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <DollarSign className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className={`text-lg font-bold ${getCurrencyToneClass(-despesasTotal)}`}>{formatCurrency(-despesasTotal)}</p>
                      <p className="text-xs text-muted-foreground">Despesas Totais</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className={`text-lg font-bold ${getCurrencyToneClass(saldoTotal)}`}>{formatCurrency(saldoTotal)}</p>
                      <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <BarChart3 className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-lg font-bold">{roiGeral != null ? `${Math.round(roiGeral * 100)}%` : "—"}</p>
                      <p className="text-xs text-muted-foreground">ROI Geral</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <Calendar className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-lg font-bold">{showsConfirmados}</p>
                      <p className="text-xs text-muted-foreground">Shows Confirmados</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <Rocket className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-lg font-bold">{lancamentosAtivos}</p>
                      <p className="text-xs text-muted-foreground">Lançamentos Ativos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Widgets de acompanhamento */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" /> Próximo Show
                    </div>
                    {proximoShow ? (
                      <>
                        <p className="text-sm font-semibold truncate">{proximoShow.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDateDMY(proximoShow.data)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum agendado</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Rocket className="h-3.5 w-3.5" /> Próximo Lançamento
                    </div>
                    {proximoLancamento ? (
                      <>
                        <p className="text-sm font-semibold truncate">{proximoLancamento.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDateDMY(proximoLancamento.data_lancamento)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum agendado</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Zap className="h-3.5 w-3.5" /> Campanhas Ativas
                    </div>
                    <p className="text-xl font-bold">{campanhasAtivasCount}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Video className="h-3.5 w-3.5" /> Conteúdos Pendentes
                    </div>
                    <p className="text-xl font-bold">{conteudosPendentes}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <FileText className="h-3.5 w-3.5" /> Contratos Ativos
                    </div>
                    <p className="text-xl font-bold">{contratosAtivos}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Posicionamento da Carreira (Fase 3.2 Parte IV — consolida
                  Career Stage + Market Benchmark em um único diagnóstico;
                  ambos calculados no backend a partir de métricas
                  Soundcharts já ingeridas) */}
              <PositioningCard artistId={artista.id} />

              {/* Métricas */}
              <div className="grid grid-cols-5 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Building className="h-4 w-4 text-primary" />
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
                      <p className={`text-xl font-bold ${getCurrencyToneClass(receitasTotal)}`}>
                        {formatCurrency(receitasTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Despesas</p>
                      <p className={`text-xl font-bold ${getCurrencyToneClass(-despesasTotal)}`}>
                        {formatCurrency(-despesasTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo</p>
                      <p
                        className={`text-xl font-bold ${getCurrencyToneClass(saldoTotal)}`}
                      >
                        {formatCurrency(saldoTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className={`text-xl font-bold ${getCurrencyToneClass(pendentesTotal)}`}>
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
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Banco</p>
                      <p className="text-sm font-medium break-words">
                        {artista.banco?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Não informado"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Agência</p>
                      <p className="text-sm font-medium break-words">
                        {artista.agencia || "Não informado"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Conta</p>
                      <p className="text-sm font-medium break-words">
                        {artista.conta || "Não informado"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Titular da Conta</p>
                      <p className="text-sm font-medium break-words">
                        {artista.titular_conta || artista.nome_civil || "Não informado"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Chave PIX</p>
                      <p className="text-sm font-medium break-words">
                        {artista.chave_pix || "Não informado"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Perfis e Redes Sociais */}
              <ArtistaPlatformMetrics
                artistId={artista.id}
                spotifyUrl={artista.spotify_url ?? null}
                youtubeUrl={artista.youtube_url ?? null}
                instagramUrl={artista.instagram_url ?? null}
                tiktokUrl={artista.tiktok_url ?? null}
                deezerUrl={artista.deezer_url ?? null}
                appleMusicUrl={artista.apple_music_url ?? null}
                soundcloudUrl={artista.soundcloud_url ?? null}
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

              {/* Equipe Vinculada (CRM) — dados resolvidos dinamicamente do CRM */}
              {contatosVinculadosResolvidos.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Equipe Vinculada (CRM)</h3>
                    </div>
                    <div className="space-y-4">
                      {contatosVinculadosResolvidos.map((c) => (
                        <div key={c.id} className="p-3 rounded-lg border border-border/50 bg-background/40 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{c.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {labelFor(contactTypeOptions, c.contactType)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(c.phone || c.whatsapp) && (
                              <div>
                                <p className="text-xs text-muted-foreground">Telefone</p>
                                <p className="text-sm">{c.phone || c.whatsapp}</p>
                              </div>
                            )}
                            {c.email && (
                              <div>
                                <p className="text-xs text-muted-foreground">E-mail</p>
                                <p className="text-sm">{c.email}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Equipa / Contactos (legado — dados embutidos antigos / auto-cadastro público) */}
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
                        <h3 className="font-semibold">Equipe / Contatos</h3>
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
                <span>Data do Cadastro: </span>
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
                            className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <ExternalLink className="h-5 w-5 text-foreground" />
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
                                  {obra.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs shrink-0"
                                >
                                  {formatStatusPtBr(obra.status)}
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
                                    {fono.title}
                                  </p>
                                  {fono.gravadora && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {fono.gravadora}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs shrink-0"
                                >
                                  {formatStatusPtBr(fono.status)}
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
                                    {lanc.title}
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
                                  className="text-xs shrink-0"
                                >
                                  {formatStatusPtBr(lanc.status)}
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
                                    {proj.title}
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
                                  className={`text-xs shrink-0 ${getProjectStatusBadgeClass(proj.status)}`}
                                >
                                  {formatStatusPtBr(proj.status)}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="bg-success/10 border-success/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Receitas Totais
                    </p>
                    <p className={`text-2xl font-bold ${getCurrencyToneClass(receitasTotal)}`}>
                      {formatCurrency(receitasTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/10 border-destructive/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Despesas Totais
                    </p>
                    <p className={`text-2xl font-bold ${getCurrencyToneClass(-despesasTotal)}`}>
                      {formatCurrency(-despesasTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-600/10 border-blue-600/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p
                      className={`text-2xl font-bold ${getCurrencyToneClass(saldoTotal)}`}
                    >
                      {formatCurrency(saldoTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-warning/10 border-warning/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className={`text-2xl font-bold ${getCurrencyToneClass(pendentesTotal)}`}>
                      {formatCurrency(pendentesTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Margem</p>
                    <p className="text-2xl font-bold">
                      {margemGeral != null ? `${Math.round(margemGeral * 100)}%` : "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="text-2xl font-bold">
                      {roiGeral != null ? `${Math.round(roiGeral * 100)}%` : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Receitas por natureza */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Receitas por Natureza</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[...receitasNatureza, { label: "Outros", total: receitasNaturezaOutros }].map((n) => (
                      <div key={n.label} className="text-center p-3 bg-primary/10 rounded-lg">
                        <p className={`text-lg font-bold ${getCurrencyToneClass(n.total)}`}>{formatCurrency(n.total)}</p>
                        <p className="text-xs text-muted-foreground">{n.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

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
                                ` · ${t.categoria.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <p
                              className={`text-sm font-bold ${t.tipo === "receita" ? "text-success" : "text-destructive"}`}
                            >
                              {t.tipo === "receita" ? "+" : ""}
                              {formatCurrency(t.tipo === "receita" ? t.valor : -t.valor)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {t.status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "—"}
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

              {/* Filtros por tipo */}
              <div className="flex flex-wrap gap-2">
                {CONTRATO_FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant={contratoFilter === f.key ? "default" : "outline"}
                    onClick={() => setContratoFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              {/* Lista de Contratos */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">
                    Contratos ({contratosFiltrados.length})
                  </h3>
                  {contratosFiltrados.length > 0 ? (
                    <div className="space-y-3">
                      {contratosFiltrados.map((contrato) => {
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
                                  {contrato.title}
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
                                  Valor: <span className={getMonetarySemanticClass("neutral")}>{formatCurrency(contrato.valor)}</span>
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

            {/* Marketing */}
            <TabsContent value="marketing" className="p-6 space-y-6 mt-0">
              {/* Campanhas */}
              {campanhasReais.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-2">
                    <Zap className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Nenhuma campanha vinculada
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Campanhas de marketing vinculadas a este artista aparecerão aqui.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                CAMPANHA_SECOES.map((secao) => {
                  const items = campanhasReais.filter((c) =>
                    secao.status.includes(String(c.status ?? "").toLowerCase()),
                  );
                  if (items.length === 0) return null;
                  return (
                    <Card key={secao.key} className="bg-muted/30">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">
                          {secao.label} ({items.length})
                        </h3>
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_110px_100px] gap-3 px-1 pb-2 text-xs font-medium text-muted-foreground border-b border-border">
                          <span>Campanha</span>
                          <span>Canal</span>
                          <span>Investimento</span>
                          <span>Status</span>
                          <span>Resultado</span>
                        </div>
                        <div className="divide-y divide-border/40">
                          {items.map((c) => {
                            const canais = (c.platforms ?? [])
                              .map((p) => CHANNEL_LABELS[String(p).toLowerCase()] ?? p)
                              .join(", ");
                            const roi = c.metrics?.roi;
                            const resultado =
                              roi && roi > 0
                                ? `ROI ${Math.round(roi * 100)}%`
                                : c.metrics?.conversions
                                  ? `${c.metrics.conversions} conv.`
                                  : "—";
                            return (
                              <div
                                key={c.id}
                                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_110px_100px] gap-3 px-1 py-2 items-center text-sm"
                              >
                                <span className="truncate font-medium">{c.name}</span>
                                <span className="truncate text-muted-foreground">{canais || "—"}</span>
                                <span className="text-muted-foreground">{formatCurrency(c.budget ?? 0)}</span>
                                <span>
                                  <Badge variant="outline" className="text-xs">
                                    {CAMPAIGN_STATUS_LABELS[String(c.status ?? "").toLowerCase()] ?? formatStatusPtBr(c.status)}
                                  </Badge>
                                </span>
                                <span className="text-muted-foreground">{resultado}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              {/* Metas */}
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
                      className={primaryCompactButtonClass}
                      onClick={() => setShowMetaForm(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
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
                        className={primaryCompactButtonClass}
                        onClick={() => setShowMetaForm(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
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
                        const title =
                          (meta as any).title ||
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
                                    <h4 className="font-medium">{title}</h4>
                                    <Badge
                                      className={
                                        statusInfo?.color ?? "bg-gray-500"
                                      }
                                    >
                                      {statusInfo?.label ?? meta.status}
                                    </Badge>
                                  </div>
                                  {meta.descricao &&
                                    title !== meta.descricao && (
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

              {/* Marcos / Linha do tempo */}
              {marcosEvolucao.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="h-5 w-5 text-warning" />
                      <h3 className="font-semibold">Marcos</h3>
                    </div>
                    <div className="space-y-3">
                      {marcosEvolucao.map((m) => (
                        <div key={m.id} className="flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{m.label}</p>
                              <span className="text-xs text-muted-foreground shrink-0">{formatDateDMY(m.data)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{m.descricao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Histórico */}
            {/* Agenda */}
            <TabsContent value="agenda" className="p-6 space-y-6 mt-0">
              <div className="flex flex-wrap gap-2">
                {AGENDA_FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant={agendaFilter === f.key ? "default" : "outline"}
                    onClick={() => setAgendaFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              {agendaFiltrada.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-2">
                    <Calendar className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Nenhum compromisso na agenda
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Shows, reuniões, ensaios e gravações vinculados a este artista aparecerão aqui.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">
                      Compromissos ({agendaFiltrada.length})
                    </h3>
                    <div className="grid grid-cols-[88px_60px_110px_minmax(0,1fr)_minmax(0,1fr)_110px] gap-3 px-1 pb-2 text-xs font-medium text-muted-foreground border-b border-border">
                      <span>Data</span>
                      <span>Hora</span>
                      <span>Tipo</span>
                      <span>Título</span>
                      <span>Local</span>
                      <span>Status</span>
                    </div>
                    <ScrollArea className="h-[320px]">
                      <div className="divide-y divide-border/40">
                        {agendaFiltrada.map((e) => (
                          <div
                            key={e.id}
                            className="grid grid-cols-[88px_60px_110px_minmax(0,1fr)_minmax(0,1fr)_110px] gap-3 px-1 py-2 items-center text-sm"
                          >
                            <span className="text-muted-foreground">{formatDateDMY(e.data)}</span>
                            <span className="text-muted-foreground">
                              {e.data ? new Date(e.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                            <span className="truncate">{getBackendEventTypeLabel(e.tipo)}</span>
                            <span className="truncate font-medium">{e.title}</span>
                            <span className="truncate text-muted-foreground">{e.local || e.cidade || "—"}</span>
                            <span>
                              <Badge variant="outline" className="text-xs">
                                {EVENTO_STATUS_LABELS[String(e.status ?? "").toLowerCase()] ?? formatStatusPtBr(e.status)}
                              </Badge>
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Conteúdos */}
            <TabsContent value="conteudos" className="p-6 space-y-6 mt-0">
              <div className="flex flex-wrap gap-2">
                {CONTEUDO_FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant={conteudoFilter === f.key ? "default" : "outline"}
                    onClick={() => setConteudoFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              {conteudosFiltrados.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-2">
                    <Video className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Nenhum conteúdo vinculado
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Reels, vídeos, fotos, teasers e demais conteúdos vinculados a este artista aparecerão aqui.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">
                      Conteúdos ({conteudosFiltrados.length})
                    </h3>
                    <div className="grid grid-cols-[minmax(0,1fr)_110px_110px_100px_110px_120px] gap-3 px-1 pb-2 text-xs font-medium text-muted-foreground border-b border-border">
                      <span>Título</span>
                      <span>Tipo</span>
                      <span>Formato</span>
                      <span>Data Prevista</span>
                      <span>Status</span>
                      <span>Responsável</span>
                    </div>
                    <ScrollArea className="h-[320px]">
                      <div className="divide-y divide-border/40">
                        {conteudosFiltrados.map((c) => (
                          <div
                            key={c.id}
                            className="grid grid-cols-[minmax(0,1fr)_110px_110px_100px_110px_120px] gap-3 px-1 py-2 items-center text-sm"
                          >
                            <span className="truncate font-medium">{c.title}</span>
                            <span className="truncate text-muted-foreground">
                              {CONTENT_TYPE_LABELS[String(c.type ?? "").toLowerCase()] ?? formatStatusPtBr(c.type)}
                            </span>
                            <span className="truncate text-muted-foreground">{c.format || "—"}</span>
                            <span className="text-muted-foreground">{formatDateDMY(c.publishDate)}</span>
                            <span>
                              <Badge variant="outline" className="text-xs">
                                {CONTENT_STATUS_LABELS[String(c.status ?? "").toLowerCase()] ?? formatStatusPtBr(c.status)}
                              </Badge>
                            </span>
                            <span className="truncate text-muted-foreground">{c.owner || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Movimentação */}
            <TabsContent value="movimentacao" className="p-6 space-y-6 mt-0">
              {movimentacaoItems.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-2">
                    <Clock className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Nenhuma movimentação registrada
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Ações comerciais, de marketing, financeiras, de produção, jurídicas e de agenda aparecerão aqui.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">
                      Movimentação ({movimentacaoItems.length})
                    </h3>
                    <div className="grid grid-cols-[110px_110px_minmax(0,1fr)_120px] gap-3 px-1 pb-2 text-xs font-medium text-muted-foreground border-b border-border">
                      <span>Data</span>
                      <span>Tipo</span>
                      <span>Descrição</span>
                      <span>Responsável</span>
                    </div>
                    <ScrollArea className="h-[360px]">
                      <div className="divide-y divide-border/40">
                        {movimentacaoItems.map((m) => (
                          <div
                            key={m.id}
                            className="grid grid-cols-[110px_110px_minmax(0,1fr)_120px] gap-3 px-1 py-2 items-center text-sm"
                          >
                            <span className="text-muted-foreground">{formatDateDMY(m.data)}</span>
                            <span>
                              <Badge variant="outline" className="text-xs">{m.tipo}</Badge>
                            </span>
                            <span className="truncate">{m.descricao}</span>
                            <span className="truncate text-muted-foreground">{m.responsavel}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="historico" className="p-6 space-y-6 mt-0">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Histórico de Atividades</h3>
                  </div>

                  {historicoReal.length > 0 ? (
                    <>
                      <div className="grid grid-cols-[140px_120px_130px_minmax(0,1fr)] gap-3 px-1 pb-2 text-xs font-medium text-muted-foreground border-b border-border">
                        <span>Data</span>
                        <span>Usuário</span>
                        <span>Ação</span>
                        <span>Detalhes</span>
                      </div>
                      <ScrollArea className="h-[360px]">
                        <div className="divide-y divide-border/40">
                          {historicoReal.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[140px_120px_130px_minmax(0,1fr)] gap-3 px-1 py-2 items-center text-sm"
                            >
                              <span className="text-muted-foreground">
                                {new Date(item.data).toLocaleDateString("pt-BR")}{" "}
                                {new Date(item.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                {item.usuario}
                              </span>
                              <span>{getHistoricoBadge(item.tipo)}</span>
                              <span className="flex items-center gap-2 truncate">
                                <span className="text-muted-foreground shrink-0">{getHistoricoIcon(item.tipo)}</span>
                                <span className="truncate">{item.descricao}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhum registro de histórico encontrado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
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
                  value={metaForm.title}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, title: e.target.value })
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
