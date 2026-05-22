/**
 * shared/governance/modules.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * MUSIC OS 360 — Registo Canónico de Módulos
 *
 * Fonte única de verdade para:
 *   - Lista de todos os módulos do sistema
 *   - Rota raiz de cada módulo
 *   - Chave de permissão RBAC (TenantModuleKey)
 *   - Feature flag que controla o acesso
 *   - Entidades primárias do módulo
 *   - Dependências entre módulos
 *   - Estado de implementação
 *
 * REGRA: nenhum módulo novo pode ser adicionado ao sistema sem ser
 *        primeiro registado aqui, com todas as propriedades preenchidas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { TenantModuleKey } from "@/app/providers/TenantContext";

// ─── Tipos do registo ─────────────────────────────────────────────────────────

export type ModuleStatus =
  | "production"    // activo, em produção (modo standalone)
  | "beta"          // funcional mas incompleto
  | "stub"          // estrutura presente, conteúdo a desenvolver
  | "planned";      // planeado, ainda não implementado

export interface ModuleDefinition {
  /** Identificador único do módulo (TenantModuleKey) */
  key: TenantModuleKey;
  /** Nome de apresentação */
  name: string;
  /** Rota raiz no React Router */
  route: string;
  /** Feature flag em FeatureFlags */
  featureFlag: string;
  /** Entidades primárias geridas pelo módulo */
  primaryEntities: string[];
  /** Módulos dos quais este depende (lê dados de) */
  dependsOn: TenantModuleKey[];
  /** Módulos que dependem deste (consomem dados deste) */
  consumedBy: TenantModuleKey[];
  /** Estado actual de implementação */
  status: ModuleStatus;
  /** Breve descrição funcional */
  description: string;
}

// ─── Registo de módulos ───────────────────────────────────────────────────────

export const MODULE_REGISTRY: Record<TenantModuleKey, ModuleDefinition> = {

  // ── Artists ─────────────────────────────────────────────────────────────────
  artists: {
    key:             "artists",
    name:            "Artistas",
    route:           "/artistas",
    featureFlag:     "moduleArtists",
    primaryEntities: ["Artista"],
    dependsOn:       ["contracts", "catalog"],
    consumedBy:      ["catalog", "releases", "contracts", "crm",
                      "accounting", "marketing", "events", "monitoring",
                      "licensing", "projects"],
    status:          "production",
    description:
      "Gestão completa de artistas: perfil, dados fiscais, relacionamentos " +
      "(empresário, gravadora, editora, booker), métricas de plataformas de " +
      "streaming e visão 360° consolidada.",
  },

  // ── Catalog ─────────────────────────────────────────────────────────────────
  catalog: {
    key:             "catalog",
    name:            "Catálogo",
    route:           "/catalogo",
    featureFlag:     "moduleCatalog",
    primaryEntities: ["Obra", "Fonograma"],
    dependsOn:       ["artists"],
    consumedBy:      ["releases", "licensing", "monitoring", "accounting"],
    status:          "production",
    description:
      "Catálogo musical completo: obras (composições, ISWC), fonogramas " +
      "(gravações, ISRC), shares de composição e master, " +
      "metadata editorial e controlo de territórios.",
  },

  // ── Releases ────────────────────────────────────────────────────────────────
  releases: {
    key:             "releases",
    name:            "Lançamentos",
    route:           "/lancamentos",
    featureFlag:     "moduleReleases",
    primaryEntities: ["Lancamento", "Share"],
    dependsOn:       ["artists", "catalog"],
    consumedBy:      ["accounting", "marketing", "monitoring"],
    status:          "production",
    description:
      "Lançamentos musicais (single, EP, álbum, compilação, live): " +
      "metadata, distribuidoras, plataformas, datas de entrega e " +
      "gestão de shares/participações por lançamento.",
  },

  // ── Contracts ───────────────────────────────────────────────────────────────
  contracts: {
    key:             "contracts",
    name:            "Contratos",
    route:           "/contratos",
    featureFlag:     "moduleContracts",
    primaryEntities: ["Contrato", "TemplateContrato"],
    dependsOn:       ["artists", "crm"],
    consumedBy:      ["accounting", "artists", "releases"],
    status:          "production",
    description:
      "Gestão de contratos: templates editáveis, assinatura digital " +
      "(Autentique), alertas de vencimento, histórico de versões e " +
      "rastreio de status (rascunho → assinado → encerrado).",
  },

  // ── Accounting ──────────────────────────────────────────────────────────────
  accounting: {
    key:             "accounting",
    name:            "Accounting",
    route:           "/accounting",
    featureFlag:     "moduleAccounting",
    primaryEntities: ["Transacao", "NotaFiscal"],
    dependsOn:       ["artists", "contracts", "projects"],
    consumedBy:      [],
    status:          "production",
    description:
      "Contabilidade operacional: transações (receita/despesa), P&L por " +
      "artista e projecto, fluxo de caixa, conciliação bancária OFX, " +
      "recoupment tracking e emissão de notas fiscais. " +
      "ÂMBITO: receita − despesa = lucro líquido. " +
      "NÃO inclui: recebimentos externos de direitos, splits, distribuição de pagamentos.",
  },

  // ── CRM ─────────────────────────────────────────────────────────────────────
  crm: {
    key:             "crm",
    name:            "CRM",
    route:           "/crm",
    featureFlag:     "moduleCrm",
    primaryEntities: ["Cliente", "Contato"],
    dependsOn:       ["artists"],
    consumedBy:      ["contracts", "marketing", "leads"],
    status:          "production",
    description:
      "CRM de clientes e contactos: empresas, pessoas físicas, " +
      "histórico de interacções, segmentação e vinculação a artistas.",
  },

  // ── Marketing ───────────────────────────────────────────────────────────────
  marketing: {
    key:             "marketing",
    name:            "Marketing",
    route:           "/marketing",
    featureFlag:     "moduleMarketing",
    primaryEntities: ["Campanha", "Conteudo"],
    dependsOn:       ["artists", "releases", "crm"],
    consumedBy:      [],
    status:          "production",
    description:
      "Gestão de campanhas e conteúdo: calendário editorial, briefings, " +
      "tarefas de marketing, IA Criativa para copy e " +
      "integração com Meta Ads (stub), Google Ads (stub), " +
      "TikTok Ads (stub).",
  },

  // ── Events ──────────────────────────────────────────────────────────────────
  events: {
    key:             "events",
    name:            "Eventos",
    route:           "/operacoes/eventos",
    featureFlag:     "moduleEvents",
    primaryEntities: ["Evento"],
    dependsOn:       ["artists", "projects"],
    consumedBy:      ["accounting"],
    status:          "production",
    description:
      "Gestão de eventos ao vivo e em estúdio: shows, festivais, " +
      "gravações, videoclipes, ensaios. Controlo de status, " +
      "datas, locais e vinculação a artistas e projectos.",
  },

  // ── Inventory ───────────────────────────────────────────────────────────────
  inventory: {
    key:             "inventory",
    name:            "Inventário",
    route:           "/operacoes/inventario",
    featureFlag:     "moduleInventory",
    primaryEntities: ["Inventario"],
    dependsOn:       [],
    consumedBy:      ["accounting"],
    status:          "production",
    description:
      "Inventário de equipamentos e activos: estado (disponível, em uso, " +
      "manutenção, emprestado, descartado), localização e " +
      "histórico de utilização.",
  },

  // ── RH ──────────────────────────────────────────────────────────────────────
  rh: {
    key:             "rh",
    name:            "Recursos Humanos",
    route:           "/operacoes/rh",
    featureFlag:     "moduleRh",
    primaryEntities: ["Funcionario", "FeriasAusencia"],
    dependsOn:       [],
    consumedBy:      ["accounting"],
    status:          "production",
    description:
      "Gestão de colaboradores: CLT, PJ, autónomos, estagiários. " +
      "Cargos, departamentos, contratos de trabalho, " +
      "férias e ausências.",
  },

  // ── Monitoring ──────────────────────────────────────────────────────────────
  monitoring: {
    key:             "monitoring",
    name:            "Monitoramento",
    route:           "/monitoramento",
    featureFlag:     "moduleMonitoring",
    primaryEntities: ["Takedown"],
    dependsOn:       ["catalog", "artists"],
    consumedBy:      [],
    status:          "production",
    description:
      "Monitoramento de uso do catálogo e protecção de direitos: " +
      "takedowns (plataformas digitais), conciliação ECAD " +
      "(ECADViewModal), tracking de infracções e rastreio de uso " +
      "não autorizado.",
  },

  // ── Licensing ───────────────────────────────────────────────────────────────
  licensing: {
    key:             "licensing",
    name:            "Licenciamento",
    route:           "/licencas",
    featureFlag:     "moduleLicensing",
    primaryEntities: ["Licenca"],
    dependsOn:       ["catalog", "contracts", "crm"],
    consumedBy:      ["accounting"],
    status:          "production",
    description:
      "Licenciamento de obras: sincronia, mecânica, performance, " +
      "impressão, digital, streaming. Controlo de territórios, " +
      "prazos e valores por tipo de uso.",
  },

  // ── Projects ─────────────────────────────────────────────────────────────────
  projects: {
    key:             "projects",
    name:            "Projetos",
    route:           "/projetos",
    featureFlag:     "moduleProjects",
    primaryEntities: ["Projeto"],
    dependsOn:       ["artists", "catalog", "events"],
    consumedBy:      ["accounting", "events"],
    status:          "production",
    description:
      "Gestão de projectos musicais: álbuns, EPs, singles, videoclipes, " +
      "shows, tours e campanhas. P&L por projecto, " +
      "recoupment tracking e vinculação a transações.",
  },

  // ── Leads ───────────────────────────────────────────────────────────────────
  leads: {
    key:             "leads",
    name:            "Leads",
    route:           "/crm/leads",
    featureFlag:     "moduleLeads",
    primaryEntities: ["Lead"],
    dependsOn:       ["crm"],
    consumedBy:      ["crm", "contracts"],
    status:          "production",
    description:
      "Pipeline de leads em Kanban: novo → em contacto → proposta → " +
      "negociação → fechado / perdido. Temperatura, prioridade, " +
      "valor estimado e histórico de actividade.",
  },

  // ── Audit ────────────────────────────────────────────────────────────────────
  audit: {
    key:             "audit",
    name:            "Auditoria",
    route:           "/admin/auditoria",
    featureFlag:     "auditLog",
    primaryEntities: ["AuditLog"],
    dependsOn:       [],
    consumedBy:      [],
    status:          "stub",
    description:
      "Log de auditoria de todas as acções do sistema: quem fez o quê, " +
      "quando e em que entidade. Acesso restrito a owner/admin. " +
      "FUTURO: integração com backend persistente.",
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  settings: {
    key:             "settings",
    name:            "Configurações",
    route:           "/configuracoes",
    featureFlag:     "moduleArtists",  // sempre acessível
    primaryEntities: ["Tenant", "User", "Role"],
    dependsOn:       [],
    consumedBy:      [],
    status:          "production",
    description:
      "Configurações do tenant: perfil da empresa, utilizadores, " +
      "papéis e permissões RBAC, integrações (ABRAMUS funcional; " +
      "restantes em stub) e personalizacao operacional de tenant.",
  },
};

// ─── Helpers de acesso ao registo ─────────────────────────────────────────────

export function getModule(key: TenantModuleKey): ModuleDefinition {
  return MODULE_REGISTRY[key];
}

export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

export function getModulesByStatus(status: ModuleStatus): ModuleDefinition[] {
  return getAllModules().filter(m => m.status === status);
}

export function getModuleDependencies(key: TenantModuleKey): ModuleDefinition[] {
  return MODULE_REGISTRY[key].dependsOn.map(dep => MODULE_REGISTRY[dep]);
}

export function getModuleConsumers(key: TenantModuleKey): ModuleDefinition[] {
  return getAllModules().filter(m => m.dependsOn.includes(key));
}

// ─── Regras de camada compartilhada ──────────────────────────────────────────

/**
 * REGRA: o que pode e o que NÃO pode ir em shared/.
 *
 * PODE ir em shared/:
 *   - Tipos usados por 2+ módulos (refs.ts, enums.ts)
 *   - Componentes UI primitivos (shadcn/Radix wrappers)
 *   - Componentes genuinamente cross-domain (MainLayout, PageHeader,
 *     ContratoStatusBadge, DataTable, FinanceChart, AIGenerateButton)
 *   - Infra-estrutura de app (ErrorBoundary, RouteErrorBoundary, AdminRoute)
 *   - Providers (AuthProvider, TenantProvider)
 *   - Config (queryClient, CACHE_TIMES)
 *   - Hooks cross-domain (useCommandPalette, useTenant, useAuth)
 *   - Utilitários puros (utils.ts, normalize.ts, tenant-isolation.ts)
 *   - Contratos de integração (shared/integrations/contracts/)
 *   - Governance (shared/governance/)
 *
 * NÃO PODE ir em shared/:
 *   - Lógica específica de um único módulo
 *   - Componentes que só fazem sentido num módulo
 *   - Serviços com conhecimento de domínio específico
 *   - Mappers de entidade (pertencem ao módulo dono da entidade)
 */
export const SHARED_LAYER_RULES = {
  allowed: [
    "tipos cross-domain (2+ módulos)",
    "componentes UI primitivos (shadcn/Radix)",
    "componentes genuinamente cross-domain",
    "infra-estrutura de app (ErrorBoundary, AdminRoute)",
    "providers (Auth, Tenant)",
    "config (queryClient)",
    "hooks cross-domain",
    "utilitários puros",
    "contratos de integração",
    "governance",
  ],
  forbidden: [
    "lógica específica de módulo único",
    "componentes apenas de um módulo",
    "serviços com domínio específico",
    "mappers de entidade (pertencem ao módulo)",
  ],
} as const;
