/**
 * shared/dev/devProfiles.ts
 *
 * SIMULADOR DE PERFIL — exclusivamente DEV/MOCK_MODE.
 *
 * Permite validar VISUALMENTE como o sistema aparece para cada perfil de
 * usuário/setor (menus/sidebar/escopo), filtrando a navegação por um mapa
 * perfil → módulos permitidos.
 *
 * IMPORTANTE: isto NÃO é segurança real. É apenas validação visual/comportamental
 * de RBAC. A fonte de verdade de permissões será o backend (RBAC + tenant
 * isolation). Quando `MOCK_MODE` for false, este simulador é ignorado.
 */

import { useSyncExternalStore } from "react";

export type DevProfileId =
  | "admin"
  | "artista"
  | "marketing"
  | "financeiro"
  | "design"
  | "audiovisual"
  | "admin_direitos"
  | "suporte";

export interface DevProfile {
  id: DevProfileId;
  label: string;
  description: string;
  /** true = vê tudo (sem filtro). */
  all?: boolean;
  /** hrefs (rotas-folha e standalone) permitidos para o perfil. "/" sempre incluso. */
  allow: string[];
  /** Exibe itens administrativos (Auditoria, Painel Admin). */
  showAdminItems?: boolean;
  /** Exibe o atalho de Configurações no rodapé. */
  showSettings?: boolean;
}

export const DEV_PROFILES: Record<DevProfileId, DevProfile> = {
  admin: {
    id: "admin",
    label: "Admin / Dono",
    description: "Acesso completo ao sistema.",
    all: true,
    allow: [],
    showAdminItems: true,
    showSettings: true,
  },
  artista: {
    id: "artista",
    label: "Artista",
    description: "Apenas o que é relacionado a ele (projetos, lançamentos, agenda, conteúdos, métricas).",
    allow: ["/", "/projetos", "/lancamentos", "/agenda", "/marketing/calendario", "/marketing/metricas"],
    showAdminItems: false,
    showSettings: false,
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    description: "Campanhas, calendário, tarefas, métricas, planejamento e briefing.",
    allow: [
      "/", "/agenda",
      "/marketing/visao-geral", "/marketing/campanhas", "/marketing/calendario",
      "/marketing/tarefas", "/marketing/metricas", "/marketing/briefing", "/marketing/ia-criativa",
    ],
    showAdminItems: false,
    showSettings: false,
  },
  financeiro: {
    id: "financeiro",
    label: "Financeiro",
    description: "Receitas, despesas, transações, notas fiscais e relatórios.",
    allow: ["/", "/accounting", "/accounting/contabilidade", "/accounting/nota-fiscal", "/relatorios"],
    showAdminItems: false,
    showSettings: false,
  },
  design: {
    id: "design",
    label: "Design",
    description: "Tarefas de design, capas, artes, assets de referência e aprovações.",
    allow: ["/", "/marketing/tarefas"],
    showAdminItems: false,
    showSettings: false,
  },
  audiovisual: {
    id: "audiovisual",
    label: "Audiovisual",
    description: "Tarefas audiovisuais (teaser, reels, shorts, clipe), assets e aprovações.",
    allow: ["/", "/audiovisual", "/marketing/tarefas"],
    showAdminItems: false,
    showSettings: false,
  },
  admin_direitos: {
    id: "admin_direitos",
    label: "Administrativo / Direitos Autorais",
    description: "Obras, fonogramas, splits, contratos, ISRC/ISWC e registros.",
    allow: ["/", "/registro-musicas", "/rights-monitoring", "/licenciamento", "/takedowns", "/contratos"],
    showAdminItems: false,
    showSettings: false,
  },
  suporte: {
    id: "suporte",
    label: "Atendimento / Suporte",
    description: "Tickets, clientes/artistas vinculados e histórico de interações.",
    allow: ["/", "/support", "/leads", "/chat"],
    showAdminItems: false,
    showSettings: false,
  },
};

export const DEV_PROFILE_LIST: DevProfile[] = Object.values(DEV_PROFILES);

/** Verifica se um href é permitido para o perfil (admin = tudo). */
export function isHrefAllowed(profileId: DevProfileId, href: string): boolean {
  const profile = DEV_PROFILES[profileId] ?? DEV_PROFILES.admin;
  if (profile.all) return true;
  if (href === "/") return true;
  return profile.allow.includes(href);
}

// ─── Store reativo (localStorage) ─────────────────────────────────────────────

const STORAGE_KEY = "musicos360_dev_profile";
const listeners = new Set<() => void>();

function load(): DevProfileId {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as DevProfileId | null;
    return v && v in DEV_PROFILES ? v : "admin";
  } catch {
    return "admin";
  }
}

let current: DevProfileId = load();

export function getDevProfile(): DevProfileId {
  return current;
}

export function setDevProfile(profile: DevProfileId): void {
  current = profile;
  try {
    localStorage.setItem(STORAGE_KEY, profile);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hook reativo do perfil dev ativo. */
export function useDevProfile(): DevProfileId {
  return useSyncExternalStore(subscribe, getDevProfile, getDevProfile);
}
