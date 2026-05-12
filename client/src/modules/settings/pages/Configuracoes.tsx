import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Switch } from "@/shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/app/providers/AuthContext";
import { useUserSettings } from "@/modules/settings/hooks/useUserSettings";
import { useUsuarios, Usuario } from "@/modules/settings/hooks/useUsuarios";
import { useRoles, Role } from "@/modules/settings/hooks/useRoles";
import { UsuarioFormModal } from "@/modules/settings/components/UsuarioFormModal";
import { UsuarioViewModal } from "@/modules/settings/components/UsuarioViewModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, Building2, Zap, Shield, Palette, Globe, Link, 
  Bell, Mail, Calendar, Clock, Key, Smartphone, Eye, EyeOff,
  Sun, Moon, Monitor, Check, ExternalLink, RefreshCw, Trash2,
  Music, FileText, DollarSign, Users, Loader2, Search, UserCog,
  Send, X, ChevronRight, Plus, Pencil, Download, CheckCircle, LucideIcon, Settings
} from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { Textarea } from "@/shared/ui/textarea";
import { useMarketingOAuth, type MarketingPlatformId } from "@/modules/integrations/hooks/useMarketingOAuth";
import { AbramusConfigDialog } from "@/modules/integrations/components/AbramusConfigDialog";
import { useAbramusStatus } from "@/modules/integrations/hooks/useAbramus";
import { EcadConfigDialog } from "@/modules/integrations/components/EcadConfigDialog";
import { useEcadStatus } from "@/modules/integrations/hooks/useEcad";
import { AutentiqueConfigDialog } from "@/modules/integrations/components/AutentiqueConfigDialog";
import { useAutentiqueStatus } from "@/modules/integrations/hooks/useAutentique";
import { ClicksignConfigDialog } from "@/modules/integrations/components/ClicksignConfigDialog";
import { useClicksignStatus } from "@/modules/integrations/hooks/useClicksign";
import { DocuSignConfigDialog } from "@/modules/integrations/components/DocuSignConfigDialog";
import { useDocuSignStatus } from "@/modules/integrations/hooks/useDocuSign";
import { UbcConfigDialog } from "@/modules/integrations/components/UbcConfigDialog";
import { useUbcStatus } from "@/modules/integrations/hooks/useUbc";
import { NfeConfigDialog } from "@/modules/integrations/components/NfeConfigDialog";
import { useNfeStatus } from "@/modules/integrations/hooks/useNfe";
import {
  IntegrationStatusBadges,
  type IntegrationNotice,
} from "@/modules/settings/components/IntegrationStatusBadges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Database, Sparkles, Package, Unplug } from "lucide-react";
import { resetMockData } from "@/shared/data/mockData";

const PERMISSION_TYPES: { id: string; label: string; icon?: LucideIcon }[] = [
  { id: "view", label: "Visualizar", icon: Eye },
  { id: "create", label: "+ Criar", icon: Plus },
  { id: "edit", label: "Editar", icon: Pencil },
  { id: "delete", label: "Excluir", icon: Trash2 },
  { id: "approve", label: "Aprovar", icon: CheckCircle },
  { id: "export", label: "Exportar", icon: Download },
];

const PERMISSION_MODULES = [
  { id: "artistas", name: "Artistas" },
  { id: "projetos", name: "Projetos" },
  { id: "lancamentos", name: "Lançamentos" },
  { id: "contratos", name: "Contratos" },
  { id: "accounting", name: "Accounting" },
  { id: "marketing", name: "Marketing" },
  { id: "integracoes", name: "Integrações" },
  { id: "usuarios", name: "Usuários" },
  { id: "relatorios", name: "Relatórios" },
  { id: "configuracoes", name: "Configurações" },
  { id: "registro_musicas", name: "Registro de Músicas" },
  { id: "crm", name: "CRM" },
  { id: "agenda", name: "Agenda" },
  { id: "inventario", name: "Inventário" },
  { id: "servicos", name: "Serviços" },
  { id: "nota_fiscal", name: "Nota Fiscal" },
  { id: "musicchat", name: "MusicChat" },
];

export default function Configuracoes() {
  const { user, updatePassword } = useAuth();
  const { 
    userSettings, 
    companySettings, 
    orgSlug,
    loading, 
    saving,
    setUserSettings, 
    setCompanySettings,
    setOrgSlug,
    saveUserSettings, 
    saveCompanySettings,
    saveOrgSlug,
  } = useUserSettings();
  const [slugError, setSlugError] = useState<string>("");
  const { usuarios, isLoading: usuariosLoading } = useUsuarios();
  const currentUserRole = useMemo(
    () => usuarios.find((u) => u.id === user?.id)?.role,
    [usuarios, user?.id],
  );
  const isAdmin = currentUserRole === "admin";
  const [seedLoading, setSeedLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const handleLoadDemoData = async () => {
    setSeedLoading(true);
    try {
      resetMockData();
      toast.success("Dados de demonstração restaurados.");
    } finally {
      setSeedLoading(false);
    }
  };

  const handleClearDemoData = async () => {
    setClearLoading(true);
    setClearConfirmOpen(false);
    try {
      try {
        localStorage.removeItem("musicos360_mock_data");
      } catch {
        // ignora falha de quota / acesso
      }
      window.location.reload();
    } finally {
      setClearLoading(false);
    }
  };
  const { 
    roles, 
    teamInvites,
    isLoading: rolesLoading,
    inviteUser,
    cancelInvite,
    assignRoleToUser,
    getPermissionsForRole,
    createRole,
    getPermissionsByCategory,
  } = useRoles();

  const [showPassword, setShowPassword] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Estados para modal de criar papel
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [websiteLeadOpen, setWebsiteLeadOpen] = useState(false);
  const [abramusConfigOpen, setAbramusConfigOpen] = useState(false);
  const [ecadConfigOpen, setEcadConfigOpen] = useState(false);
  const [autentiqueConfigOpen, setAutentiqueConfigOpen] = useState(false);
  const [clicksignConfigOpen, setClicksignConfigOpen] = useState(false);
  const [docusignConfigOpen, setDocusignConfigOpen] = useState(false);
  const [ubcConfigOpen, setUbcConfigOpen] = useState(false);
  const [nfeConfigOpen, setNfeConfigOpen] = useState(false);

  const DIST_STORAGE_KEY = "musicos360_distributor_connections";
  const [distributorConnections, setDistributorConnections] = useState<Record<string, { username: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(DIST_STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const [distConnectOpen, setDistConnectOpen] = useState<string | null>(null);
  const [distUsername, setDistUsername] = useState("");
  const [distApiKey, setDistApiKey] = useState("");

  const handleDistConnect = () => {
    if (!distConnectOpen) return;
    const updated = { ...distributorConnections, [distConnectOpen]: { username: distUsername } };
    setDistributorConnections(updated);
    try { localStorage.setItem(DIST_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    toast.success("Distribuidora conectada com sucesso.");
    setDistConnectOpen(null);
    setDistUsername("");
    setDistApiKey("");
  };

  const handleDistDisconnect = (id: string) => {
    const updated = { ...distributorConnections };
    delete updated[id];
    setDistributorConnections(updated);
    try { localStorage.setItem(DIST_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    toast.success("Distribuidora desconectada.");
  };

  const { data: abramusStatus } = useAbramusStatus();
  const { data: ecadStatus } = useEcadStatus();
  const { data: autentiqueStatus } = useAutentiqueStatus();
  const { data: clicksignStatus } = useClicksignStatus();
  const { data: docusignStatus } = useDocuSignStatus();
  const { data: ubcStatus } = useUbcStatus();
  const {
    isConnected: isMarketingConnected,
    connect: connectMarketing,
    disconnect: disconnectMarketing,
  } = useMarketingOAuth();
  const { data: nfeStatus } = useNfeStatus();

  // Estados para aba de Usuários
  const [usuarioFormModal, setUsuarioFormModal] = useState<{ open: boolean; mode: "create" | "edit"; usuario?: Usuario }>({ open: false, mode: "create" });
  const [usuarioViewModal, setUsuarioViewModal] = useState<{ open: boolean; usuario?: Usuario }>({ open: false });
  const [usuarioSearchTerm, setUsuarioSearchTerm] = useState("");
  const [usuarioCargoFilter, setUsuarioCargoFilter] = useState("all-cargo");
  const [usuarioStatusFilter, setUsuarioStatusFilter] = useState("all-status");

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((usuario) => {
      const matchesSearch = 
        (usuario.full_name?.toLowerCase().includes(usuarioSearchTerm.toLowerCase()) || false) ||
        (usuario.email?.toLowerCase().includes(usuarioSearchTerm.toLowerCase()) || false);
      const matchesCargo = usuarioCargoFilter === "all-cargo" || 
        (usuarioCargoFilter === "admin" && usuario.role === "admin") ||
        (usuarioCargoFilter === "usuario" && usuario.role !== "admin");
      const matchesStatus = usuarioStatusFilter === "all-status" || usuario.status === usuarioStatusFilter;
      return matchesSearch && matchesCargo && matchesStatus;
    });
  }, [usuarios, usuarioSearchTerm, usuarioCargoFilter, usuarioStatusFilter]);

  const hasActiveUsuarioFilters = usuarioSearchTerm !== "" || usuarioCargoFilter !== "all-cargo" || usuarioStatusFilter !== "all-status";

  const clearUsuarioFilters = () => {
    setUsuarioSearchTerm("");
    setUsuarioCargoFilter("all-cargo");
    setUsuarioStatusFilter("all-status");
  };

  const getUsuarioInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatUsuarioDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Digite um email válido");
      return;
    }
    try {
      await inviteUser.mutateAsync({ email: inviteEmail, roleId: inviteRoleId || undefined });
      toast.success("Convite enviado com sucesso!");
      setInviteEmail("");
      setInviteRoleId("");
    } catch (error) {
      toast.error("Erro ao enviar convite");
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await assignRoleToUser.mutateAsync({ userId, roleId });
      toast.success("Papel atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar papel");
    }
  };

  const handleViewPermissions = (role: Role) => {
    setSelectedRole(role);
    setPermissionsModalOpen(true);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Digite um nome para o papel");
      return;
    }
    try {
      await createRole.mutateAsync({ 
        name: newRoleName, 
        description: newRoleDescription || undefined,
        is_system: false,
        priority: 50,
      });
      toast.success("Papel criado com sucesso!");
      setCreateRoleModalOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setSelectedPermissions([]);
    } catch (error) {
      toast.error("Erro ao criar papel");
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const integracoes: Array<{
    id: string;
    name: string;
    icon: string;
    status: "conectado" | "desconectado";
    description: string;
    category: string;
    configurable?: boolean;
    notices?: IntegrationNotice[];
  }> = [
    // ── Assinatura Digital ────────────────────────────────────────────────────
    {
      id: "autentique",
      name: "Autentique",
      icon: "✍️",
      status: autentiqueStatus?.connected ? "conectado" : "desconectado",
      description: "Assinatura eletrônica brasileira — envio e acompanhamento de contratos",
      category: "Assinatura Digital",
      configurable: true,
    },
    {
      id: "clicksign",
      name: "Clicksign",
      icon: "🖊️",
      status: clicksignStatus?.connected ? "conectado" : "desconectado",
      description: "Plataforma brasileira de assinatura eletrônica com validade jurídica",
      category: "Assinatura Digital",
      configurable: true,
    },
    {
      id: "docusign",
      name: "DocuSign",
      icon: "📝",
      status: docusignStatus?.connected ? "conectado" : "desconectado",
      description: "Líder mundial em assinatura digital e gestão de acordos",
      category: "Assinatura Digital",
      configurable: true,
    },
    // ── Direitos Autorais ─────────────────────────────────────────────────────
    {
      id: "ecad",
      name: "ECAD",
      icon: "📊",
      status: ecadStatus?.connected ? "conectado" : "desconectado",
      description: "Arrecadação de execução pública · Conciliação com catálogo local",
      category: "Direitos Autorais",
      configurable: true,
    },
    {
      id: "abramus",
      name: "ABRAMUS",
      icon: "🎼",
      status: abramusStatus?.connected ? "conectado" : "desconectado",
      description: "Buscar e importar obras/fonogramas registrados",
      category: "Direitos Autorais",
      configurable: true,
    },
    {
      id: "ubc",
      name: "UBC",
      icon: "🏛️",
      status: ubcStatus?.connected ? "conectado" : "desconectado",
      description: "União Brasileira de Compositores — registro de obras e ISWC",
      category: "Direitos Autorais",
      configurable: true,
    },
    // ── Marketing Digital — contas corporativas (métricas + tráfego pago) ──────
    // Todas as plataformas coexistem num único ecossistema operacional.
    // Plataformas de ARTISTAS são automáticas via links do cadastro de cada artista.
    // ── Métricas corporativas
    {
      id: "corp_instagram",
      name: "Instagram Business",
      icon: "📸",
      status: isMarketingConnected("corp_instagram") ? "conectado" : "desconectado",
      description: "Analytics da conta Instagram oficial da empresa — alcance, impressões, reels, stories",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "corp_tiktok",
      name: "TikTok Business",
      icon: "🎬",
      status: isMarketingConnected("corp_tiktok") ? "conectado" : "desconectado",
      description: "Analytics da conta TikTok oficial da empresa — views, seguidores, engajamento",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "corp_youtube",
      name: "YouTube Studio",
      icon: "▶️",
      status: isMarketingConnected("corp_youtube") ? "conectado" : "desconectado",
      description: "Analytics do canal YouTube oficial da empresa — inscritos, watch time, CTR",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "corp_spotify",
      name: "Spotify for Artists",
      icon: "🎵",
      status: isMarketingConnected("corp_spotify") ? "conectado" : "desconectado",
      description: "Métricas do perfil Spotify oficial da empresa — streams, ouvintes mensais",
      category: "Marketing Digital",
      configurable: true,
    },
    // ── Tráfego pago corporativo
    {
      id: "meta_ads",
      name: "Meta Ads",
      icon: "📣",
      status: isMarketingConnected("meta_ads") ? "conectado" : "desconectado",
      description: "Facebook + Instagram Ads — gira campanhas da conta Business da empresa",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "google_ads",
      name: "Google Ads",
      icon: "🔍",
      status: isMarketingConnected("google_ads") ? "conectado" : "desconectado",
      description: "Search, Display e YouTube Ads — conta Google Ads da empresa",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "tiktok_ads",
      name: "TikTok Ads",
      icon: "🎯",
      status: isMarketingConnected("tiktok_ads") ? "conectado" : "desconectado",
      description: "TikTok Ads Manager — TopView, Spark Ads e In-Feed da empresa",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "spotify_ads",
      name: "Spotify Ad Studio",
      icon: "🎧",
      status: isMarketingConnected("spotify_ads") ? "conectado" : "desconectado",
      description: "Anúncios de áudio e display no Spotify — segmentação por gênero musical",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "youtube_ads",
      name: "YouTube Ads",
      icon: "📺",
      status: isMarketingConnected("youtube_ads") ? "conectado" : "desconectado",
      description: "TrueView, Bumper e Discovery — anúncios em vídeo no YouTube",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "deezer_ads",
      name: "Deezer Ads",
      icon: "🎶",
      status: isMarketingConnected("deezer_ads") ? "conectado" : "desconectado",
      description: "Deezer Ad Manager — áudio e banner para ouvintes segmentados",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "apple_music_ads",
      name: "Apple Music Ads",
      icon: "🍎",
      status: isMarketingConnected("apple_music_ads") ? "conectado" : "desconectado",
      description: "Apple Music + App Store Search Ads — fãs no ecossistema Apple",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "soundcloud_ads",
      name: "SoundCloud Ads",
      icon: "☁️",
      status: isMarketingConnected("soundcloud_ads") ? "conectado" : "desconectado",
      description: "SoundCloud Ads — audiências indie e underground",
      category: "Marketing Digital",
      configurable: true,
    },
    // ── Fiscal ────────────────────────────────────────────────────────────────
    {
      id: "nfe",
      name: "NF-e / Nota Fiscal",
      icon: "🧾",
      status: nfeStatus?.connected ? "conectado" : "desconectado",
      description: "Emissão de NF-e com certificado digital e credenciais SEFAZ da sua empresa",
      category: "Fiscal",
      configurable: true,
    },
    // ── Captação de Leads ─────────────────────────────────────────────────────
    // Integração via snippet de código (pixel JS + webhook + iframe) — sem OAuth.
    {
      id: "website_leads",
      name: "Website / Captação de Leads",
      icon: "🌐",
      status: "desconectado" as const,
      description: "Pixel JS + webhook + iframe embed para captar leads do seu site directo no CRM",
      category: "Captação de Leads",
      configurable: true,
    },
  ];

  const DISTRIBUTORS = [
    { id: "onerpm", name: "ONErpm", initials: "1R", color: "bg-orange-500", description: "Distribuição global com analytics avançados e suporte a label" },
    { id: "distrokid", name: "DistroKid", initials: "DK", color: "bg-blue-500", description: "Distribuição rápida para todas as plataformas de streaming" },
    { id: "symphonic", name: "Symphonic", initials: "SY", color: "bg-purple-600", description: "Distribuição e marketing para artistas e selos independentes" },
    { id: "soundon", name: "SoundOn", initials: "SO", color: "bg-black", description: "Distribuidora oficial do TikTok com monetização integrada" },
    { id: "musicpro", name: "MusicPro", initials: "MP", color: "bg-green-600", description: "Distribuição profissional com suporte dedicado e royalties mensais" },
    { id: "somvibe", name: "SomVibe", initials: "SV", color: "bg-primary", description: "Distribuidora brasileira independente com foco no mercado nacional" },
  ];

  // IDs das plataformas corporativas de Marketing Digital (OAuth inline, sem modal separado)
  const MARKETING_PLATFORM_IDS = new Set<string>([
    "corp_instagram", "corp_tiktok", "corp_youtube", "corp_spotify",
    "meta_ads", "google_ads", "tiktok_ads", "spotify_ads",
    "youtube_ads", "deezer_ads", "apple_music_ads", "soundcloud_ads",
  ]);

  // Handlers para plataformas que abrem um ConfigDialog dedicado
  const integrationConfigHandlers: Record<string, () => void> = {
    autentique:    () => setAutentiqueConfigOpen(true),
    clicksign:     () => setClicksignConfigOpen(true),
    docusign:      () => setDocusignConfigOpen(true),
    ecad:          () => setEcadConfigOpen(true),
    abramus:       () => setAbramusConfigOpen(true),
    ubc:           () => setUbcConfigOpen(true),
    website_leads: () => setWebsiteLeadOpen(true),
    nfe:           () => setNfeConfigOpen(true),
  };

  const handleSaveProfile = () => {
    saveUserSettings({
      full_name: userSettings.full_name,
      phone: userSettings.phone,
      cargo: userSettings.cargo,
      notify_email: userSettings.notify_email,
      notify_push: userSettings.notify_push,
    });
  };

  const handleSaveCompany = async () => {
    if (orgSlug) {
      const normalized = orgSlug.trim().toLowerCase();
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(normalized)) {
        setSlugError("Use apenas letras minúsculas, números e hífens.");
        return;
      }
      setSlugError("");
      if (normalized !== orgSlug) setOrgSlug(normalized);
      const slugSaved = await saveOrgSlug(normalized);
      if (!slugSaved) return;
    }
    saveCompanySettings(companySettings);
  };

  const handleSaveAutomacoes = () => {
    saveUserSettings({
      auto_notificar_vencimento: userSettings.auto_notificar_vencimento,
      auto_lembrete_renovacao: userSettings.auto_lembrete_renovacao,
      auto_alerta_financeiro: userSettings.auto_alerta_financeiro,
      auto_backup: userSettings.auto_backup,
      auto_relatorio_semanal: userSettings.auto_relatorio_semanal,
    });
  };

  const applyTheme = (theme: "light" | "dark") => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
    setUserSettings({ ...userSettings, theme });
  };

  const handleSaveAparencia = () => {
    saveUserSettings({
      theme: userSettings.theme,
      accent_color: userSettings.accent_color,
      sidebar_compact: userSettings.sidebar_compact,
      animations_enabled: userSettings.animations_enabled,
    });
  };

  const handleSaveIdioma = () => {
    saveUserSettings({
      language: userSettings.language,
      timezone: userSettings.timezone,
      date_format: userSettings.date_format,
      time_format: userSettings.time_format,
      currency: userSettings.currency,
    });
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (passwords.new.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    const { error } = await updatePassword(passwords.new);
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setPasswords({ current: "", new: "", confirm: "" });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Configurações" description="Gerencie as configurações do sistema e preferências">
      <div className="space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="empresa">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="automacoes" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automações
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="aparencia" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="idioma" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Idioma
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          {/* Empresa */}
          <TabsContent value="empresa" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription>Informações da empresa para contratos e documentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Razão Social</Label>
                    <Input 
                      placeholder="MusicOS 360 Produções Artísticas LTDA" 
                      value={companySettings.company_name}
                      onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input 
                      placeholder="MusicOS 360" 
                      value={companySettings.fantasy_name}
                      onChange={(e) => setCompanySettings({ ...companySettings, fantasy_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input 
                    placeholder="50.056.858/0001-46" 
                    value={companySettings.cnpj}
                    onChange={(e) => setCompanySettings({ ...companySettings, cnpj: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Endereço Completo</Label>
                  <Input 
                    placeholder="Rua A, nº 58, Bairro Vila Império, Governador Valadares/MG, CEP 35050-560" 
                    value={companySettings.logradouro}
                    onChange={(e) => setCompanySettings({ ...companySettings, logradouro: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Telefone/WhatsApp</Label>
                    <Input 
                      placeholder="(00) 00000-0000" 
                      value={companySettings.telefone}
                      onChange={(e) => setCompanySettings({ ...companySettings, telefone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Input 
                      placeholder="Admin MusicOS 360" 
                      value={companySettings.responsavel}
                      onChange={(e) => setCompanySettings({ ...companySettings, responsavel: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug da organização</Label>
                  <Input
                    id="org-slug"
                    data-testid="input-org-slug"
                    placeholder="minha-gravadora"
                    value={orgSlug}
                    onChange={(e) => {
                      setOrgSlug(e.target.value);
                      setSlugError("");
                    }}
                  />
                  {slugError && (
                    <p className="text-sm text-destructive" data-testid="text-slug-error">{slugError}</p>
                  )}
                  {orgSlug && !slugError && (
                    <p className="text-sm text-muted-foreground" data-testid="text-slug-preview">
                      Link de cadastro:{" "}
                      <span className="font-mono">{window.location.origin}/signup/artista/{orgSlug}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Usado no link público de cadastro de artistas. Apenas letras minúsculas, números e hífens.
                  </p>
                </div>

                <Button 
                  className="bg-primary hover:bg-primary/90" 
                  onClick={handleSaveCompany}
                  disabled={saving}
                  data-testid="button-save-company"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Dados
                </Button>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card data-testid="card-demo-data">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Dados de Demonstração
                  </CardTitle>
                  <CardDescription>
                    Carregue a base fictícia da MusicOS 360 (8 artistas, contratos,
                    finanças, marketing, RH, leads etc.) para apresentações comerciais
                    e testes. Disponível apenas para administradores.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    O sistema opera totalmente em modo standalone. Todas as alterações
                    são salvas localmente no navegador (localStorage). Você pode
                    restaurar os dados originais ou limpar tudo a qualquer momento.
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleLoadDemoData}
                      disabled={seedLoading || clearLoading}
                      data-testid="button-load-demo-data"
                    >
                      {seedLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Carregar dados demo
                    </Button>

                    <AlertDialog
                      open={clearConfirmOpen}
                      onOpenChange={setClearConfirmOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={seedLoading || clearLoading}
                          data-testid="button-clear-demo-data"
                        >
                          {clearLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Limpar dados demo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remover dados de demonstração?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os registros com UUIDs iniciados em{" "}
                            <code>5eed</code> serão apagados permanentemente.
                            Dados reais, contas de usuário e configurações da
                            aplicação não serão afetados. Deseja continuar?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-clear-demo">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearDemoData}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-clear-demo"
                          >
                            Sim, limpar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Automações */}
          <TabsContent value="automacoes" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automações & Notificações
                </CardTitle>
                <CardDescription>Configure quando, como e por qual canal o sistema deve notificar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Canais de Notificação */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Canais de Notificação
                  </h4>
                  <p className="text-sm text-muted-foreground">Configuração de meios de envio</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">E-mail</span>
                      </div>
                      <Switch 
                        checked={userSettings.notify_email} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, notify_email: checked })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">SMS</span>
                      </div>
                      <Switch checked={false} disabled />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Push/In-App</span>
                      </div>
                      <Switch 
                        checked={userSettings.notify_push} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, notify_push: checked })} 
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contratos */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contratos
                  </h4>
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Novo contrato criado</p>
                        <p className="text-xs text-muted-foreground">Notificar quando um novo contrato for cadastrado</p>
                      </div>
                      <Switch 
                        checked={userSettings.notify_contratos} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, notify_contratos: checked })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Contrato próximo do vencimento</p>
                        <p className="text-xs text-muted-foreground">Notificar 30, 15 e 7 dias antes do vencimento</p>
                      </div>
                      <Switch 
                        checked={userSettings.auto_notificar_vencimento} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, auto_notificar_vencimento: checked })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Contrato vencido</p>
                        <p className="text-xs text-muted-foreground">Alertar quando um contrato expirar</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Sugestão automática de renovação</p>
                        <p className="text-xs text-muted-foreground">Disparada quando o contrato entra no período final</p>
                      </div>
                      <Switch 
                        checked={userSettings.auto_lembrete_renovacao} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, auto_lembrete_renovacao: checked })} 
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Financeiro */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financeiro
                  </h4>
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Alerta de saldo baixo</p>
                        <p className="text-xs text-muted-foreground">Configurável por valor mínimo</p>
                      </div>
                      <Switch 
                        checked={userSettings.auto_alerta_financeiro} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, auto_alerta_financeiro: checked })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Movimentação financeira relevante</p>
                        <p className="text-xs text-muted-foreground">Ex: novos lançamentos, cobranças ou pagamentos</p>
                      </div>
                      <Switch 
                        checked={userSettings.notify_financeiro} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, notify_financeiro: checked })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Resumo financeiro semanal</p>
                        <p className="text-xs text-muted-foreground">Receba um resumo das movimentações da semana</p>
                      </div>
                      <Switch 
                        checked={userSettings.auto_relatorio_semanal} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, auto_relatorio_semanal: checked })} 
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Relatórios & Resumos */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Relatórios & Resumos
                  </h4>
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Relatório semanal de atividades</p>
                        <p className="text-xs text-muted-foreground">Atividades, financeiro e contratos</p>
                      </div>
                      <Switch 
                        checked={userSettings.auto_relatorio_semanal} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, auto_relatorio_semanal: checked })} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Lembretes semanais automáticos</p>
                        <p className="text-xs text-muted-foreground">Pendências, contratos a vencer e ações recomendadas</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sistema */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Sistema
                  </h4>
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Alertas críticos do sistema</p>
                        <p className="text-xs text-muted-foreground">Erros, falhas de integração e eventos importantes</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Notificações operacionais</p>
                        <p className="text-xs text-muted-foreground">Atualizações relevantes e ações pendentes do usuário</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Backup automático</p>
                        <p className="text-xs text-muted-foreground">Realizar backup diário dos dados</p>
                      </div>
                      <Switch 
                        checked={userSettings.auto_backup} 
                        onCheckedChange={(checked) => setUserSettings({ ...userSettings, auto_backup: checked })} 
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Frequência & Regras */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Frequência & Preferências
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequência de envio</Label>
                      <Select defaultValue="imediato">
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imediato">Imediato</SelectItem>
                          <SelectItem value="diario">Diário (resumo)</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="evento">Por evento/gatilho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Horário preferido de recebimento</Label>
                      <Select defaultValue="09:00">
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o horário" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="08:00">08:00</SelectItem>
                          <SelectItem value="09:00">09:00</SelectItem>
                          <SelectItem value="10:00">10:00</SelectItem>
                          <SelectItem value="12:00">12:00</SelectItem>
                          <SelectItem value="14:00">14:00</SelectItem>
                          <SelectItem value="18:00">18:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button 
                  className="bg-primary hover:bg-primary/90" 
                  onClick={handleSaveAutomacoes}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segurança */}
          <TabsContent value="seguranca" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Segurança da Conta
                </CardTitle>
                <CardDescription>Gerencie a segurança e acesso da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Alterar Senha</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Senha Atual</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••"
                          value={passwords.current}
                          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div />
                    <div className="space-y-2">
                      <Label>Nova Senha</Label>
                      <Input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Nova Senha</Label>
                      <Input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleChangePassword}>
                    <Key className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Autenticação em Duas Etapas</h4>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Autenticação 2FA</p>
                        <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                      </div>
                    </div>
                    <Button variant="outline">Configurar</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Sessões Ativas</h4>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-success" />
                        <div>
                          <p className="font-medium">Sessão Atual</p>
                          <p className="text-sm text-muted-foreground">Chrome • Windows • São Paulo, BR</p>
                        </div>
                      </div>
                      <Badge className="bg-success text-[#000000]">Ativa</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="text-destructive hover:text-destructive/80">
                    Encerrar Todas as Outras Sessões
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-destructive">Zona de Perigo</h4>
                  <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Excluir Conta</p>
                        <p className="text-sm text-muted-foreground">Esta ação é irreversível</p>
                      </div>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aparência */}
          <TabsContent value="aparencia" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparência
                </CardTitle>
                <CardDescription>Personalize a aparência do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Tema</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => applyTheme("light")}
                      data-testid="button-theme-light"
                      className={`p-4 rounded-lg border-2 transition-all ${
                        userSettings.theme === "light" ? "border-primary bg-muted/30" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Sun className="h-8 w-8" />
                        <span className="text-sm font-medium">Claro</span>
                        {userSettings.theme === "light" && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                    <button
                      onClick={() => applyTheme("dark")}
                      data-testid="button-theme-dark"
                      className={`p-4 rounded-lg border-2 transition-all ${
                        userSettings.theme === "dark" ? "border-primary bg-muted/30" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Moon className="h-8 w-8" />
                        <span className="text-sm font-medium">Escuro</span>
                        {userSettings.theme === "dark" && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Layout</h4>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Sidebar compacta</p>
                      <p className="text-xs text-muted-foreground">Reduzir largura da barra lateral</p>
                    </div>
                    <Switch 
                      checked={userSettings.sidebar_compact}
                      onCheckedChange={(checked) => setUserSettings({ ...userSettings, sidebar_compact: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Animações</p>
                      <p className="text-xs text-muted-foreground">Habilitar animações de transição</p>
                    </div>
                    <Switch 
                      checked={userSettings.animations_enabled}
                      onCheckedChange={(checked) => setUserSettings({ ...userSettings, animations_enabled: checked })}
                    />
                  </div>
                </div>

                <Button 
                  className="bg-primary hover:bg-primary/90" 
                  onClick={handleSaveAparencia}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Idioma */}
          <TabsContent value="idioma" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Idioma e Região
                </CardTitle>
                <CardDescription>Configure idioma, formato de data e moeda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Idioma do Sistema</Label>
                    <Select 
                      value={userSettings.language} 
                      onValueChange={(value) => setUserSettings({ ...userSettings, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                        <SelectItem value="es">🇪🇸 Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuso Horário</Label>
                    <Select 
                      value={userSettings.timezone}
                      onValueChange={(value) => setUserSettings({ ...userSettings, timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                        <SelectItem value="Europe/Lisbon">Lisboa (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Formato de Data</Label>
                    <Select 
                      value={userSettings.date_format}
                      onValueChange={(value) => setUserSettings({ ...userSettings, date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/AAAA (27/12/2025)</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/AAAA (12/27/2025)</SelectItem>
                        <SelectItem value="YYYY-MM-DD">AAAA-MM-DD (2025-12-27)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select 
                      value={userSettings.currency}
                      onValueChange={(value) => setUserSettings({ ...userSettings, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">R$ Real Brasileiro (BRL)</SelectItem>
                        <SelectItem value="USD">$ Dólar Americano (USD)</SelectItem>
                        <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Formato de Hora
                  </h4>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setUserSettings({ ...userSettings, time_format: "24h" })}
                      className={`flex-1 p-4 rounded-lg border-2 ${
                        userSettings.time_format === "24h" ? "border-primary bg-muted/30" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-lg font-bold">14:30</p>
                        <p className="text-sm text-muted-foreground">24 horas</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => setUserSettings({ ...userSettings, time_format: "12h" })}
                      className={`flex-1 p-4 rounded-lg border-2 ${
                        userSettings.time_format === "12h" ? "border-primary bg-muted/30" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-lg font-bold">2:30 PM</p>
                        <p className="text-sm text-muted-foreground">12 horas</p>
                      </div>
                    </button>
                  </div>
                </div>

                <Button 
                  className="bg-primary hover:bg-primary/90" 
                  onClick={handleSaveIdioma}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrações */}
          <TabsContent value="integracoes" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Integrações
                </CardTitle>
                <CardDescription>Conecte serviços externos para automatizar processos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  {["Assinatura Digital", "Direitos Autorais", "Marketing Digital", "Fiscal", "Captação de Leads"].map((category) => {
                    const items = integracoes.filter((i) => i.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category}>
                        <div className="px-4 py-2 bg-muted/40 border-b border-border/50">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {category}
                          </p>
                        </div>
                        <div className="divide-y divide-border/50">
                          {items.map((integracao) => {
                            const isMarketingPlatform = MARKETING_PLATFORM_IDS.has(integracao.id);
                            const isConnecting = connectingPlatform === integracao.id;
                            const handler = integrationConfigHandlers[integracao.id];
                            const isConfigurable = Boolean(handler);
                            return (
                              <div
                                key={integracao.id}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
                                data-testid={`integration-row-${integracao.id}`}
                              >
                                <div className="p-1.5 rounded-md bg-muted shrink-0 text-base leading-none">
                                  {integracao.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground">{integracao.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{integracao.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <IntegrationStatusBadges
                                    status={integracao.status}
                                    notices={integracao.notices}
                                    testIdPrefix={`badge-integration-${integracao.id}`}
                                  />
                                  {isMarketingPlatform ? (
                                    isConnecting ? (
                                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled data-testid={`button-integration-${integracao.id}`}>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Conectando...
                                      </Button>
                                    ) : integracao.status === "conectado" ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                        onClick={() => {
                                          disconnectMarketing(integracao.id as MarketingPlatformId);
                                          toast.success(`${integracao.name} desconectado.`);
                                        }}
                                        data-testid={`button-integration-${integracao.id}`}
                                      >
                                        <Unplug className="h-3 w-3" />
                                        Desconectar
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => {
                                          setConnectingPlatform(integracao.id);
                                          connectMarketing(integracao.id as MarketingPlatformId, [])
                                            .then(() => toast.success(`${integracao.name} conectado com sucesso.`))
                                            .catch(() => toast.error(`Erro ao conectar ${integracao.name}.`))
                                            .finally(() => setConnectingPlatform(null));
                                        }}
                                        data-testid={`button-integration-${integracao.id}`}
                                      >
                                        Conectar
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    )
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={handler}
                                      disabled={!isConfigurable}
                                      data-testid={`button-integration-${integracao.id}`}
                                    >
                                      {isConfigurable
                                        ? integracao.status === "conectado"
                                          ? "Gerenciar"
                                          : "Configurar"
                                        : "Em breve"}
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">Não encontrou a integração que precisa?</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Solicitar Nova Integração
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Distribuidoras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Distribuidoras
                </CardTitle>
                <CardDescription>Conecte sua conta nas distribuidoras para enviar lançamentos diretamente pela plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DISTRIBUTORS.map((dist) => {
                  const conn = distributorConnections[dist.id];
                  const isConnected = Boolean(conn);
                  return (
                    <div
                      key={dist.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      data-testid={`distributor-row-${dist.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${dist.color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                          {dist.initials}
                        </div>
                        <div>
                          <p className="font-medium">{dist.name}</p>
                          <p className="text-sm text-muted-foreground">{dist.description}</p>
                          {isConnected && (
                            <p className="text-xs text-success mt-0.5">Conta: {conn.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-success/10 text-success border-success/30" : ""}>
                          {isConnected ? "Conectado" : "Desconectado"}
                        </Badge>
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDistDisconnect(dist.id)}
                            data-testid={`button-dist-disconnect-${dist.id}`}
                          >
                            <Unplug className="h-3 w-3 mr-1" />
                            Desconectar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setDistConnectOpen(dist.id); setDistUsername(""); setDistApiKey(""); }}
                            data-testid={`button-dist-connect-${dist.id}`}
                          >
                            Conectar
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Dialog conectar distribuidora */}
            <Dialog open={Boolean(distConnectOpen)} onOpenChange={(o) => { if (!o) { setDistConnectOpen(null); setDistUsername(""); setDistApiKey(""); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conectar {DISTRIBUTORS.find(d => d.id === distConnectOpen)?.name}</DialogTitle>
                  <DialogDescription>Informe as credenciais da sua conta para autorizar o envio de lançamentos.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dist-username">E-mail / Usuário</Label>
                    <Input
                      id="dist-username"
                      placeholder="seu@email.com"
                      value={distUsername}
                      onChange={(e) => setDistUsername(e.target.value)}
                      data-testid="input-dist-username"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dist-apikey">API Key ou Senha</Label>
                    <Input
                      id="dist-apikey"
                      type="password"
                      placeholder="••••••••••••"
                      value={distApiKey}
                      onChange={(e) => setDistApiKey(e.target.value)}
                      data-testid="input-dist-apikey"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setDistConnectOpen(null); setDistUsername(""); setDistApiKey(""); }}>Cancelar</Button>
                    <Button onClick={handleDistConnect} disabled={!distUsername.trim()} data-testid="button-dist-save">
                      <Check className="h-4 w-4 mr-1" />
                      Conectar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Dialog — Website / Captação de Leads (snippet de código, sem OAuth) */}
            <Dialog open={websiteLeadOpen} onOpenChange={setWebsiteLeadOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    🌐 Website / Captação de Leads
                  </DialogTitle>
                  <DialogDescription>
                    Cole os snippets abaixo no seu site para captar leads directamente no CRM. Não é necessário login — a integração funciona via código.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pixel JavaScript (head do site)</Label>
                    <div className="relative">
                      <Textarea
                        readOnly
                        rows={4}
                        className="font-mono text-xs bg-muted/40 resize-none pr-16"
                        value={`<!-- MUSIC OS 360 — Lead Capture Pixel -->\n<script>\n  (function(m,o,s,i,c){m[c]=m[c]||function(){(m[c].q=m[c].q||[]).push(arguments)};var t=o.createElement(s);t.async=1;t.src=i;o.head.appendChild(t);})(window,document,'script','https://cdn.musicos360.com/pixel.js','mos360');\n  mos360('init', 'ORG_musicos360_abc123');\n</script>`}
                      />
                      <Button size="sm" variant="outline" className="absolute top-2 right-2 h-7 text-xs" onClick={() => { navigator.clipboard.writeText(`<!-- MUSIC OS 360 — Lead Capture Pixel -->\n<script>\n  (function(m,o,s,i,c){m[c]=m[c]||function(){(m[c].q=m[c].q||[]).push(arguments)};var t=o.createElement(s);t.async=1;t.src=i;o.head.appendChild(t);})(window,document,'script','https://cdn.musicos360.com/pixel.js','mos360');\n  mos360('init', 'ORG_musicos360_abc123');\n</script>`); toast.success("Pixel copiado!"); }}>
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Embed iFrame (formulário de captação)</Label>
                    <div className="relative">
                      <Textarea
                        readOnly
                        rows={3}
                        className="font-mono text-xs bg-muted/40 resize-none pr-16"
                        value={`<iframe src="https://app.musicos360.com/forms/lead/ORG_musicos360_abc123" width="100%" height="480" frameborder="0" allow="clipboard-write" loading="lazy"></iframe>`}
                      />
                      <Button size="sm" variant="outline" className="absolute top-2 right-2 h-7 text-xs" onClick={() => { navigator.clipboard.writeText(`<iframe src="https://app.musicos360.com/forms/lead/ORG_musicos360_abc123" width="100%" height="480" frameborder="0" allow="clipboard-write" loading="lazy"></iframe>`); toast.success("iFrame copiado!"); }}>
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Webhook URL (POST para receber leads externos)</Label>
                    <div className="relative">
                      <Input
                        readOnly
                        className="font-mono text-xs bg-muted/40 pr-16"
                        value="https://api.musicos360.com/webhooks/leads/ORG_musicos360_abc123"
                      />
                      <Button size="sm" variant="outline" className="absolute top-1/2 -translate-y-1/2 right-2 h-7 text-xs" onClick={() => { navigator.clipboard.writeText("https://api.musicos360.com/webhooks/leads/ORG_musicos360_abc123"); toast.success("Webhook URL copiada!"); }}>
                        Copiar
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Envie um POST com <code className="bg-muted px-1 rounded text-[10px]">{"{ name, email, phone?, message? }"}</code> — os leads chegam directamente no CRM.</p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button variant="outline" onClick={() => setWebsiteLeadOpen(false)}>Fechar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <EcadConfigDialog
              open={ecadConfigOpen}
              onOpenChange={setEcadConfigOpen}
            />
            <AbramusConfigDialog
              open={abramusConfigOpen}
              onOpenChange={setAbramusConfigOpen}
            />
            <AutentiqueConfigDialog
              open={autentiqueConfigOpen}
              onOpenChange={setAutentiqueConfigOpen}
            />
            <ClicksignConfigDialog
              open={clicksignConfigOpen}
              onOpenChange={setClicksignConfigOpen}
            />
            <DocuSignConfigDialog
              open={docusignConfigOpen}
              onOpenChange={setDocusignConfigOpen}
            />
            <UbcConfigDialog
              open={ubcConfigOpen}
              onOpenChange={setUbcConfigOpen}
            />

            <NfeConfigDialog
              open={nfeConfigOpen}
              onOpenChange={setNfeConfigOpen}
            />
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="usuarios" className="mt-6 space-y-6">
            {/* Gerenciar Equipe */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciar Equipe
                </CardTitle>
                <CardDescription>Gerencie o acesso dos usuários</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Convite de Usuário */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Digite o endereço de email" 
                      className="pl-10" 
                      value={inviteEmail} 
                      onChange={(e) => setInviteEmail(e.target.value)}
                      data-testid="input-invite-email"
                    />
                  </div>
                  <Select value={usuarioCargoFilter} onValueChange={setUsuarioCargoFilter}>
                    <SelectTrigger className="w-[120px]" data-testid="select-filter-all">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-cargo">Todos</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="usuario">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    className="gap-2" 
                    onClick={handleInviteUser}
                    disabled={inviteUser.isPending}
                    data-testid="button-invite"
                  >
                    {inviteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Convidar
                  </Button>
                </div>

                {/* Lista de Membros */}
                {usuariosLoading || rolesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsuarios.length === 0 && teamInvites.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Nenhum membro na equipe"
                    description="Convide membros para sua equipe usando o campo acima."
                  />
                ) : (
                  <div className="space-y-2">
                    {/* Usuários ativos */}
                    {filteredUsuarios.map((usuario) => (
                      <div 
                        key={usuario.id} 
                        className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                        data-testid={`row-user-${usuario.id}`}
                      >
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-foreground font-medium text-sm">
                          {getUsuarioInitials(usuario.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{usuario.full_name || "Usuário"}</p>
                          <p className="text-sm text-muted-foreground truncate">{usuario.email}</p>
                        </div>
                        <Select 
                          value={usuario.role === "admin" ? "admin" : "usuario"}
                          onValueChange={(value) => {
                            // Update role logic
                          }}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-role-${usuario.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.length > 0 ? (
                              roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="usuario">Usuário</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={usuario.status || "ativo"}
                          onValueChange={(value) => {
                            // Update status logic
                          }}
                        >
                          <SelectTrigger className="w-[120px]" data-testid={`select-status-${usuario.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-testid={`button-remove-user-${usuario.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Convites pendentes */}
                    {teamInvites.map((invite) => (
                      <div 
                        key={invite.id} 
                        className="flex items-center gap-4 py-3 border-b border-border last:border-0 opacity-60"
                        data-testid={`row-invite-${invite.id}`}
                      >
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-medium text-sm">
                          {invite.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{invite.email}</p>
                          <p className="text-sm text-muted-foreground">Convite enviado</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {invite.role?.name || "Sem papel"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Pendente
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => cancelInvite.mutate(invite.id)}
                          data-testid={`button-cancel-invite-${invite.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Papéis e Permissões */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Papéis e Permissões
                  </CardTitle>
                  <CardDescription>Crie e edite papéis com permissões específicas</CardDescription>
                </div>
                <Button 
                  onClick={() => setCreateRoleModalOpen(true)}
                  data-testid="button-create-role"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Papel
                </Button>
              </CardHeader>
              <CardContent>
                {rolesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Nenhum papel configurado ainda.</p>
                    <p className="text-sm text-muted-foreground">Os papéis padrão serão criados automaticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div 
                        key={role.id} 
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                        data-testid={`row-role-${role.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{role.name}</p>
                            {role.description && (
                              <p className="text-sm text-muted-foreground">{role.description}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-foreground"
                          onClick={() => handleViewPermissions(role)}
                          data-testid={`button-view-permissions-${role.id}`}
                        >
                          Ver Permissões
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {(
          <Card className="mt-6 border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-warning text-base">
                <Database className="h-4 w-4" />
                Dados de Demonstração
              </CardTitle>
              <CardDescription className="text-warning/80">
                O sistema está em modo demo. Todas as alterações são salvas no navegador e persistem entre sessões.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-warning/50 text-warning hover:bg-warning/10"
                    data-testid="button-reset-demo-data"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restaurar dados originais
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restaurar dados de demonstração?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso apagará todas as alterações feitas durante a demonstração (artistas, leads, contratos, etc.) e restaurará os dados originais. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={resetMockData}
                      className="bg-warning hover:bg-warning/90 text-warning-foreground"
                      data-testid="button-confirm-reset-demo"
                    >
                      Restaurar dados originais
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>

      <UsuarioViewModal 
        open={usuarioViewModal.open} 
        onOpenChange={(open) => setUsuarioViewModal({ ...usuarioViewModal, open })} 
        usuario={usuarioViewModal.usuario} 
      />
      <UsuarioFormModal 
        open={usuarioFormModal.open} 
        onOpenChange={(open) => setUsuarioFormModal({ ...usuarioFormModal, open })} 
        usuario={usuarioFormModal.usuario} 
        mode={usuarioFormModal.mode} 
      />

      {/* Modal de Permissões */}
      <Dialog open={permissionsModalOpen} onOpenChange={setPermissionsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissões: {selectedRole?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.description || "Visualize as permissões deste papel"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {selectedRole && (() => {
              const rolePerms = getPermissionsForRole(selectedRole.id);
              if (rolePerms.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma permissão configurada para este papel.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      As permissões serão configuradas pelo administrador.
                    </p>
                  </div>
                );
              }

              const grouped: Record<string, typeof rolePerms> = {};
              rolePerms.forEach(p => {
                if (!grouped[p.category]) grouped[p.category] = [];
                grouped[p.category].push(p);
              });

              return Object.entries(grouped).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-foreground">{category}</h4>
                  <div className="grid gap-2">
                    {perms.map((perm) => (
                      <div 
                        key={perm.id}
                        className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                      >
                        <Check className="h-4 w-4 text-success" />
                        <div>
                          <p className="text-sm font-medium">{perm.label}</p>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar Papel */}
      <Dialog open={createRoleModalOpen} onOpenChange={setCreateRoleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Novo Papel
            </DialogTitle>
            <DialogDescription>
              Defina um novo papel e suas permissões
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nome do Papel</Label>
              <Input
                id="role-name"
                placeholder="Ex: Produtor Musical"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                data-testid="input-role-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role-description">Descrição</Label>
              <Textarea
                id="role-description"
                placeholder="Descreva as responsabilidades deste papel..."
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-role-description"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <Label className="text-base font-semibold">Permissões Detalhadas</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure permissões específicas para cada módulo do sistema
              </p>
              
              <div className="space-y-1 pt-4">
                {PERMISSION_MODULES.map((module) => (
                  <div 
                    key={module.id}
                    className="flex items-center gap-4 py-2 border-b border-border last:border-0"
                  >
                    <div className="w-40 font-medium text-sm text-foreground">
                      {module.name}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {PERMISSION_TYPES.map((type) => (
                        <label 
                          key={`${module.id}-${type.id}`}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <div 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedPermissions.includes(`${module.id}:${type.id}`)
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/40'
                            }`}
                            onClick={() => togglePermission(`${module.id}:${type.id}`)}
                            data-testid={`radio-permission-${module.id}-${type.id}`}
                          >
                            {selectedPermissions.includes(`${module.id}:${type.id}`) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {type.icon && <type.icon className="h-3 w-3" />}
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setCreateRoleModalOpen(false)}
              data-testid="button-cancel-create-role"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateRole}
              disabled={createRole.isPending}
              data-testid="button-confirm-create-role"
            >
              {createRole.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Papel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
