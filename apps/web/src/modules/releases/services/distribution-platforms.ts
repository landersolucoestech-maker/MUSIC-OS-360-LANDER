/**
 * distribution-platforms — fonte única do catálogo de distribuidoras e do estado
 * de conexão. As plataformas conectadas vêm de `localStorage` (mesma chave usada
 * por Configurações), que é o estado REAL do app — nada é simulado aqui.
 *
 * Importante: o catálogo lista o que o sistema *suporta*; somente as plataformas
 * efetivamente conectadas devem aparecer como selecionáveis no fluxo de release.
 */

export interface DistributionPlatform {
  id: string;
  name: string;
  description: string;
}

export interface ConnectedDistributionPlatform extends DistributionPlatform {
  /** Identificação da conta conectada (quando disponível). */
  username?: string;
}

/** Catálogo suportado (não implica disponibilidade — ver conexões). */
export const DISTRIBUTION_PLATFORMS: readonly DistributionPlatform[] = [
  { id: "onerpm", name: "ONErpm", description: "Distribuição global com analytics avançados e suporte a label" },
  { id: "distrokid", name: "DistroKid", description: "Distribuição rápida para todas as plataformas de streaming" },
  { id: "symphonic", name: "Symphonic", description: "Distribuição e marketing para artistas e selos independentes" },
  { id: "soundon", name: "SoundOn", description: "Distribuidora oficial do TikTok com monetização integrada" },
  { id: "musicpro", name: "MusicPro", description: "Distribuição profissional com suporte dedicado e recebimentos externos de direitos mensais" },
  { id: "somvibe", name: "SomVibe", description: "Distribuidora brasileira independente com foco no mercado nacional" },
] as const;

/** Chave de persistência das conexões de distribuidora (compartilhada com Configurações). */
export const DISTRIBUTOR_CONNECTIONS_KEY = "musicos360_distributor_connections";

type ConnectionMap = Record<string, { username?: string } | undefined>;

function readConnections(): ConnectionMap {
  try {
    const raw = localStorage.getItem(DISTRIBUTOR_CONNECTIONS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ConnectionMap;
    return {};
  } catch {
    return {};
  }
}

/** Retorna apenas as plataformas realmente conectadas/habilitadas. */
export function getEnabledDistributionPlatforms(): ConnectedDistributionPlatform[] {
  const connections = readConnections();
  return DISTRIBUTION_PLATFORMS.filter((p) => Boolean(connections[p.id])).map((p) => ({
    ...p,
    username: connections[p.id]?.username,
  }));
}

/** Procura uma plataforma do catálogo pelo id. */
export function findDistributionPlatform(id: string | null | undefined): DistributionPlatform | undefined {
  if (!id) return undefined;
  return DISTRIBUTION_PLATFORMS.find((p) => p.id === id);
}
