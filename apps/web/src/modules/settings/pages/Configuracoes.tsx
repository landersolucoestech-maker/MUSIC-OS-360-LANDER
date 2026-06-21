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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/app/providers/AuthContext";
import { useTenant } from "@/app/providers/TenantContext";
import { useUserSettings } from "@/modules/settings/hooks/useUserSettings";
import { useUsuarios, Usuario } from "@/modules/settings/hooks/useUsuarios";
import { useRoles, Role, RoleDetail } from "@/modules/settings/hooks/useRoles";
import { UsuarioFormModal } from "@/modules/settings/components/UsuarioFormModal";
import { UsuarioViewModal } from "@/modules/settings/components/UsuarioViewModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, Building2, Zap, Shield, Link,
  Bell, Mail, Calendar, Clock, Key, Smartphone, Eye, EyeOff,
  Monitor, Check, ExternalLink, RefreshCw, Trash2,
  Music, FileText, DollarSign, Users, Loader2, Search, UserCog,
  Send, X, ChevronRight, Plus, Pencil, Download, CheckCircle, Settings,
  CreditCard, Crown, Receipt, Package, TrendingUp, AlertCircle,
  Globe2, Copy, Archive, RotateCcw
} from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { Textarea } from "@/shared/ui/textarea";
import { Progress } from "@/shared/ui/progress";
import { useMarketingOAuth, type MarketingPlatformId } from "@/modules/integrations/hooks/useMarketingOAuth";
import { MarketingOAuthDialog } from "@/modules/integrations/components/MarketingOAuthDialog";
import { getAccessToken } from "@/shared/lib/api-client";
import { API_BASE_URL } from "@/shared/lib/env";
import { AbramusConfigDialog } from "@/modules/integrations/components/AbramusConfigDialog";
import { useAbramusStatus } from "@/modules/integrations/hooks/useAbramus";
import { EcadConfigDialog } from "@/modules/integrations/components/EcadConfigDialog";
import { useEcadStatus } from "@/modules/integrations/hooks/useEcad";
import { AutentiqueConfigDialog } from "@/modules/integrations/components/AutentiqueConfigDialog";
import { useAutentiqueStatus } from "@/modules/integrations/hooks/useAutentique";
import { ClicksignConfigDialog } from "@/modules/integrations/components/ClicksignConfigDialog";
import { useClicksignStatus } from "@/modules/integrations/hooks/useClicksign";
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
import { Database, Sparkles, Unplug } from "lucide-react";
import { resetMockData } from "@/shared/data/mockData";
import {
  IntegrationLogo,
  type IntegrationLogoId,
} from "@/shared/integrations";

function formatRoleName(name: string): string {
  return name.replace(/_/g, " ");
}

export default function Configuracoes() {
  const { tenant, setTenant } = useTenant();
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
  } = useUserSettings();
  const [slugError, setSlugError] = useState<string>("");
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companySnapshot, setCompanySnapshot] = useState<typeof companySettings | null>(null);
  const { usuarios, isLoading: usuariosLoading } = useUsuarios();
  const currentUserRole = useMemo(
    () => usuarios.find((u) => u.id === user?.id)?.role,
    [usuarios, user?.id],
  );
  const isAdmin = currentUserRole === "admin" || currentUserRole === "owner";
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
    resendInvite,
    assignRoleToUser,
    assignPermissionToRole,
    removePermissionFromRole,
    getPermissionsForRole,
    createRole,
    updateRole,
    duplicateRole,
    archiveRole,
    restoreRole,
    addRoleInheritance,
    removeRoleInheritance,
    getPermissionsByCategory,
    getRoleDetail,
  } = useRoles();

  const [showPassword, setShowPassword] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<RoleDetail | null>(null);
  const [parentRoleId, setParentRoleId] = useState("");
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
  const [oauthDialogPlatform, setOauthDialogPlatform] = useState<MarketingPlatformId | null>(null);
  const [websiteLeadOpen, setWebsiteLeadOpen] = useState(false);
  const [abramusConfigOpen, setAbramusConfigOpen] = useState(false);
  const [ecadConfigOpen, setEcadConfigOpen] = useState(false);
  const [autentiqueConfigOpen, setAutentiqueConfigOpen] = useState(false);
  const [clicksignConfigOpen, setClicksignConfigOpen] = useState(false);
  const [ubcConfigOpen, setUbcConfigOpen] = useState(false);
  const [nfeConfigOpen, setNfeConfigOpen] = useState(false);
  const [externalOAuthConnections, setExternalOAuthConnections] = useState<
    Partial<Record<"docusign", boolean>>
  >(() => {
    try {
      return JSON.parse(sessionStorage.getItem("musicos360_external_oauth_connections") ?? "{}");
    } catch {
      return {};
    }
  });

  const { data: abramusStatus } = useAbramusStatus();
  const { data: ecadStatus } = useEcadStatus();
  const { data: autentiqueStatus } = useAutentiqueStatus();
  const { data: clicksignStatus } = useClicksignStatus();
  const { data: ubcStatus } = useUbcStatus();
  const {
    isConnected: isMarketingConnected,
    connect: connectMarketing,
    disconnect: disconnectMarketing,
  } = useMarketingOAuth();
  const { data: nfeStatus } = useNfeStatus();

  useEffect(() => {
    const handleExternalOAuth = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "musicos360_oauth_success") return;
      const platform = event.data?.platform as string;
      if (platform !== "docusign") return;
      if (!event.data?.access_token) return;

      setExternalOAuthConnections((current) => {
        const next = { ...current, [platform]: true };
        sessionStorage.setItem("musicos360_external_oauth_connections", JSON.stringify(next));
        return next;
      });
      toast.success("DocuSign conectado com sucesso.");
    };

    window.addEventListener("message", handleExternalOAuth);
    return () => window.removeEventListener("message", handleExternalOAuth);
  }, []);

  const openExternalOAuth = async (platform: "docusign") => {
    const popup = window.open(
      "about:blank",
      `musicos360_oauth_${platform}`,
      "width=520,height=700,toolbar=no,menubar=no,scrollbars=yes,resizable=yes",
    );
    if (!popup) {
      toast.error("Permita popups neste site para iniciar a autorização.");
      return;
    }

    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/integrations/oauth/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ platform }),
      });
      if (!response.ok) throw new Error("Não foi possível iniciar a autorização.");
      const { exchange_token } = await response.json() as { exchange_token: string };
      sessionStorage.setItem(`musicos360_oauth_nonce_${platform}`, exchange_token);
      popup.location.href = `/oauth/${platform}?nonce=${encodeURIComponent(exchange_token)}`;
    } catch (error) {
      popup.close();
      toast.error(error instanceof Error ? error.message : "Falha ao iniciar OAuth.");
    }
  };

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

  const handleViewPermissions = async (role: Role) => {
    setSelectedRole(role);
    setSelectedRoleDetail(null);
    setPermissionsModalOpen(true);
    try {
      setSelectedRoleDetail(await getRoleDetail(role.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar detalhes do papel.");
    }
  };

  const handleDuplicateRole = async (role: Role) => {
    try {
      await duplicateRole.mutateAsync({ id: role.id, name: `${role.name} - cópia` });
      toast.success("Papel duplicado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao duplicar papel.");
    }
  };

  const handleEditRole = async (role: Role) => {
    const name = window.prompt("Nome do papel", role.name)?.trim();
    if (!name || name === role.name) return;
    try {
      await updateRole.mutateAsync({ id: role.id, name });
      toast.success("Papel atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao editar papel.");
    }
  };

  const handleArchiveRole = async (role: Role) => {
    try {
      if (role.archived_at) {
        await restoreRole.mutateAsync(role.id);
        toast.success("Papel reativado.");
      } else {
        await archiveRole.mutateAsync(role.id);
        toast.success("Papel arquivado.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar papel.");
    }
  };

  const handleToggleGrant = async (permissionId: string, granted: boolean) => {
    if (!selectedRole || selectedRole.is_system) return;
    try {
      if (granted) {
        await removePermissionFromRole.mutateAsync({ roleId: selectedRole.id, permissionId });
      } else {
        await assignPermissionToRole.mutateAsync({ roleId: selectedRole.id, permissionId });
      }
      setSelectedRoleDetail(await getRoleDetail(selectedRole.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar permissão.");
    }
  };

  const handleAddInheritance = async () => {
    if (!selectedRole || !parentRoleId) return;
    try {
      await addRoleInheritance.mutateAsync({ roleId: selectedRole.id, parentRoleId });
      setSelectedRoleDetail(await getRoleDetail(selectedRole.id));
      setParentRoleId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar herança.");
    }
  };

  const handleRemoveInheritance = async (inheritedRoleId: string) => {
    if (!selectedRole) return;
    try {
      await removeRoleInheritance.mutateAsync({ roleId: selectedRole.id, parentRoleId: inheritedRoleId });
      setSelectedRoleDetail(await getRoleDetail(selectedRole.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover herança.");
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Digite um nome para o papel");
      return;
    }
    try {
      await createRole.mutateAsync({ 
        name: newRoleName, 
        description: newRoleDescription || null,
        is_system: false,
        priority: 50,
        permissionIds: selectedPermissions,
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
    logoId?: IntegrationLogoId;
    icon?: React.ComponentType<{ className?: string }>;
    iconClassName?: string;
    iconBackgroundClassName?: string;
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
      logoId: "autentique",
      status: autentiqueStatus?.connected ? "conectado" : "desconectado",
      description: "Assinatura eletrônica brasileira — envio e acompanhamento de contratos",
      category: "Assinatura Digital",
      configurable: true,
    },
    {
      id: "clicksign",
      name: "Clicksign",
      logoId: "clicksign",
      status: clicksignStatus?.connected ? "conectado" : "desconectado",
      description: "Plataforma brasileira de assinatura eletrônica com validade jurídica",
      category: "Assinatura Digital",
      configurable: true,
    },
    {
      id: "docusign",
      name: "DocuSign",
      logoId: "docusign",
      status: externalOAuthConnections.docusign ? "conectado" : "desconectado",
      description: "Líder mundial em assinatura digital e gestão de acordos",
      category: "Assinatura Digital",
      configurable: true,
    },
    // ── Direitos Autorais ─────────────────────────────────────────────────────
    {
      id: "ecad",
      name: "ECAD",
      logoId: "ecad",
      status: ecadStatus?.connected ? "conectado" : "desconectado",
      description: "Arrecadação de execução pública · Conciliação com catálogo local",
      category: "Direitos Autorais",
      configurable: true,
    },
    {
      id: "abramus",
      name: "ABRAMUS",
      logoId: "abramus",
      status: abramusStatus?.connected ? "conectado" : "desconectado",
      description: "Registro e conciliação de obras e fonogramas junto à ABRAMUS.",
      category: "Direitos Autorais",
      configurable: true,
    },
    {
      id: "ubc",
      name: "UBC",
      logoId: "ubc",
      status: ubcStatus?.connected ? "conectado" : "desconectado",
      description: "União Brasileira de Compositores — registro de obras e ISWC",
      category: "Direitos Autorais",
      configurable: true,
    },
    // ── Marketing Digital — contas corporativas (métricas + tráfego pago) ──────
    // Todas as plataformas coexistem num único ecossistema operacional.
    // Plataformas de ARTISTAS são automáticas via links do cadastro de cada artista.
    // ── Métricas corporativas — contas oficiais da empresa (login obrigatório)
    {
      id: "meta_business",
      name: "Meta Business Suite",
      logoId: "meta_business",
      status: isMarketingConnected("meta_business") ? "conectado" : "desconectado",
      description: "Facebook, Instagram e Meta Ads — mensagens, métricas, publicações, campanhas e resultados da empresa",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "tiktok_business",
      name: "TikTok Business",
      logoId: "tiktok_business",
      status: isMarketingConnected("tiktok_business") ? "conectado" : "desconectado",
      description: "TikTok for Business e TikTok Ads — mensagens, seguidores, conteúdos, métricas e campanhas",
      category: "Marketing Digital",
      configurable: true,
    },
    {
      id: "google_business",
      name: "Google & YouTube",
      logoId: "google_business",
      status: isMarketingConnected("google_business") ? "conectado" : "desconectado",
      description: "Google Analytics, Search Console, Google Ads e YouTube — tráfego, anúncios, SEO e desempenho de vídeos",
      category: "Marketing Digital",
      configurable: true,
    },
    // ── Tráfego pago corporativo
    {
      id: "spotify_ads",
      name: "Spotify Ad Studio",
      logoId: "spotify_ads",
      status: isMarketingConnected("spotify_ads") ? "conectado" : "desconectado",
      description: "Spotify Ads — ouvintes, streams, seguidores e campanhas",
      category: "Marketing Digital",
      configurable: true,
    },
    // ── Fiscal ────────────────────────────────────────────────────────────────
    {
      id: "nfe",
      name: "NF-e / Nota Fiscal",
      logoId: "nfe",
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
      icon: Globe2,
      iconClassName: "text-cyan-600",
      iconBackgroundClassName: "bg-cyan-500/10",
      status: "desconectado" as const,
      description: "Captação de leads via Pixel, Webhooks e formulários integrados ao CRM",
      category: "Captação de Leads",
      configurable: true,
    },
  ];

  const DISTRIBUTORS: Array<{
    id: string;
    name: string;
    logoId: IntegrationLogoId;
    description: string;
    portalUrl: string;
  }> = [
    { id: "onerpm", name: "ONErpm", logoId: "onerpm", description: "Distribuição digital, analytics e gestão de lançamentos", portalUrl: "https://app.onerpm.com/" },
    { id: "distrokid", name: "DistroKid", logoId: "distrokid", description: "Distribuição rápida para plataformas de streaming", portalUrl: "https://distrokid.com/signin/" },
    { id: "symphonic", name: "Symphonic", logoId: "symphonic", description: "Distribuição, marketing e gestão de catálogo musical", portalUrl: "https://app.symphonicms.com/" },
    { id: "soundon", name: "SoundOn", logoId: "soundon", description: "Distribuição e monetização integrada ao ecossistema TikTok", portalUrl: "https://soundon.global/" },
    { id: "musicpro", name: "MusicPro", logoId: "musicpro", description: "Distribuição digital, royalties e gestão de direitos", portalUrl: "https://app.musicpro.com.br/" },
    { id: "somvibe", name: "SomVibe", logoId: "somvibe", description: "Distribuição digital com foco no mercado brasileiro", portalUrl: "https://somvibe.com.br/" },
  ];

  // IDs das plataformas corporativas de Marketing Digital (OAuth inline, sem modal separado)
  // Inclui TODAS as contas da empresa — métricas + tráfego pago.
  // Artistas funcionam automaticamente via links do cadastro: NÃO estão aqui.
  const MARKETING_PLATFORM_IDS = new Set<string>([
    // Métricas corporativas (contas oficiais da empresa)
    "meta_business", "tiktok_business", "google_business",
    // Tráfego pago (contas de anúncios da empresa)
    "spotify_ads",
  ]);

  // Handlers para plataformas que abrem um ConfigDialog dedicado
  const integrationConfigHandlers: Record<string, () => void> = {
    autentique:    () => setAutentiqueConfigOpen(true),
    clicksign:     () => setClicksignConfigOpen(true),
    docusign:      () => void openExternalOAuth("docusign"),
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

  const handleEditCompany = () => {
    setCompanySnapshot({ ...companySettings });
    setIsEditingCompany(true);
  };

  const handleCancelCompany = () => {
    if (companySnapshot) setCompanySettings(companySnapshot);
    setSlugError("");
    setIsEditingCompany(false);
  };

  const handleSaveCompany = async () => {
    let normalizedSlug: string | undefined;
    if (orgSlug) {
      normalizedSlug = orgSlug.trim().toLowerCase();
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(normalizedSlug)) {
        setSlugError("Use apenas letras minúsculas, números e hífens.");
        return;
      }
      setSlugError("");
      if (normalizedSlug !== orgSlug) setOrgSlug(normalizedSlug);
    }

    const saved = await saveCompanySettings(
      companySettings,
      normalizedSlug,
    );
    if (!saved) return;

    // Sincroniza o nome da organização na sidebar e no TenantContext
    const displayName = companySettings.fantasy_name?.trim() || companySettings.company_name?.trim();
    if (displayName) {
      setTenant(prev => ({ ...prev, name: displayName }));
      try {
        const stored = JSON.parse(localStorage.getItem("musicos360_current_tenant") ?? "{}");
        localStorage.setItem("musicos360_current_tenant", JSON.stringify({ ...stored, name: displayName }));
      } catch { /* ignora */ }
    }

    setIsEditingCompany(false);
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
            <TabsTrigger value="integracoes" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          {/* Empresa */}
          <TabsContent value="empresa" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados da Empresa
                  </CardTitle>
                  <CardDescription>Informações da empresa para contratos e documentos</CardDescription>
                </div>
                {!isEditingCompany && (
                  <Button variant="outline" size="sm" onClick={handleEditCompany} className="shrink-0">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Dados
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Razão Social</Label>
                    <Input
                      placeholder="MusicOS 360 Produções Artísticas LTDA"
                      value={companySettings.company_name}
                      onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                      disabled={!isEditingCompany}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input
                      placeholder="MusicOS 360"
                      value={companySettings.fantasy_name}
                      onChange={(e) => setCompanySettings({ ...companySettings, fantasy_name: e.target.value })}
                      disabled={!isEditingCompany}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    placeholder="50.056.858/0001-46"
                    value={companySettings.cnpj}
                    onChange={(e) => setCompanySettings({ ...companySettings, cnpj: e.target.value })}
                    disabled={!isEditingCompany}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Endereço Completo</Label>
                  <Input
                    placeholder="Rua A, nº 58, Bairro Vila Império, Governador Valadares/MG, CEP 35050-560"
                    value={companySettings.logradouro}
                    onChange={(e) => setCompanySettings({ ...companySettings, logradouro: e.target.value })}
                    disabled={!isEditingCompany}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Telefone/WhatsApp</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={companySettings.telefone}
                      onChange={(e) => setCompanySettings({ ...companySettings, telefone: e.target.value })}
                      disabled={!isEditingCompany}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Input
                      placeholder="Admin MusicOS 360"
                      value={companySettings.responsavel}
                      onChange={(e) => setCompanySettings({ ...companySettings, responsavel: e.target.value })}
                      disabled={!isEditingCompany}
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
                    disabled={!isEditingCompany}
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

                {isEditingCompany && (
                  <div className="flex gap-2">
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={handleSaveCompany}
                      disabled={saving}
                      data-testid="button-save-company"
                    >
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar Configurações
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelCompany}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
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
              <CardContent className="space-y-6">
                {[
                  { key: "Assinatura Digital",   icon: <FileText className="h-4 w-4" /> },
                  { key: "Direitos Autorais",     icon: <Shield className="h-4 w-4" /> },
                  { key: "Monitoramento Musical", icon: <Music className="h-4 w-4" /> },
                  { key: "Marketing Digital",     icon: <Zap className="h-4 w-4" /> },
                  { key: "Fiscal",                icon: <DollarSign className="h-4 w-4" /> },
                  { key: "Captação de Leads",     icon: <Users className="h-4 w-4" /> },
                ].map(({ key: category, icon: catIcon }) => {
                  const items = integracoes.filter((i) => i.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category} className="space-y-3">
                      {/* Cabeçalho de categoria */}
                      <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                        <span className="text-muted-foreground">{catIcon}</span>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {category}
                        </p>
                      </div>

                      {/* Linhas — mesmo padrão visual de Distribuidoras */}
                      {items.map((integracao) => {
                        const FallbackIcon = integracao.icon;
                        const isMarketingPlatform = MARKETING_PLATFORM_IDS.has(integracao.id);
                        const isConnecting = connectingPlatform === integracao.id;
                        const handler = integrationConfigHandlers[integracao.id];
                        const isConfigurable = Boolean(handler);
                        return (
                          <div
                            key={integracao.id}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                            data-testid={`integration-row-${integracao.id}`}
                          >
                            {/* Esquerda: ícone + textos */}
                            <div className="flex items-center gap-4">
                              {integracao.logoId ? (
                                <IntegrationLogo id={integracao.logoId} />
                              ) : FallbackIcon ? (
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border/50 ${integracao.iconBackgroundClassName ?? "bg-muted"}`}>
                                  <FallbackIcon className={`h-6 w-6 ${integracao.iconClassName ?? ""}`} />
                                </div>
                              ) : (
                                <div className="h-12 w-12 shrink-0 rounded-lg border border-border/50 bg-muted" />
                              )}
                              <div>
                                <p className="font-medium">{integracao.name}</p>
                                <p className="text-sm text-muted-foreground leading-snug">{integracao.description}</p>
                              </div>
                            </div>

                            {/* Direita: badge + botão */}
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              <IntegrationStatusBadges
                                status={integracao.status}
                                notices={integracao.notices}
                                testIdPrefix={`badge-integration-${integracao.id}`}
                              />
                              {isMarketingPlatform ? (
                                isConnecting ? (
                                  <Button variant="outline" size="sm" disabled data-testid={`button-integration-${integracao.id}`}>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Conectando...
                                  </Button>
                                ) : integracao.status === "conectado" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => {
                                      disconnectMarketing(integracao.id as MarketingPlatformId);
                                      toast.success(`${integracao.name} desconectado.`);
                                    }}
                                    data-testid={`button-integration-${integracao.id}`}
                                  >
                                    <Unplug className="h-3 w-3 mr-1" />
                                    Desconectar
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOauthDialogPlatform(integracao.id as MarketingPlatformId)}
                                    data-testid={`button-integration-${integracao.id}`}
                                  >
                                    Conectar
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                )
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handler}
                                  disabled={!isConfigurable}
                                  data-testid={`button-integration-${integracao.id}`}
                                >
                                  {isConfigurable
                                    ? integracao.status === "conectado"
                                      ? "Gerenciar"
                                      : "Configurar"
                                    : "Em breve"}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">Não encontrou a integração que precisa?</p>
                  <Button variant="outline" size="sm">
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
                {DISTRIBUTORS.map((dist) => (
                    <div
                      key={dist.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      data-testid={`distributor-row-${dist.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <IntegrationLogo id={dist.logoId} imageClassName="h-11 w-11" />
                        <div>
                          <p className="font-medium">{dist.name}</p>
                          <p className="text-sm text-muted-foreground">{dist.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          Acesso externo
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid={`button-dist-connect-${dist.id}`}
                        >
                          <a href={dist.portalUrl} target="_blank" rel="noopener noreferrer">
                            Abrir portal oficial
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </a>
                        </Button>
                      </div>
                    </div>
                ))}
              </CardContent>
            </Card>


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
            <UbcConfigDialog
              open={ubcConfigOpen}
              onOpenChange={setUbcConfigOpen}
            />
            {oauthDialogPlatform && (
              <MarketingOAuthDialog
                open={Boolean(oauthDialogPlatform)}
                onOpenChange={(val) => { if (!val) setOauthDialogPlatform(null); }}
                platform={oauthDialogPlatform}
                onConnect={async (platform, scopes, access_token) => {
                  await connectMarketing(platform, scopes, access_token);
                  toast.success(`${platform} conectado com sucesso.`);
                  setOauthDialogPlatform(null);
                }}
              />
            )}

            <NfeConfigDialog
              open={nfeConfigOpen}
              onOpenChange={setNfeConfigOpen}
            />
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing" className="mt-6 space-y-6">
            {(() => {
              const billing = tenant.billing;
              const plan    = tenant.plan;

              const PLAN_LABELS: Record<string, string> = {
                starter:      "Starter",
                professional: "Professional",
                enterprise:   "Enterprise",
              };
              const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                active:    { label: "Ativo",     variant: "default"     },
                trial:     { label: "Trial",     variant: "secondary"   },
                suspended: { label: "Suspenso",  variant: "destructive" },
                cancelled: { label: "Cancelado", variant: "destructive" },
              };
              const statusInfo = STATUS_LABELS[billing.status] ?? STATUS_LABELS["active"];
              const seatsPercent = billing.seats > 0 ? Math.min(100, Math.round((billing.seatsUsed / billing.seats) * 100)) : 0;
              const seatsAvailable = Math.max(0, billing.seats - billing.seatsUsed);
              const renewalDateObj = billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd) : null;
              const renewalDate  = renewalDateObj && !isNaN(renewalDateObj.getTime())
                ? format(renewalDateObj, "dd/MM/yyyy", { locale: ptBR })
                : "—";

              const MOCK_INVOICES = [
                { id: "INV-2026-05", date: "01/05/2026", amount: "R$ 1.490,00", status: "Pago",     statusColor: "text-emerald-600 dark:text-emerald-400" },
                { id: "INV-2026-04", date: "01/04/2026", amount: "R$ 1.490,00", status: "Pago",     statusColor: "text-emerald-600 dark:text-emerald-400" },
                { id: "INV-2026-03", date: "01/03/2026", amount: "R$ 1.490,00", status: "Pago",     statusColor: "text-emerald-600 dark:text-emerald-400" },
                { id: "INV-2026-02", date: "01/02/2026", amount: "R$ 1.490,00", status: "Pago",     statusColor: "text-emerald-600 dark:text-emerald-400" },
                { id: "INV-2026-01", date: "01/01/2026", amount: "R$ 1.490,00", status: "Pago",     statusColor: "text-emerald-600 dark:text-emerald-400" },
                { id: "INV-2025-12", date: "01/12/2025", amount: "R$ 1.490,00", status: "Pago",     statusColor: "text-emerald-600 dark:text-emerald-400" },
              ];

              const PLANS = [
                {
                  id:    "starter",
                  name:  "Starter",
                  price: "R$ 390/mês",
                  features: ["Até 3 usuários", "100 artistas", "Catálogo ilimitado", "Suporte por email"],
                },
                {
                  id:    "professional",
                  name:  "Professional",
                  price: "R$ 790/mês",
                  features: ["Até 10 usuários", "Artistas ilimitados", "Integrações avançadas", "Suporte prioritário"],
                },
                {
                  id:    "enterprise",
                  name:  "Enterprise",
                  price: "R$ 1.490/mês",
                  features: ["Usuários ilimitados", "Multi-tenant", "SSO + SAML", "SLA dedicado + onboarding"],
                },
              ];

              return (
                <>
                  {/* ── Plano Atual + Seats ─────────────────────────────────────────────── */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Plano Atual */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Crown className="h-4 w-4 text-primary" />
                          Plano Atual
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{PLAN_LABELS[plan] ?? plan}</span>
                          <Badge variant={statusInfo.variant} data-testid="billing-status-badge">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              Próxima renovação
                            </span>
                            <span className="font-medium text-foreground">{renewalDate}</span>
                          </div>
                          {billing.subscriptionId && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>ID da subscrição</span>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{billing.subscriptionId}</code>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => toast.info("Entre em contato com o suporte para gerenciar a assinatura: suporte@musicos360.com.br")}
                          data-testid="button-manage-plan"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Gerenciar Assinatura
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Uso de Seats */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Users className="h-4 w-4 text-primary" />
                          Uso de Assentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-3xl font-bold" data-testid="billing-seats-used">{billing.seatsUsed}</span>
                            <span className="text-muted-foreground text-sm ml-1">/ {billing.seats} assentos</span>
                          </div>
                          <span className={`text-sm font-medium ${seatsPercent >= 90 ? "text-destructive" : seatsPercent >= 70 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {seatsPercent}% utilizado
                          </span>
                        </div>
                        <Progress value={seatsPercent} className="h-2" data-testid="billing-seats-progress" />
                        <div className="text-xs text-muted-foreground">
                          {seatsAvailable} assento{seatsAvailable !== 1 ? "s" : ""} disponível{seatsAvailable !== 1 ? "s" : ""}
                        </div>
                        {seatsPercent >= 80 && (
                          <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Próximo do limite — considere fazer upgrade.
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => toast.info("Entre em contato com o suporte para adicionar mais assentos: suporte@musicos360.com.br")}
                          data-testid="button-add-seats"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar Assentos
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* ── Método de Pagamento ─────────────────────────────────────────────── */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Método de Pagamento
                      </CardTitle>
                      <CardDescription>Cartão guardado para cobranças automáticas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-md flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold tracking-wider">VISA</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                            <p className="text-xs text-muted-foreground">Expira 12/2027</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Principal</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.info("Entre em contato com o suporte para atualizar o cartão: suporte@musicos360.com.br")}
                            data-testid="button-update-payment"
                          >
                            Alterar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Histórico de Faturas ────────────────────────────────────────────── */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Receipt className="h-4 w-4 text-primary" />
                        Histórico de Faturas
                      </CardTitle>
                      <CardDescription>Faturas dos últimos 12 meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fatura</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="text-right"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {MOCK_INVOICES.map((inv) => (
                              <TableRow key={inv.id}>
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{inv.id}</code>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{inv.date}</TableCell>
                                <TableCell className="text-right font-medium">{inv.amount}</TableCell>
                                <TableCell className="text-center">
                                  <span className={`text-xs font-medium ${inv.statusColor}`}>{inv.status}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 gap-1 text-xs"
                                    onClick={() => toast.info(`Download de ${inv.id} não disponível em modo de demonstração.`)}
                                    data-testid={`button-download-invoice-${inv.id}`}
                                  >
                                    <Download className="h-3 w-3" />
                                    Baixar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Comparação de Planos / Upgrade ─────────────────────────────────── */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Planos Disponíveis
                      </CardTitle>
                      <CardDescription>Compare os planos e faça upgrade quando estiver pronto</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {PLANS.map((p) => {
                          const isCurrent = p.id === plan;
                          return (
                            <div
                              key={p.id}
                              className={`relative rounded-xl border p-5 space-y-4 transition-all ${
                                isCurrent
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border hover:border-muted-foreground/40"
                              }`}
                            >
                              {isCurrent && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                  <Badge className="text-[10px] px-2 py-0.5">Plano Atual</Badge>
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">{p.name}</span>
                                </div>
                                <p className="text-lg font-bold text-primary">{p.price}</p>
                              </div>
                              <ul className="space-y-1.5">
                                {p.features.map((f) => (
                                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                              <Button
                                size="sm"
                                variant={isCurrent ? "outline" : "default"}
                                className="w-full"
                                disabled={isCurrent}
                                onClick={() => !isCurrent && toast.info("Entre em contato com o suporte para fazer upgrade: suporte@musicos360.com.br")}
                                data-testid={`button-plan-${p.id}`}
                              >
                                {isCurrent ? "Plano Atual" : "Fazer Upgrade"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
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
                  <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                    <SelectTrigger className="w-[180px]" data-testid="select-invite-role">
                      <SelectValue placeholder="Papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter((role) => !role.archived_at && role.is_assignable !== false).map((role) => (
                        <SelectItem key={role.id} value={role.id}>{formatRoleName(role.name)}</SelectItem>
                      ))}
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
                          value={roles.find((role) => role.slug === usuario.role)?.id ?? ""}
                          onValueChange={(value) => void handleRoleChange(usuario.id, value)}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-role-${usuario.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.length > 0 ? (
                              roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>{formatRoleName(role.name)}</SelectItem>
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
                          onClick={() => resendInvite.mutate(invite.id)}
                          title="Reenviar convite"
                          data-testid={`button-resend-invite-${invite.id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
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
                            <p className="font-medium text-foreground">{formatRoleName(role.name)}</p>
                            {role.description && (
                              <p className="text-sm text-muted-foreground">{role.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Editar papel" disabled={role.is_system || !!role.archived_at} onClick={() => void handleEditRole(role)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Duplicar papel" disabled={role.is_system} onClick={() => void handleDuplicateRole(role)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title={role.archived_at ? "Reativar papel" : "Arquivar papel"} disabled={role.is_system} onClick={() => void handleArchiveRole(role)}>
                            {role.archived_at ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </Button>
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isAdmin && (
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
              Permissões: {selectedRole ? formatRoleName(selectedRole.name) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.description || "Visualize as permissões deste papel"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {selectedRole && (() => {
              const rolePerms = selectedRoleDetail?.permissions ?? getPermissionsForRole(selectedRole.id);
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

              return (
                <div className="space-y-6">
                  {Object.entries(grouped).map(([category, perms]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-foreground">{category}</h4>
                      <div className="grid gap-2">
                        {perms.map((perm) => (
                          <div key={`${perm.id}-${"source_role_id" in perm ? perm.source_role_id : "direct"}`} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                            <Check className="h-4 w-4 text-success" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{perm.label}</p>
                              {perm.description && <p className="text-xs text-muted-foreground">{perm.description}</p>}
                            </div>
                            {"source" in perm && (
                              <Badge variant={perm.source === "direct" ? "default" : "secondary"}>
                                {perm.source === "direct"
                                  ? "Direta"
                                  : `Herdada de ${"source_role_name" in perm ? String(perm.source_role_name) : "papel pai"}`}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedRoleDetail && (
                    <>
                      <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium">Herança</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedRoleDetail.inheritance.length > 0 ? selectedRoleDetail.inheritance.map((edge) => (
                              <Badge key={edge.id} variant="secondary" className="gap-1">
                                {edge.parent_role_name}
                                {!selectedRole.is_system && (
                                  <button type="button" title="Remover herança" onClick={() => void handleRemoveInheritance(edge.parent_role_id)}>
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            )) : <span className="text-sm text-muted-foreground">Sem papéis herdados</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Usuários impactados</p>
                          <p className="text-sm text-muted-foreground">{selectedRoleDetail.impactedUsers.length}</p>
                        </div>
                      </div>
                      {!selectedRole.is_system && !selectedRole.archived_at && (
                        <div className="space-y-3 border-t border-border pt-4">
                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-2">
                              <Label>Herdar permissões de</Label>
                              <Select value={parentRoleId} onValueChange={setParentRoleId}>
                                <SelectTrigger><SelectValue placeholder="Selecione um papel" /></SelectTrigger>
                                <SelectContent>
                                  {roles.filter((role) => role.id !== selectedRole.id && !role.archived_at).map((role) => (
                                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button variant="outline" onClick={() => void handleAddInheritance()} disabled={!parentRoleId}>
                              Adicionar
                            </Button>
                          </div>
                          <p className="text-sm font-medium">Gerenciar grants diretos</p>
                          {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                            <div key={category}>
                              <p className="mb-2 text-xs font-medium text-muted-foreground">{category}</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {categoryPermissions.map((permission) => {
                                  const direct = selectedRoleDetail.permissions.some(
                                    (item) => item.id === permission.id && item.source === "direct",
                                  );
                                  const inherited = selectedRoleDetail.permissions.some(
                                    (item) => item.id === permission.id && item.source === "inherited",
                                  );
                                  return (
                                    <label key={permission.id} className="flex items-center gap-2 text-sm">
                                      <Checkbox
                                        checked={direct || inherited}
                                        disabled={inherited}
                                        onCheckedChange={() => void handleToggleGrant(permission.id, direct)}
                                      />
                                      <span>{permission.label}</span>
                                      {inherited && <Badge variant="secondary">Herdada</Badge>}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
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
                {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                  <div 
                    key={category}
                    className="flex items-center gap-4 py-2 border-b border-border last:border-0"
                  >
                    <div className="w-40 font-medium text-sm text-foreground">
                      {category}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {categoryPermissions.map((permission) => (
                        <label 
                          key={permission.id}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <div 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedPermissions.includes(permission.id)
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/40'
                            }`}
                            onClick={() => togglePermission(permission.id)}
                            data-testid={`permission-${permission.id}`}
                          >
                            {selectedPermissions.includes(permission.id) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {permission.label}
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
