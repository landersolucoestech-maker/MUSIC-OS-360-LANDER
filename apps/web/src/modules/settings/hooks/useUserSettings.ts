import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthContext";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Configurações pessoais do usuário (notificações/automação) em localStorage,
 * e o slug de cadastro público da organização.
 *
 * Persiste em localStorage por usuário (chave `musicos360_user_settings:<id>`).
 * Dados cadastrais da empresa (razão social, CNPJ, endereço…) NÃO vivem aqui —
 * ver useCompanySettings.ts, que fala com o backend real (GET/PATCH
 * /company-settings).
 */

export interface UserSettings {
  id?: string;
  user_id?: string;
  full_name: string;
  phone: string;
  cargo: string;
  setor: string;
  avatar_url: string;
  notify_email: boolean;
  notify_push: boolean;
  notify_lancamentos: boolean;
  notify_contratos: boolean;
  notify_financeiro: boolean;
  notify_marketing: boolean;
  auto_notificar_vencimento: boolean;
  auto_lembrete_renovacao: boolean;
  auto_alerta_financeiro: boolean;
  auto_backup: boolean;
  auto_relatorio_semanal: boolean;
  automation_preferences: Record<string, {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    frequency?: "imediato" | "diario" | "semanal" | "evento";
    preferred_time?: string;
    message?: string;
  }>;
}

const defaultUserSettings: UserSettings = {
  full_name: "",
  phone: "",
  cargo: "",
  setor: "",
  avatar_url: "",
  notify_email: true,
  notify_push: false,
  notify_lancamentos: true,
  notify_contratos: true,
  notify_financeiro: true,
  notify_marketing: false,
  auto_notificar_vencimento: true,
  auto_lembrete_renovacao: true,
  auto_alerta_financeiro: false,
  auto_backup: true,
  auto_relatorio_semanal: false,
  automation_preferences: {},
};

const userKey = (id: string) => `musicos360_user_settings:${id}`;
const orgSlugKey = (id: string) => `musicos360_org_slug:${id}`;

function readJSON<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    const sanitized = { ...fallback };
    for (const settingKey of Object.keys(fallback) as Array<keyof T>) {
      if (parsed[settingKey] !== undefined) {
        sanitized[settingKey] = parsed[settingKey] as T[keyof T];
      }
    }
    return sanitized;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignora falha de quota
  }
}

export function useUserSettings() {
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [orgSlug, setOrgSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUserSettings(readJSON<UserSettings>(userKey(user.id), defaultUserSettings));
      try {
        setOrgSlug(localStorage.getItem(orgSlugKey(user.id)) ?? "");
      } catch {
        setOrgSlug("");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const saveUserSettings = async (settings: Partial<UserSettings>) => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = { ...userSettings, ...settings, user_id: user.id };
      writeJSON(userKey(user.id), updated);
      setUserSettings(updated);

      // Sincroniza full_name e avatar_url com Supabase user_metadata
      // para refletir na sidebar e em todos os componentes que lêem user.user_metadata
      const metaUpdate: Record<string, unknown> = {};
      if (settings.full_name !== undefined) metaUpdate.full_name = settings.full_name;
      if (settings.avatar_url !== undefined) metaUpdate.avatar_url = settings.avatar_url;
      if (settings.phone !== undefined)      metaUpdate.phone = settings.phone;
      if (Object.keys(metaUpdate).length > 0) {
        await getSupabaseClient().auth.updateUser({ data: metaUpdate });
      }

      toast.success("Configurações salvas com sucesso!");
    } finally {
      setSaving(false);
    }
  };

  const saveOrgSlug = (slug: string): boolean => {
    if (!user) return false;
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error("O slug deve conter apenas letras minúsculas, números e hífens.");
      return false;
    }
    try {
      localStorage.setItem(orgSlugKey(user.id), slug);
    } catch {
      // ignora falha de quota
    }
    setOrgSlug(slug);
    return true;
  };

  return {
    userSettings,
    orgSlug,
    loading,
    saving,
    setUserSettings,
    setOrgSlug,
    saveUserSettings,
    saveOrgSlug,
    refreshSettings: loadSettings,
  };
}
