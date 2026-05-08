import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
  Settings, Shield, Bell, Globe, Palette,
  Save, Key, Mail, Smartphone, AlertTriangle,
} from "lucide-react";

const TABS = [
  { id: "general",  label: "Geral",         icon: Settings },
  { id: "security", label: "Segurança",      icon: Shield },
  { id: "email",    label: "E-mail",         icon: Mail },
  { id: "alerts",   label: "Alertas",        icon: Bell },
  { id: "branding", label: "Branding",       icon: Palette },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-6 space-y-4">
      <h3 className="text-[13px] font-semibold text-white border-b border-white/[0.06] pb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-white/80">{label}</p>
        {description && <p className="text-[11.5px] text-white/35 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 w-64">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        checked ? "bg-blue-500" : "bg-white/10",
      )}
      data-testid="toggle"
    >
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4" : "translate-x-1")} />
    </button>
  );
}

export default function AdminSettings() {
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState({
    platform_name: "MUSIC OS 360",
    support_email: "suporte@musicos360.com",
    max_trial_days: "30",
    force_mfa: false,
    session_timeout_h: "8",
    ip_allowlist: false,
    email_from: "noreply@musicos360.com",
    smtp_host: "smtp.sendgrid.net",
    smtp_port: "587",
    alert_mrr_threshold: "100000",
    alert_churn_threshold: "5",
    alert_system_errors: true,
    alert_new_tenants: true,
    maintenance_mode: false,
  });

  function upd(key: string, val: string | boolean) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Configurações</h1>
            <p className="text-[12.5px] text-white/40 mt-0.5">Configurações globais da plataforma</p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs"
            data-testid="btn-save-settings"
          >
            <Save className="h-3.5 w-3.5" /> Salvar Alterações
          </Button>
        </div>

        {settings.maintenance_mode && (
          <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
            <p className="text-[12.5px] text-yellow-400/90 font-medium">Modo de manutenção ativo — plataforma indisponível para usuários finais.</p>
          </div>
        )}

        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors",
                tab === id
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
              )}
              data-testid={`tab-${id}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div className="space-y-4">
            <Section title="Plataforma">
              <Field label="Nome da plataforma" description="Exibido em e-mails, UI e fatura">
                <Input value={settings.platform_name} onChange={e => upd("platform_name", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" data-testid="input-platform-name" />
              </Field>
              <Field label="E-mail de suporte" description="Endereço de resposta para tickets">
                <Input value={settings.support_email} onChange={e => upd("support_email", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" data-testid="input-support-email" />
              </Field>
              <Field label="Duração padrão do trial" description="Dias antes de solicitar pagamento">
                <Input type="number" value={settings.max_trial_days} onChange={e => upd("max_trial_days", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" data-testid="input-trial-days" />
              </Field>
            </Section>
            <Section title="Manutenção">
              <Field label="Modo de manutenção" description="Bloqueia acesso de todos os usuários">
                <Toggle checked={settings.maintenance_mode} onChange={v => upd("maintenance_mode", v)} />
              </Field>
            </Section>
          </div>
        )}

        {tab === "security" && (
          <Section title="Políticas de Segurança">
            <Field label="Forçar MFA para todos" description="Todos os usuários devem ativar autenticação em dois fatores">
              <Toggle checked={settings.force_mfa} onChange={v => upd("force_mfa", v)} />
            </Field>
            <Field label="Timeout de sessão (horas)" description="Sessão expirada após inatividade">
              <Input type="number" value={settings.session_timeout_h} onChange={e => upd("session_timeout_h", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" data-testid="input-session-timeout" />
            </Field>
            <Field label="Lista de IPs permitidos" description="Restringe acesso admin a IPs específicos">
              <Toggle checked={settings.ip_allowlist} onChange={v => upd("ip_allowlist", v)} />
            </Field>
            <div className="pt-2 border-t border-white/[0.06]">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-white/10 text-white/50 hover:text-white">
                <Key className="h-3.5 w-3.5" /> Rotacionar Chaves de API
              </Button>
            </div>
          </Section>
        )}

        {tab === "email" && (
          <Section title="Configurações de E-mail">
            <Field label="From address" description="Endereço remetente dos e-mails">
              <Input value={settings.email_from} onChange={e => upd("email_from", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" data-testid="input-email-from" />
            </Field>
            <Field label="SMTP Host">
              <Input value={settings.smtp_host} onChange={e => upd("smtp_host", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" />
            </Field>
            <Field label="SMTP Port">
              <Input value={settings.smtp_port} onChange={e => upd("smtp_port", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" />
            </Field>
            <div className="pt-2 border-t border-white/[0.06]">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-white/10 text-white/50 hover:text-white">
                <Mail className="h-3.5 w-3.5" /> Testar Envio
              </Button>
            </div>
          </Section>
        )}

        {tab === "alerts" && (
          <Section title="Thresholds de Alertas">
            <Field label="Alerta MRR (R$)" description="Notifica quando MRR cai abaixo deste valor">
              <Input type="number" value={settings.alert_mrr_threshold} onChange={e => upd("alert_mrr_threshold", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" data-testid="input-mrr-threshold" />
            </Field>
            <Field label="Alerta Churn (%)" description="Notifica quando churn mensal supera este percentual">
              <Input type="number" value={settings.alert_churn_threshold} onChange={e => upd("alert_churn_threshold", e.target.value)} className="h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white" />
            </Field>
            <Field label="Alertas de erros de sistema" description="Receber notificação em falhas de serviço">
              <Toggle checked={settings.alert_system_errors} onChange={v => upd("alert_system_errors", v)} />
            </Field>
            <Field label="Alertas de novos tenants" description="Notificar quando novo tenant se cadastrar">
              <Toggle checked={settings.alert_new_tenants} onChange={v => upd("alert_new_tenants", v)} />
            </Field>
          </Section>
        )}

        {tab === "branding" && (
          <Section title="Identidade Visual">
            <div className="flex items-center gap-4 py-2">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Globe className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">MUSIC OS 360</p>
                <p className="text-[11.5px] text-white/35">Logotipo atual</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs border-white/10 text-white/50 gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" /> Alterar Logotipo
                </Button>
              </div>
            </div>
            <Field label="Cor primária" description="Usada em botões, links e destaques">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-500 border border-white/20" />
                <Badge variant="outline" className="text-[10.5px] font-mono border-white/10 text-white/40">#3B82F6</Badge>
              </div>
            </Field>
          </Section>
        )}
      </div>
    </AdminLayout>
  );
}
