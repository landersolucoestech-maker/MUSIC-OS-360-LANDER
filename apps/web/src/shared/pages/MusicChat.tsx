import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import {
  ChatAttachment,
  resolveAttachmentKind,
  type ChatAttachmentData,
} from "@/shared/components/ChatAttachment";
import { toast } from "sonner";
import { useMarketingOAuth } from "@/modules/integrations/hooks/useMarketingOAuth";
import { LeadFormModal, type LeadFormPayload } from "@/modules/leads/modals/LeadFormModal";
import { useLeads } from "@/modules/leads/hooks";
import type { Lead, LeadClientType, LeadServiceType } from "@/modules/leads/types";
import { ContatoFormModal, type ContatoFormPayload } from "@/modules/crm-relationships/modals/ContatoFormModal";
import { useContacts } from "@/modules/crm-relationships/hooks/useContacts";
import { contatoPayloadToContactData } from "@/modules/crm-relationships/services/contacts.service";
import { SchedulerFormModal } from "@/modules/events/components/SchedulerFormModal";
import { useMusicChatAutomationSettings } from "@/modules/musicchat/hooks/useMusicChatAutomationSettings";
import { useMusicChatTriageRules } from "@/modules/musicchat/hooks/useMusicChatTriageRules";
import { musicChatConversationsService } from "@/modules/musicchat/services/conversations.service";
import { getExpectedUpdatedAt, handleConcurrencyConflict } from "@/shared/hooks/useConcurrencyConflict";
import { useTenant } from "@/app/providers/TenantContext";
import {
  Archive,
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Headphones,
  Inbox,
  Link,
  MessageCircle,
  MessageSquare,
  Mic,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Tag,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";

type MusicChatArea = "internal" | "support";
type InternalFilter = "todas" | "nao-lidas" | "favoritas";
type SupportChannel = "whatsapp" | "instagram" | "facebook" | "tiktok" | "site" | "custom";
type SupportStatus =
  | "nova"
  | "aguardando_atendimento"
  | "em_atendimento"
  | "aguardando_cliente"
  | "resolvida"
  | "arquivada";
type DeadlineState = "on_track" | "at_risk" | "overdue";

interface SupportConversation {
  id: string;
  customer: string;
  handle: string;
  phone: string;
  instagram: string;
  email: string;
  originLabel: string;
  channel: SupportChannel;
  queue: string;
  sector: string;
  status: SupportStatus;
  assignee: string;
  protocol: string;
  sla: number;
  remainingTimeLabel: string;
  deadlineState: DeadlineState;
  tags: string[];
  /** Assunto do formulário do site (origem "Site"). */
  assunto?: string;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  lastReplyAt: string;
  unread: number;
  value: string;
  crmSummary: {
    existingCustomer: boolean;
    lead: string;
    openDeal: string;
    stage: string;
  };
  auditTrail: string[];
  /** Concorrência otimista (Task M) — ver useConcurrencyConflict. */
  updated_at: string;
}

interface SupportMessage {
  id: string;
  sender: "customer" | "agent" | "system";
  author: string;
  body: string;
  time: string;
  attachments?: ChatAttachmentData[];
}

const statusLabels: Record<SupportStatus, string> = {
  nova: "Nova",
  aguardando_atendimento: "Aguardando Atendimento",
  em_atendimento: "Em Atendimento",
  aguardando_cliente: "Aguardando Cliente",
  resolvida: "Resolvida",
  arquivada: "Arquivada",
};

const channelLabels: Record<SupportChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram DM",
  facebook: "Facebook DM",
  tiktok: "TikTok DM",
  site: "Site",
  custom: "Canal Futuro",
};

const channelStyles: Record<SupportChannel, string> = {
  whatsapp: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  instagram: "border-pink-500/30 bg-pink-500/10 text-pink-700",
  facebook: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  tiktok: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700",
  site: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700",
  custom: "border-violet-500/30 bg-violet-500/10 text-violet-700",
};

const statusStyles: Record<SupportStatus, string> = {
  nova: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  aguardando_atendimento: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  em_atendimento: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  aguardando_cliente: "border-orange-500/30 bg-orange-500/10 text-orange-700",
  resolvida: "border-muted bg-muted text-muted-foreground",
  arquivada: "border-border bg-background text-muted-foreground",
};

const deadlineLabels: Record<DeadlineState, string> = {
  on_track: "Dentro do prazo",
  at_risk: "Próximo do vencimento",
  overdue: "Prazo vencido",
};

const deadlineStyles: Record<DeadlineState, string> = {
  on_track: "text-emerald-700",
  at_risk: "text-amber-700",
  overdue: "text-red-700",
};

const deadlineProgressStyles: Record<DeadlineState, string> = {
  on_track: "bg-emerald-500",
  at_risk: "bg-amber-500",
  overdue: "bg-red-500",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function currentTimeLabel() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function recordingDurationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

const teamMembers = ["Ana Mendes", "Lucas Araujo", "Bianca Rocha", "Sem responsável"];

const quickReplies = [
  "Olá! Recebemos o seu contato e já estamos verificando. Em instantes retornamos.",
  "Pode nos enviar mais detalhes para encaminharmos a melhor proposta?",
  "Agradecemos o contato! Vamos encaminhar para o time responsável e retornamos em breve.",
];

const leadClientByType: Partial<Record<LeadFormPayload["tipo_lead"], LeadClientType>> = {
  artista_banda: "artist",
  contratante_show: "venue",
  marca_empresa: "brand",
  produtora_eventos: "eventProducer",
  gravadora_selo: "label",
  empresario_artistico: "company",
  blog: "other",
  influenciador: "creator",
  outros: "other",
};

const leadServiceByService: Record<string, LeadServiceType> = {
  agenciamento_gestao: "gestaoArtistica",
  producao_musical: "producaoMusical",
  edicao_musical: "registroAutoral",
  producao_audiovisual: "videoclipe",
  marketing_digital: "marketingMusical",
  criacao_sites: "desenvolvimentoSite",
  consultoria: "consultoria",
  contratacao_artistas: "show",
  eventos_corporativos: "producaoEvento",
  campanhas_artistas: "marketingMusical",
  licenciamento_musical: "licenciamento",
  divulgacao_eventos: "marketingMusical",
  parcerias_comerciais: "consultoria",
  distribuicao_digital: "distribuicaoDigital",
  gestao_catalogo: "consultoria",
  estrategia_carreira: "gestaoArtistica",
  administracao_editorial: "registroAutoral",
  registro_obras: "registroAutoral",
  arrecadacao_autoral: "registroAutoral",
  sincronizacao: "licenciamento",
  influenciadores: "marketingMusical",
  producao_eventos: "producaoEvento",
  marketing_influencia: "marketingMusical",
  gestao_imagem: "marketingMusical",
  atendimento_personalizado: "consultoria",
  parcerias: "consultoria",
  projetos_especiais: "consultoria",
};

const leadOriginByChannel: Partial<Record<SupportChannel, string>> = {
  whatsapp: "whatsapp",
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "outro",
  site: "website",
  custom: "outro",
};

function buildConversationContext(conversation: SupportConversation) {
  return [
    `Origem: ${conversation.originLabel}`,
    `Protocolo: ${conversation.protocol}`,
    `Cliente: ${conversation.customer}`,
    `Contato: ${conversation.handle}`,
    `Fila: ${conversation.queue}`,
    `Setor: ${conversation.sector}`,
    `Ultima mensagem: ${conversation.lastMessage}`,
    conversation.tags.length > 0 ? `Tags: ${conversation.tags.join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

function buildLeadInitialValue(conversation: SupportConversation): Partial<LeadFormPayload> {
  return {
    nome: conversation.customer,
    email: conversation.email,
    telefone: conversation.phone || conversation.handle,
    instagram: conversation.instagram,
    tipo_lead: "contratante_show",
    servico: "contratacao_artistas",
    descricao: buildConversationContext(conversation),
    origem_lead: leadOriginByChannel[conversation.channel] ?? "outro",
    data_entrada: new Date().toISOString().split("T")[0],
    status_lead: "novo_lead",
    prioridade: conversation.deadlineState === "overdue" ? "alta" : "media",
    responsavel: conversation.assignee === "Sem responsável" ? "" : conversation.assignee,
    interacoes: [],
    uploads: [],
  };
}

function buildContactInitialValue(conversation: SupportConversation): Partial<ContatoFormPayload> {
  const priority = conversation.deadlineState === "overdue" ? "high" : "medium";
  const responsible = conversation.assignee === "Sem responsável" ? "" : conversation.assignee;
  return {
    tipo_pessoa: "pessoa_fisica",
    nome_pf: conversation.customer,
    email: conversation.email,
    telefone: conversation.phone || conversation.handle,
    categoria: "",
    status_contato: "active",
    prioridade_contato: priority,
    responsavel_nome: responsible,
    interacoes: [],
    attachments: [],
    observacoes: buildConversationContext(conversation),
    nome: conversation.customer,
    cpf_cnpj: "",
    endereco: "",
    endereco_completo: "",
    responsavel: responsible,
    status: "active",
    prioridade: priority,
  };
}

function buildEventInitialValue(conversation: SupportConversation) {
  return {
    titulo: `Atendimento - ${conversation.customer}`,
    tipoEvento: "reunioes",
    tipo_evento: "reunioes",
    status: "agendado",
    dataInicio: new Date(),
    horarioInicio: "",
    nomeLocal: conversation.originLabel,
    contatoLocal: conversation.phone || conversation.handle,
    descricao: buildConversationContext(conversation),
    observacoes: `Criado a partir do MusicChat. ${conversation.protocol}`,
  };
}

function leadPayloadToLead(
  payload: LeadFormPayload,
): Omit<Lead, "id" | "createdAt" | "updatedAt" | "historicoInteracoes"> {
  return {
    nomeCompleto: payload.nome,
    nomeArtistico: payload.nome_artista_servico,
    empresa: payload.empresa,
    email: payload.email,
    whatsapp: payload.telefone,
    instagram: payload.instagram,
    cidade: payload.cidade,
    estado: payload.estado,
    pais: "Brasil",
    tipoCliente: leadClientByType[payload.tipo_lead] ?? "other",
    tipoServico: leadServiceByService[payload.servico] ?? "consultoria",
    payloadServico: {
      tipo_lead: payload.tipo_lead,
      servico: payload.servico,
      nome_artista_servico: payload.nome_artista_servico,
      descricao: payload.descricao,
      cargo: payload.cargo,
      website: payload.website,
      endereco: payload.endereco,
      data_entrada: payload.data_entrada,
      responsavel: payload.responsavel,
      interacoes: payload.interacoes,
      ...(payload.evento ?? payload.campanha ?? payload.influenciador ?? payload.empresario ?? {}),
    },
    dadosInternosCRM: {
      statusLead: payload.status_lead,
      prioridade: payload.prioridade,
      origemLead: payload.origem_lead,
      responsavel: payload.responsavel,
      campanha_marketing: payload.campanha_marketing,
    },
    uploads: payload.uploads ?? [],
  };
}

function ChannelIcon({ channel }: { channel: SupportChannel }) {
  if (channel === "instagram") return <SiInstagram className="h-3.5 w-3.5" />;
  if (channel === "facebook") return <SiFacebook className="h-3.5 w-3.5" />;
  if (channel === "tiktok") return <SiTiktok className="h-3.5 w-3.5" />;
  if (channel === "site") return <Globe className="h-3.5 w-3.5" />;
  if (channel === "custom") return <Inbox className="h-3.5 w-3.5" />;
  return <Phone className="h-3.5 w-3.5" />;
}

function InternalChatView() {
  const [activeFilter, setActiveFilter] = useState<InternalFilter>("todas");

  return (
    <div className="flex h-[calc(100vh-248px)] min-h-[560px] gap-4">
      <Card className="flex w-[350px] flex-col border-border bg-card">
        <CardHeader className="space-y-4 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Chat Interno
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Conversas entre usuários, grupos e departamentos da empresa.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar conversas internas..." className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            {[
              ["todas", "Todas"],
              ["nao-lidas", "Não lidas"],
              ["favoritas", "Favoritas"],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={activeFilter === value ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setActiveFilter(value as InternalFilter)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MessageCircle className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhuma conversa ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            O chat interno continua isolado da Central de Atendimento.
          </p>
          <Button variant="link" size="sm" className="mt-2 h-auto p-0">
            Iniciar nova conversa
          </Button>
        </CardContent>
      </Card>

      <Card className="flex flex-1 flex-col border-border bg-card">
        <CardContent className="flex h-full flex-col items-center justify-center text-center">
          <MessageCircle className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">Selecione uma conversa interna</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Escolha um canal, grupo ou conversa direta para acessar histórico, arquivos, aúdios e notificações.
          </p>
          <Button className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Nova Mensagem
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ConversationListItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: SupportConversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
        active ? "bg-primary/5" : "bg-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-muted text-xs">{getInitials(conversation.customer)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{conversation.customer}</p>
              <p className="truncate text-xs text-muted-foreground">{conversation.handle}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{conversation.lastMessageAt}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{conversation.lastMessage}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={`gap-1 text-[10px] ${channelStyles[conversation.channel]}`}>
              <ChannelIcon channel={conversation.channel} />
              {channelLabels[conversation.channel]}
            </Badge>
            {conversation.unread > 0 && (
              <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
                {conversation.unread}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function SupportCenterView() {
  const { createLead } = useLeads();
  const { createContact } = useContacts();
  const { settings: automationSettings } = useMusicChatAutomationSettings();
  const { runEscalations } = useMusicChatTriageRules();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, SupportMessage[]>>({});
  const [selectedId, setSelectedId] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentData[]>([]);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const { isConnected: isMarketingConnected } = useMarketingOAuth();
  const messagingChannels = [
    { id: "facebook", label: "Facebook", connected: isMarketingConnected("meta_business"), icon: SiFacebook },
    { id: "instagram", label: "Instagram", connected: isMarketingConnected("meta_business"), icon: SiInstagram },
    { id: "tiktok", label: "TikTok", connected: isMarketingConnected("tiktok_business"), icon: SiTiktok },
  ];
  const quickReplyOptions = useMemo(
    () => (automationSettings?.templates?.length ? automationSettings.templates.slice(0, 3).map((template) => template.body) : quickReplies),
    [automationSettings?.templates],
  );


  useEffect(() => {
    let active = true;
    setLoadingConversations(true);
    void musicChatConversationsService.list()
      .then((rows) => {
        if (!active) return;
        setConversations(rows);
        setSelectedId((current) => current || rows[0]?.id || "");
      })
      .catch(() => {
        if (active) toast.error("Não foi possível carregar as conversas do MusicChat.");
      })
      .finally(() => {
        if (active) setLoadingConversations(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId || messagesByConv[selectedId]) return;
    let active = true;
    void musicChatConversationsService.messages(selectedId)
      .then((rows) => {
        if (active) setMessagesByConv((previous) => ({ ...previous, [selectedId]: rows }));
      })
      .catch(() => {
        if (active) toast.error("Não foi possível carregar as mensagens desta conversa.");
      });
    return () => { active = false; };
  }, [selectedId, messagesByConv]);

  useEffect(() => {
    if (!isRecording || !recordingStartedAt) return undefined;

    const intervalId = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt) / 1000));
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [isRecording, recordingStartedAt]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const matchesChannel = channelFilter === "todos" || conversation.channel === channelFilter;
      // "Arquivada" só aparece quando o filtro de status a seleciona explicitamente;
      // na lista ativa padrão ("todos") as conversas arquivadas ficam ocultas.
      const matchesStatus =
        statusFilter === "todos"
          ? conversation.status !== "arquivada"
          : conversation.status === statusFilter;
      return matchesChannel && matchesStatus;
    });
  }, [conversations, channelFilter, statusFilter]);

  const selectedConversation =
    filteredConversations.find((conversation) => conversation.id === selectedId) ?? filteredConversations[0];

  const isClosed = selectedConversation?.status === "resolvida" || selectedConversation?.status === "arquivada";

  const messages = selectedConversation ? messagesByConv[selectedConversation.id] ?? [] : [];

  const updateConversation = (
    id: string,
    updater: (conversation: SupportConversation) => SupportConversation,
    auditEntry?: string,
  ) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== id) return conversation;
        const next = updater(conversation);
        return auditEntry ? { ...next, auditTrail: [...next.auditTrail, auditEntry] } : next;
      }),
    );
  };

  const appendMessage = (id: string, message: SupportMessage) => {
    setMessagesByConv((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), message] }));
  };

  const handleTransfer = async () => {
    if (!selectedConversation || !transferTarget) return;
    try {
      const updated = await musicChatConversationsService.update(selectedConversation.id, {
        metadata: { assignee_name: transferTarget },
        service_status: "em_atendimento",
        expectedUpdatedAt: getExpectedUpdatedAt(selectedConversation),
      });
      setConversations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      toast.success(`Conversa transferida para ${transferTarget}.`);
      setTransferOpen(false);
      setTransferTarget("");
    } catch (err) {
      if (handleConcurrencyConflict(err, "conversa")) return;
      toast.error("Não foi possível transferir a conversa.");
    }
  };

  const handleFinalize = async () => {
    if (!selectedConversation) return;
    try {
      const updated = await musicChatConversationsService.close(selectedConversation.id);
      setConversations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      toast.success("Conversa finalizada.");
    } catch {
      toast.error("Não foi possível finalizar a conversa.");
    }
  };

  const handleArchive = async () => {
    if (!selectedConversation) return;
    try {
      await musicChatConversationsService.archive(selectedConversation.id);
      setConversations((previous) => previous.filter((item) => item.id !== selectedConversation.id));
      setSelectedId("");
      toast.success("Conversa arquivada.");
    } catch {
      toast.error("Não foi possível arquivar a conversa.");
    }
  };

  const handleReopen = async () => {
    if (!selectedConversation) return;
    try {
      const updated = await musicChatConversationsService.reopen(selectedConversation.id);
      setConversations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      toast.success("Conversa reaberta.");
    } catch {
      toast.error("Não foi possível reabrir a conversa.");
    }
  };

  const handleAddTag = () => {
    if (!selectedConversation) return;
    const tag = tagDraft.trim();
    if (!tag) return;
    if (selectedConversation.tags.includes(tag)) {
      toast.info("Essa tag já está adicionada.");
      return;
    }
    updateConversation(
      selectedConversation.id,
      (conversation) => ({ ...conversation, tags: [...conversation.tags, tag] }),
      `Tag adicionada: ${tag}`,
    );
    toast.success(`Tag "${tag}" adicionada.`);
    setTagDraft("");
    setTagOpen(false);
  };

  const handleCreateLead = () => {
    if (!selectedConversation) return;
    setLeadModalOpen(true);
  };

  const handleLinkCrm = () => {
    if (!selectedConversation) return;
    setContactModalOpen(true);
  };

  const handleCreateEvent = () => {
    if (!selectedConversation) return;
    setEventModalOpen(true);
  };

  const handleLeadSubmit = async (payload: LeadFormPayload) => {
    if (!selectedConversation) return;
    await createLead(leadPayloadToLead(payload));
    updateConversation(
      selectedConversation.id,
      (conversation) => ({
        ...conversation,
        crmSummary: { ...conversation.crmSummary, lead: payload.status_lead || conversation.crmSummary.lead },
      }),
      "Lead criado a partir do MusicChat",
    );
    toast.success("Lead criado a partir da conversa.");
  };

  const handleContactSubmit = async (payload: ContatoFormPayload) => {
    if (!selectedConversation) return;
    await createContact(contatoPayloadToContactData(payload));
    updateConversation(
      selectedConversation.id,
      (conversation) => ({
        ...conversation,
        crmSummary: { ...conversation.crmSummary, existingCustomer: true },
      }),
      "Contato CRM criado e vinculado",
    );
    toast.success("Contato criado e vinculado ao CRM.");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      const attachments = files.map((file) => ({
        kind: resolveAttachmentKind(file.type, file.name),
        name: file.name,
        mime: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
        url: URL.createObjectURL(file),
      }));
      setPendingAttachments((prev) => [...prev, ...attachments]);
      toast.success(
        files.length === 1
          ? `Anexo selecionado: ${files[0].name}`
          : `${files.length} anexos selecionados.`,
      );
    }
    event.target.value = "";
  };

  const handleRemovePendingAttachment = (url: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.url !== url));
  };

  const handleToggleRecordingLegacy = () => {
    setIsRecording((prev) => {
      const next = !prev;
      toast.info(next ? "Gravação de áudio iniciada." : "Gravação de áudio finalizada.");
      return next;
    });
  };

  const stopRecordingTracks = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const finishRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Gravação de áudio não suportada neste navegador.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        toast.error("Não foi possível gravar o áudio.");
        setIsRecording(false);
        setRecordingStartedAt(null);
        setRecordingSeconds(0);
        stopRecordingTracks();
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        stopRecordingTracks();
        setIsRecording(false);
        setRecordingStartedAt(null);
        setRecordingSeconds(0);

        if (blob.size === 0) {
          toast.error("A gravação ficou vazia. Tente novamente.");
          return;
        }

        const extension = blob.type.includes("webm") ? "webm" : "ogg";
        const name = `audio-atendimento-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
        setPendingAttachments((prev) => [
          ...prev,
          {
            kind: "audio",
            name,
            mime: blob.type || "audio/webm",
            url: URL.createObjectURL(blob),
          },
        ]);
        toast.success("Áudio gravado e pronto para envio.");
      };

      recorder.start();
      setRecordingSeconds(0);
      setRecordingStartedAt(Date.now());
      setIsRecording(true);
      toast.info("Gravação de áudio iniciada.");
    } catch {
      setIsRecording(false);
      setRecordingStartedAt(null);
      setRecordingSeconds(0);
      stopRecordingTracks();
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      finishRecording();
      return;
    }

    void startRecording();
  };

  const handleQuickReply = (text: string) => {
    setDraft(text);
  };

  const handleSend = async () => {
    if (!selectedConversation) return;
    const body = draft.trim();
    if (!body && pendingAttachments.length === 0) return;
    const sentAt = currentTimeLabel();
    const attachments = pendingAttachments;
    const fallbackBody = attachments.length === 1 ? "Anexo enviado." : `${attachments.length} anexos enviados.`;
    try {
      const saved = await musicChatConversationsService.sendMessage(
        selectedConversation.id,
        body || fallbackBody,
        attachments,
      );
      appendMessage(selectedConversation.id, saved);
      updateConversation(selectedConversation.id, (conversation) => ({
        ...conversation,
        lastMessage: body || fallbackBody,
        lastMessageAt: sentAt,
      }));
      setDraft("");
      setPendingAttachments([]);
    } catch {
      toast.error("Não foi possível enviar a mensagem.");
    }
  };

  const handleInternalNote = async () => {
    if (!selectedConversation) return;
    const body = draft.trim();
    if (!body) return;
    try {
      await musicChatConversationsService.addNote(selectedConversation.id, body);
      appendMessage(selectedConversation.id, {
        id: `note-${Date.now()}`,
        sender: "system",
        author: "Nota interna",
        body,
        time: currentTimeLabel(),
      });
      toast.success("Nota interna registrada.");
      setDraft("");
    } catch {
      toast.error("Não foi possível registrar a nota interna.");
    }
  };

  return (
    <>
    <div className="grid h-[calc(100vh-248px)] min-h-[620px] grid-cols-[320px_minmax(420px,1fr)_320px] gap-4">
      <Card className="flex min-w-0 flex-col overflow-hidden border-border bg-card">
        <CardHeader className="space-y-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Headphones className="h-4 w-4" />
                Atendimento
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Filas, canais e conversas multicanal.</p>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              {loadingConversations ? "Carregando" : `${filteredConversations.length} abertas`}
            </Badge>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Canais de mensagens
            </p>
            <div className="flex flex-wrap gap-1.5">
              {messagingChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <Badge key={channel.id} variant={channel.connected ? "secondary" : "outline"} className="gap-1 text-[10px]">
                    <Icon className="h-3 w-3" />
                    {channel.label}
                    <span className="text-[9px] opacity-70">{channel.connected ? "conectado" : "desconectado"}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente, protocolo ou tag..." className="pl-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os canais</SelectItem>
                {Object.entries(channelLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Novas", "4"],
              ["Prazo risco", "2"],
              ["Sem resp.", "2"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-muted/30 px-2 py-2">
                <p className="text-sm font-semibold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          {filteredConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              active={selectedConversation?.id === conversation.id}
              onSelect={() => setSelectedId(conversation.id)}
            />
          ))}
        </ScrollArea>
      </Card>

      <Card className="flex min-w-0 flex-col overflow-hidden border-border bg-card">
        {selectedConversation ? (
          <>
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted text-xs">
                      {getInitials(selectedConversation.customer)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      {selectedConversation.customer}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`gap-1 text-[11px] ${channelStyles[selectedConversation.channel]}`}>
                        <ChannelIcon channel={selectedConversation.channel} />
                        {channelLabels[selectedConversation.channel]}
                      </Badge>
                      <Badge variant="outline" className={`text-[11px] ${statusStyles[selectedConversation.status]}`}>
                        {statusLabels[selectedConversation.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{selectedConversation.protocol}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Popover open={transferOpen} onOpenChange={setTransferOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={isClosed}>
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transferir
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Transferir para</Label>
                        <Select value={transferTarget} onValueChange={setTransferTarget}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecionar responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map((member) => (
                              <SelectItem key={member} value={member}>
                                {member}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" className="h-8 w-full text-xs" disabled={!transferTarget} onClick={handleTransfer}>
                        Confirmar transferência
                      </Button>
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={isClosed} onClick={handleFinalize}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Finalizar
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 bg-muted/20 px-5 py-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[72%] rounded-lg px-3 py-2 shadow-sm ${
                        message.sender === "system"
                          ? "border border-border bg-background text-muted-foreground"
                          : message.sender === "agent"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background text-foreground"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-4">
                        <span className="text-[11px] font-medium opacity-80">{message.author}</span>
                        <span className="text-[10px] opacity-70">{message.time}</span>
                      </div>
                      {message.body && <p className="text-sm leading-relaxed">{message.body}</p>}
                      {(message.attachments?.length ?? 0) > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments!.map((attachment) => (
                            <ChatAttachment
                              key={`${message.id}-${attachment.url}`}
                              attachment={attachment}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border p-4">
              {isClosed ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Conversa finalizada</p>
                    <p className="text-xs text-muted-foreground">Reabra a conversa para enviar novas mensagens.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleReopen}>
                    Reabrir
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {pendingAttachments.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {pendingAttachments.map((attachment) => (
                        <div
                          key={attachment.url}
                          className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">{attachment.name}</p>
                            <p className="text-[11px] text-muted-foreground">{attachment.mime}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            aria-label={`Remover ${attachment.name}`}
                            onClick={() => handleRemovePendingAttachment(attachment.url)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isRecording && (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-red-700">Gravação de áudio em andamento</p>
                          <p className="text-[11px] text-red-700/80">
                            {recordingDurationLabel(recordingSeconds)} - clique para finalizar e anexar.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 border-red-500/40 bg-background text-xs text-red-700 hover:bg-red-500/10"
                        onClick={finishRecording}
                      >
                        Parar e anexar
                      </Button>
                    </div>
                  )}
                  <Textarea
                    placeholder="Digite uma mensagem para o cliente..."
                    className="min-h-[78px] resize-none"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Anexar arquivo"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={isRecording ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        title={isRecording ? "Parar gravação" : "Gravar áudio"}
                        onClick={handleToggleRecording}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            Resposta rápida
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-80">
                          <DropdownMenuLabel>Respostas rápidas</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {quickReplyOptions.map((reply) => (
                            <DropdownMenuItem
                              key={reply}
                              className="whitespace-normal text-xs"
                              onSelect={() => handleQuickReply(reply)}
                            >
                              {reply}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={!draft.trim()}
                        onClick={handleInternalNote}
                      >
                        Nota interna
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={isRecording || (!draft.trim() && pendingAttachments.length === 0)}
                      onClick={handleSend}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <CardContent className="flex h-full flex-col items-center justify-center text-center">
            <Inbox className="mb-4 h-14 w-14 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhuma conversa encontrada</p>
          </CardContent>
        )}
      </Card>

      <Card className="flex min-w-0 flex-col overflow-hidden border-border bg-card">
        {selectedConversation && (
          <ScrollArea className="flex-1">
            <div className="space-y-5 p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Painel Operacional</h3>
                <p className="mt-1 text-xs text-muted-foreground">Cliente, prazo, CRM e acoes da conversa.</p>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium text-foreground">Cliente</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-background text-xs">
                      {getInitials(selectedConversation.customer)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{selectedConversation.customer}</p>
                    <p className="truncate text-xs text-muted-foreground">{selectedConversation.handle}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Telefone</p>
                    <p className="font-medium text-foreground">{selectedConversation.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Instagram</p>
                    <p className="font-medium text-foreground">{selectedConversation.instagram}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">E-mail</p>
                    <p className="font-medium text-foreground">{selectedConversation.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Canal de origem</p>
                    <p className="font-medium text-foreground">{selectedConversation.originLabel}</p>
                  </div>
                  {selectedConversation.assunto && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Assunto</p>
                      <p className="font-medium text-foreground">{selectedConversation.assunto}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium text-foreground">Conversa</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Protocolo</p>
                    <p className="font-medium text-foreground">{selectedConversation.protocol}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="outline" className={`mt-1 text-[11px] ${statusStyles[selectedConversation.status]}`}>
                      {statusLabels[selectedConversation.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fila</p>
                    <p className="font-medium text-foreground">{selectedConversation.queue}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Setor</p>
                    <p className="font-medium text-foreground">{selectedConversation.sector}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Responsável</p>
                    <p className="font-medium text-foreground">{selectedConversation.assignee}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Clock className="h-4 w-4" />
                    Prazo de Atendimento
                  </p>
                  <span className={`text-xs font-medium ${deadlineStyles[selectedConversation.deadlineState]}`}>
                    {deadlineLabels[selectedConversation.deadlineState]}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${deadlineProgressStyles[selectedConversation.deadlineState]}`}
                    style={{ width: `${selectedConversation.sla}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{selectedConversation.sla}% restante</span>
                  <span>{selectedConversation.remainingTimeLabel}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Tag className="h-4 w-4" />
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedConversation.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-md text-[11px]">
                      {tag}
                    </Badge>
                  ))}
                  <Popover open={tagOpen} onOpenChange={setTagOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                        + Adicionar Tag
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 space-y-2">
                      <Label className="text-xs">Nova tag</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={tagDraft}
                          onChange={(event) => setTagDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Ex.: Prioridade"
                          className="h-8 text-xs"
                        />
                        <Button size="sm" className="h-8 text-xs" disabled={!tagDraft.trim()} onClick={handleAddTag}>
                          Adicionar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Ações</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    onClick={handleCreateLead}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Criar Lead
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    onClick={handleLinkCrm}
                  >
                    <Link className="h-3.5 w-3.5" />
                    Vincular CRM
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    onClick={handleCreateEvent}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Criar Evento
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    disabled={isClosed}
                    onClick={() => setTransferOpen(true)}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Transferir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    disabled={selectedConversation.status === "arquivada"}
                    onClick={handleArchive}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Arquivar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    disabled={isClosed}
                    onClick={handleFinalize}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Finalizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start gap-1.5 text-xs"
                    disabled={runEscalations.isPending}
                    onClick={() => runEscalations.mutate(undefined)}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Escalonar
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium text-foreground">CRM</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Cliente existente</p>
                    <p className="font-medium text-foreground">
                      {selectedConversation.crmSummary.existingCustomer ? "SIM" : "NAO"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lead</p>
                    <p className="font-medium text-foreground">{selectedConversation.crmSummary.lead}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Negócio aberto</p>
                    <p className="font-medium text-foreground">{selectedConversation.crmSummary.openDeal}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Etapa</p>
                    <p className="font-medium text-foreground">{selectedConversation.crmSummary.stage}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium text-foreground">Histórico</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Criado</p>
                    <p className="font-medium text-foreground">{selectedConversation.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última resposta</p>
                    <p className="font-medium text-foreground">{selectedConversation.lastReplyAt}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Canal</p>
                    <p className="font-medium text-foreground">{selectedConversation.originLabel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium text-foreground">{statusLabels[selectedConversation.status]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fila</p>
                    <p className="font-medium text-foreground">{selectedConversation.queue}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Responsável</p>
                    <p className="font-medium text-foreground">{selectedConversation.assignee}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
    {selectedConversation && (
      <>
        <LeadFormModal
          open={leadModalOpen}
          onOpenChange={setLeadModalOpen}
          mode="create"
          initialValue={buildLeadInitialValue(selectedConversation)}
          onSubmit={handleLeadSubmit}
        />
        <ContatoFormModal
          open={contactModalOpen}
          onOpenChange={setContactModalOpen}
          mode="create"
          initialValue={buildContactInitialValue(selectedConversation)}
          onSubmit={handleContactSubmit}
        />
        <SchedulerFormModal
          open={eventModalOpen}
          onOpenChange={setEventModalOpen}
          mode="create"
          evento={buildEventInitialValue(selectedConversation)}
        />
      </>
    )}
    </>
  );
}

export default function MusicChat() {
  const navigate = useNavigate();
  const { hasPermission } = useTenant();
  const [activeArea, setActiveArea] = useState<MusicChatArea>("internal");
  const canManageAutomation = hasPermission("musicchat", "write") || hasPermission("settings", "write");

  const headerActions = (
    <div className="flex items-center gap-2">
      {canManageAutomation && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => navigate("/admin/musicchat/automacoes")}
        >
          <Settings className="h-3.5 w-3.5" />
          Configurações
        </Button>
      )}
      <Button size="sm" className="h-8 gap-1.5 text-xs" data-testid="button-nova-mensagem">
        <Plus className="h-3.5 w-3.5" />
        {activeArea === "support" ? "Nova Conversa" : "Nova Mensagem"}
      </Button>
    </div>
  );

  return (
    <MainLayout
      title="MusicChat"
      description="Chat interno e central multicanal de atendimento"
      actions={headerActions}
    >
      <div className="space-y-4 pt-[10px] pb-[10px]">
        <Tabs value={activeArea} onValueChange={(value) => setActiveArea(value as MusicChatArea)}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="internal" className="gap-2">
                <Users className="h-4 w-4" />
                Chat Interno
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-2">
                <Headphones className="h-4 w-4" />
                Central de Atendimento
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="internal" className="mt-4">
            <InternalChatView />
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <SupportCenterView />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
