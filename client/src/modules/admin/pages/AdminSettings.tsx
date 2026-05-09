import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { MOCK_INTEGRATIONS } from "../data/mockAdmin";
import type { IntegrationStatus } from "../types";
import { MOCK_ADMIN_USERS } from "../data/mockAdmin";
import type { AdminRole } from "../types";
import {
  Settings, Mail, Shield, Bell, Palette, Webhook, KeyRound, Zap,
  CheckCircle2, AlertCircle, Clock, XCircle,
  Eye, EyeOff, RefreshCw, Plus, Trash2, Copy,
  ToggleLeft, ToggleRight, Upload, Users, ShieldOff, Search,
} from "lucide-react";

/* ── types ── */
type TabKey = "usuarios" | "geral" | "email" | "seguranca" | "notificacoes" | "aparencia" | "webhooks" | "chaves-api" | "integracoes";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "geral",        label: "Geral",       icon: Settings  },
  { key: "email",        label: "Email",        icon: Mail      },
  { key: "seguranca",    label: "Segurança",    icon: Shield    },
  { key: "notificacoes", label: "Notificações", icon: Bell      },
  { key: "aparencia",    label: "Aparência",    icon: Palette   },
  { key: "webhooks",     label: "Webhooks",     icon: Webhook   },
  { key: "chaves-api",   label: "Chaves API",   icon: KeyRound  },
  { key: "integracoes",  label: "Integrações",  icon: Zap       },
  { key: "usuarios",     label: "Usuários",     icon: Users     },
];

/* ── integration helpers ── */
const STATUS_CFG: Record<IntegrationStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  active:   { label: "Ativo",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  inactive: { label: "Inativo",  color: "text-white/30",    bg: "bg-white/5 border-white/10",             icon: XCircle      },
  error:    { label: "Erro",     color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",        icon: AlertCircle  },
  pending:  { label: "Pendente", color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  icon: Clock        },
};
const CAT_LABEL: Record<string, string> = {
  payment: "Pagamento", communication: "Comunicação", analytics: "Analytics",
  storage: "Storage", music: "Música", accounting: "Accounting",
};
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ── shared UI ── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-white/60 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-white/30">{hint}</p>}
    </div>
  );
}
function Inp({ placeholder, defaultValue, type = "text" }: { placeholder?: string; defaultValue?: string; type?: string }) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40"
    />
  );
}
function Sel({ options, defaultValue }: { options: string[]; defaultValue?: string }) {
  return (
    <select
      defaultValue={defaultValue}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:outline-none focus:border-primary/40"
    >
      {options.map(o => <option key={o} value={o} className="bg-[hsl(222_47%_6%)]">{o}</option>)}
    </select>
  );
}
function Toggle({ label, desc, defaultOn = false }: { label: string; desc?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.05] last:border-0">
      <div>
        <p className="text-[13px] font-medium text-white/80">{label}</p>
        {desc && <p className="text-[11.5px] text-white/35 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => setOn(!on)} className="shrink-0" data-testid={`toggle-${label}`}>
        {on ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-white/25" />}
      </button>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5 space-y-4">
      <h3 className="text-[12.5px] font-semibold text-white/50 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}
function SaveBar() {
  return (
    <div className="flex justify-end pt-2">
      <button className="rounded-xl bg-primary px-5 py-2 text-[13px] font-semibold text-white hover:bg-primary/90 transition-colors" data-testid="button-save-settings">
        Salvar Alterações
      </button>
    </div>
  );
}

/* ── panels ── */
function TabGeral() {
  return (
    <div className="space-y-4">
      <Section title="Informações da Plataforma">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome da Plataforma"><Inp defaultValue="MUSIC OS 360" /></Field>
          <Field label="URL da Plataforma"><Inp defaultValue="musicos360.com" /></Field>
          <Field label="Fuso Horário">
            <Sel options={["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "UTC"]} defaultValue="America/Sao_Paulo" />
          </Field>
          <Field label="Idioma Padrão">
            <Sel options={["Português (Brasil)", "English", "Español"]} defaultValue="Português (Brasil)" />
          </Field>
          <Field label="Formato de Data">
            <Sel options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} defaultValue="DD/MM/YYYY" />
          </Field>
          <Field label="Moeda Padrão">
            <Sel options={["BRL — Real Brasileiro", "USD — Dólar", "EUR — Euro"]} defaultValue="BRL — Real Brasileiro" />
          </Field>
        </div>
      </Section>
      <Section title="Suporte & Contato">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email de Suporte"><Inp defaultValue="suporte@musicos360.com" type="email" /></Field>
          <Field label="Telefone de Suporte"><Inp defaultValue="+55 11 99999-0000" /></Field>
          <Field label="Endereço" hint="Usado em documentos fiscais e contratos">
            <Inp defaultValue="Rua das Artes, 123 — Sala 45, São Paulo, SP" />
          </Field>
          <Field label="CNPJ"><Inp defaultValue="00.000.000/0001-00" /></Field>
        </div>
      </Section>
      <Section title="Manutenção">
        <div className="space-y-0">
          <Toggle label="Modo de Manutenção" desc="Bloqueia acesso de todos os usuários finais à plataforma" />
          <Toggle label="Duração padrão do trial" desc="Exibir banner de trial vencido ao invés de bloquear" defaultOn />
        </div>
        <Field label="Dias de Trial Padrão">
          <Sel options={["7 dias", "14 dias", "30 dias", "60 dias"]} defaultValue="14 dias" />
        </Field>
      </Section>
      <SaveBar />
    </div>
  );
}

function TabEmail() {
  const [showPass, setShowPass] = useState(false);
  return (
    <div className="space-y-4">
      <Section title="Configuração SMTP">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Host SMTP"><Inp placeholder="smtp.exemplo.com" /></Field>
          <Field label="Porta">
            <Sel options={["465 (SSL)", "587 (TLS)", "25 (padrão)"]} defaultValue="587 (TLS)" />
          </Field>
          <Field label="Usuário SMTP"><Inp placeholder="usuario@dominio.com" type="email" /></Field>
          <Field label="Senha SMTP">
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 pr-9 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff className="h-3.5 w-3.5 text-white/30" /> : <Eye className="h-3.5 w-3.5 text-white/30" />}
              </button>
            </div>
          </Field>
          <Field label="Nome do Remetente"><Inp defaultValue="MUSIC OS 360" /></Field>
          <Field label="Email do Remetente"><Inp defaultValue="noreply@musicos360.com" type="email" /></Field>
        </div>
      </Section>
      <Section title="Templates de Email">
        <div className="space-y-0">
          <Toggle label="Email de Boas-vindas" desc="Enviado ao criar novo tenant" defaultOn />
          <Toggle label="Redefinição de Senha" desc="Link seguro com expiração de 1h" defaultOn />
          <Toggle label="Convite de Usuário" desc="Enviado ao convidar membros" defaultOn />
          <Toggle label="Alertas de Contrato" desc="Vencimentos próximos e assinaturas" defaultOn />
          <Toggle label="Relatório Semanal" desc="Resumo automático toda segunda-feira" />
        </div>
      </Section>
      <SaveBar />
    </div>
  );
}

function TabSeguranca() {
  return (
    <div className="space-y-4">
      <Section title="Política de Senhas">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Comprimento Mínimo">
            <Sel options={["8 caracteres", "10 caracteres", "12 caracteres", "16 caracteres"]} defaultValue="12 caracteres" />
          </Field>
          <Field label="Expiração de Senha">
            <Sel options={["Nunca", "30 dias", "60 dias", "90 dias"]} defaultValue="90 dias" />
          </Field>
        </div>
        <div className="space-y-0">
          <Toggle label="Exigir letras maiúsculas e minúsculas" defaultOn />
          <Toggle label="Exigir números" defaultOn />
          <Toggle label="Exigir caracteres especiais" defaultOn />
          <Toggle label="Impedir reutilização das últimas 5 senhas" defaultOn />
        </div>
      </Section>
      <Section title="Autenticação">
        <div className="space-y-0">
          <Toggle label="Autenticação de Dois Fatores (2FA)" desc="Obrigar 2FA para todos os usuários admin" defaultOn />
          <Toggle label="Login via Google" desc="Permitir SSO com conta Google" />
          <Toggle label="Login via Microsoft" desc="Permitir SSO com conta Microsoft" />
          <Toggle label="Bloqueio após tentativas falhas" desc="Bloquear conta após 5 tentativas" defaultOn />
        </div>
      </Section>
      <Section title="Sessão">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Timeout de Sessão" hint="Usuário é desconectado após inatividade">
            <Sel options={["30 minutos", "1 hora", "4 horas", "8 horas", "24 horas"]} defaultValue="4 horas" />
          </Field>
          <Field label="Máximo de Sessões Simultâneas">
            <Sel options={["1 sessão", "2 sessões", "5 sessões", "Ilimitado"]} defaultValue="5 sessões" />
          </Field>
        </div>
      </Section>
      <Section title="Auditoria & Logs">
        <div className="space-y-0">
          <Toggle label="Registrar todos os logins" defaultOn />
          <Toggle label="Registrar alterações de dados sensíveis" defaultOn />
          <Toggle label="Alertar logins de IPs desconhecidos" defaultOn />
          <Toggle label="Exportar logs para SIEM externo" />
        </div>
      </Section>
      <SaveBar />
    </div>
  );
}

function TabNotificacoes() {
  return (
    <div className="space-y-4">
      <Section title="Canais de Notificação">
        <div className="space-y-0">
          <Toggle label="Notificações por Email" defaultOn />
          <Toggle label="Notificações Push (browser)" defaultOn />
          <Toggle label="Notificações In-App" defaultOn />
          <Toggle label="Notificações via Webhook" />
          <Toggle label="Notificações via Slack" />
        </div>
      </Section>
      <Section title="Eventos do Sistema">
        <div className="space-y-0">
          <Toggle label="Novo usuário criado" defaultOn />
          <Toggle label="Novo tenant cadastrado" defaultOn />
          <Toggle label="Falha de integração" defaultOn />
          <Toggle label="Limite de plano atingido" defaultOn />
          <Toggle label="Contrato próximo do vencimento" defaultOn />
          <Toggle label="Erro crítico de sistema" defaultOn />
          <Toggle label="Backup concluído" />
          <Toggle label="Relatório semanal gerado" />
        </div>
      </Section>
      <Section title="Alertas de MRR & Churn">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Alerta MRR Mínimo (R$)" hint="Notifica quando MRR cai abaixo deste valor">
            <Inp defaultValue="100000" type="number" />
          </Field>
          <Field label="Alerta Churn (%)" hint="Notifica quando churn mensal supera este percentual">
            <Inp defaultValue="5" type="number" />
          </Field>
          <Field label="Frequência de Resumos">
            <Sel options={["Diário", "Semanal", "Mensal", "Desativado"]} defaultValue="Semanal" />
          </Field>
          <Field label="Horário de Envio">
            <Sel options={["08:00", "09:00", "10:00", "18:00"]} defaultValue="09:00" />
          </Field>
        </div>
      </Section>
      <SaveBar />
    </div>
  );
}

function TabAparencia() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  return (
    <div className="space-y-4">
      <Section title="Tema da Interface">
        <div className="grid grid-cols-2 gap-3">
          {(["dark", "light"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-xl border p-4 flex items-center gap-3 transition-all",
                theme === t ? "border-primary bg-primary/10" : "border-white/[0.07] bg-white/[0.02] hover:border-white/20",
              )}
              data-testid={`theme-${t}`}
            >
              <div className={cn("h-8 w-8 rounded-lg border", t === "dark" ? "bg-[#0d1117] border-white/20" : "bg-white border-gray-200")} />
              <span className="text-[13px] font-medium text-white/80">{t === "dark" ? "Dark (padrão)" : "Light"}</span>
              {theme === t && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Identidade Visual">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome da Plataforma (sidebar)"><Inp defaultValue="MUSIC OS 360" /></Field>
          <Field label="Slogan (sidebar)"><Inp defaultValue="ERP OPERACIONAL MUSICAL" /></Field>
          <Field label="Cor Primária" hint="Utilizada em botões, links e destaques">
            <div className="flex items-center gap-2">
              <input type="color" defaultValue="#3b82f6" className="h-9 w-12 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer" />
              <Inp defaultValue="#3b82f6" />
            </div>
          </Field>
          <Field label="Cor de Fundo (navbar)">
            <div className="flex items-center gap-2">
              <input type="color" defaultValue="#060d1a" className="h-9 w-12 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer" />
              <Inp defaultValue="#060d1a" />
            </div>
          </Field>
        </div>
        <Field label="Logo da Plataforma" hint="PNG ou SVG, máximo 2MB, fundo transparente recomendado">
          <button className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-[13px] text-white/40 hover:border-primary/40 hover:text-white/60 transition-colors w-full justify-center">
            <Upload className="h-4 w-4" /> Fazer upload do logo
          </button>
        </Field>
        <Field label="Favicon" hint="ICO ou PNG 32×32">
          <button className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-[13px] text-white/40 hover:border-primary/40 hover:text-white/60 transition-colors w-full justify-center">
            <Upload className="h-4 w-4" /> Fazer upload do favicon
          </button>
        </Field>
      </Section>
      <SaveBar />
    </div>
  );
}

const MOCK_WEBHOOKS = [
  { id: "wh-1", url: "https://api.exemplo.com/hooks/musicos360", events: ["ticket.created", "ticket.resolved"], status: "active", last_called: "2026-05-08T08:10:00Z" },
  { id: "wh-2", url: "https://slack.com/services/T00/B00/xxx", events: ["user.invited", "tenant.created"], status: "active", last_called: "2026-05-07T15:30:00Z" },
  { id: "wh-3", url: "https://n8n.empresa.io/webhook/abc123", events: ["contract.expiring"], status: "error", last_called: "2026-05-06T10:00:00Z" },
];

function TabWebhooks() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary/90 transition-colors" data-testid="button-add-webhook">
          <Plus className="h-3.5 w-3.5" /> Novo Webhook
        </button>
      </div>
      <Section title="Endpoints Configurados">
        <div className="space-y-3">
          {MOCK_WEBHOOKS.map(wh => (
            <div key={wh.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2" data-testid={`webhook-${wh.id}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-mono text-white/70 truncate">{wh.url}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn("text-[10px] border", wh.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                    {wh.status === "active" ? "Ativo" : "Erro"}
                  </Badge>
                  <button className="text-white/20 hover:text-white/50 transition-colors"><RefreshCw className="h-3.5 w-3.5" /></button>
                  <button className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {wh.events.map(e => (
                  <span key={e} className="text-[10.5px] px-2 py-0.5 rounded-md bg-primary/10 text-primary/80 font-mono">{e}</span>
                ))}
              </div>
              <p className="text-[11px] text-white/25">Último disparo: {fmtDate(wh.last_called)}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Segredo de Assinatura">
        <Field label="Webhook Secret" hint="Usado para validar a autenticidade dos eventos recebidos">
          <div className="flex items-center gap-2">
            <input
              type="password"
              defaultValue="whsec_abcdefghijklmnop1234567890"
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:outline-none focus:border-primary/40"
            />
            <button className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-[12px] text-white/50 hover:text-white/80 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Rotacionar
            </button>
          </div>
        </Field>
      </Section>
    </div>
  );
}

const MOCK_KEYS = [
  { id: "key-1", name: "Produção Principal",      key: "sk_live_••••••••••••••••3f9a", created: "2026-01-10T00:00:00Z", last_used: "2026-05-08T07:45:00Z", scopes: ["read", "write"] },
  { id: "key-2", name: "Integração Relatórios",   key: "sk_live_••••••••••••••••8b2c", created: "2026-03-01T00:00:00Z", last_used: "2026-05-07T12:00:00Z", scopes: ["read"] },
  { id: "key-3", name: "Webhook Interno",          key: "sk_live_••••••••••••••••1d7e", created: "2026-04-15T00:00:00Z", last_used: "2026-05-06T09:30:00Z", scopes: ["read", "write", "admin"] },
];

function TabChavesApi() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-white/35">{MOCK_KEYS.length} chaves ativas</p>
        <button className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary/90 transition-colors" data-testid="button-create-key">
          <Plus className="h-3.5 w-3.5" /> Nova Chave API
        </button>
      </div>
      <Section title="Chaves Ativas">
        <div className="space-y-3">
          {MOCK_KEYS.map(k => (
            <div key={k.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3" data-testid={`apikey-${k.id}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-white/80">{k.name}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    Criada em {new Date(k.created).toLocaleDateString("pt-BR")} · Último uso: {fmtDate(k.last_used)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="text-white/20 hover:text-white/50 transition-colors" title="Copiar"><Copy className="h-3.5 w-3.5" /></button>
                  <button className="text-white/20 hover:text-red-400 transition-colors" title="Revogar"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <span className="text-[12px] font-mono text-white/40 bg-white/[0.04] px-3 py-1.5 rounded-lg block truncate">{k.key}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {k.scopes.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary/70 font-medium capitalize">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Documentação">
        <p className="text-[12.5px] text-white/40 leading-relaxed">
          Inclua o header <span className="font-mono text-primary/70">Authorization: Bearer sk_live_...</span> em todas as requisições REST.
        </p>
        <button className="mt-1 text-[12px] text-primary hover:underline">Ver documentação completa →</button>
      </Section>
    </div>
  );
}

function TabIntegracoes() {
  const active  = MOCK_INTEGRATIONS.filter(i => i.status === "active").length;
  const error   = MOCK_INTEGRATIONS.filter(i => i.status === "error").length;
  const pending = MOCK_INTEGRATIONS.filter(i => i.status === "pending").length;
  const byCategory = MOCK_INTEGRATIONS.reduce<Record<string, typeof MOCK_INTEGRATIONS>>((acc, i) => {
    acc[i.category] = acc[i.category] ?? [];
    acc[i.category].push(i);
    return acc;
  }, {});
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total",     value: MOCK_INTEGRATIONS.length, icon: Zap,          color: "text-white/50",    bg: "bg-white/5" },
          { label: "Ativos",    value: active,                   icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Com Erro",  value: error,                    icon: AlertCircle,  color: "text-red-400",     bg: "bg-red-500/10" },
          { label: "Pendentes", value: pending,                  icon: Clock,        color: "text-yellow-400",  bg: "bg-yellow-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl mb-3", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat}>
          <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            {CAT_LABEL[cat] ?? cat}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((integration) => {
              const cfg = STATUS_CFG[integration.status];
              const SIcon = cfg.icon;
              return (
                <div key={integration.id} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5 space-y-3" data-testid={`integration-${integration.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
                        <Zap className="h-4 w-4 text-white/30" />
                      </div>
                      <span className="text-[13px] font-semibold text-white">{integration.name}</span>
                    </div>
                    <Badge variant="outline" className={cn("text-[10.5px] border gap-1", cfg.bg, cfg.color)}>
                      <SIcon className="h-3 w-3" />{cfg.label}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-white/40 leading-relaxed">{integration.description}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                    <span className="text-[11px] text-white/30">{integration.tenants_using} tenants usando</span>
                    <span className="text-[10.5px] text-white/20">Sync: {fmtDate(integration.last_sync_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const ROLE_STYLE: Record<AdminRole, string> = {
  super_admin: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  admin:       "text-blue-400 bg-blue-500/10 border-blue-500/20",
  operator:    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  support:     "text-purple-400 bg-purple-500/10 border-purple-500/20",
  finance:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  viewer:      "text-white/40 bg-white/5 border-white/10",
};
const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super Admin", admin: "Admin",
  operator: "Operador", support: "Suporte",
  finance: "Financeiro", viewer: "Viewer",
};

function TabUsuarios() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_ADMIN_USERS.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.tenant_name.toLowerCase().includes(q);
  });
  const active  = MOCK_ADMIN_USERS.filter(u => u.status === "active").length;
  const blocked = MOCK_ADMIN_USERS.filter(u => u.status === "blocked").length;
  const mfa     = MOCK_ADMIN_USERS.filter(u => u.mfa_enabled).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Usuários Ativos", value: active,                  color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Users     },
          { label: "Bloqueados",      value: blocked,                 color: "text-red-400",     bg: "bg-red-500/10",     icon: ShieldOff },
          { label: "Com MFA",         value: mfa,                     color: "text-blue-400",    bg: "bg-blue-500/10",    icon: Shield    },
          { label: "Total",           value: MOCK_ADMIN_USERS.length, color: "text-white/50",    bg: "bg-white/5",        icon: Users     },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl mb-3", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          placeholder="Buscar usuários..."
          className="w-full pl-9 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40"
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-users"
        />
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Usuário", "Tenant", "Role", "MFA", "Status", "Sessões", "Último Login"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((u) => {
              const statusColor = u.status === "active" ? "text-emerald-400" : u.status === "blocked" ? "text-red-400" : "text-white/40";
              return (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" data-testid={`user-${u.id}`}>
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-medium text-white">{u.name}</p>
                    <p className="text-[11px] text-white/35">{u.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-white/50">{u.tenant_name}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className={cn("text-[10.5px] border", ROLE_STYLE[u.role])}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    {u.mfa_enabled
                      ? <Shield className="h-3.5 w-3.5 text-emerald-400" />
                      : <ShieldOff className="h-3.5 w-3.5 text-white/20" />}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("text-[12px] font-medium capitalize", statusColor)}>
                      {u.status === "active" ? "Ativo" : u.status === "blocked" ? "Bloqueado" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-white/40">{u.sessions_count}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-[11.5px] text-white/35">
                      <Clock className="h-3 w-3" />
                      {new Date(u.last_login).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TAB_PANELS: Record<TabKey, React.ComponentType> = {
  usuarios:     TabUsuarios,
  geral:        TabGeral,
  email:        TabEmail,
  seguranca:    TabSeguranca,
  notificacoes: TabNotificacoes,
  aparencia:    TabAparencia,
  webhooks:     TabWebhooks,
  "chaves-api": TabChavesApi,
  integracoes:  TabIntegracoes,
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<TabKey>("geral");
  const Panel = TAB_PANELS[activeTab];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in bg-[hsl(222_47%_4%)] min-h-full">
        <div>
          <h1 className="text-xl font-bold text-white">Configurações</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Gerencie todas as configurações da plataforma</p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0.5 border-b border-white/[0.07] overflow-x-auto pb-0 flex-nowrap">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap border-b-2 transition-all -mb-px",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-white/40 hover:text-white/70 hover:border-white/20",
                )}
                data-testid={`tab-settings-${tab.key}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <Panel />
      </div>
    </AdminLayout>
  );
}
