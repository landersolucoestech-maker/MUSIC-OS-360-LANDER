/**
 * metrics/platform-metric-capabilities.ts
 *
 * SUBCLUSTER D — registry central de CAPACIDADES de métrica por plataforma.
 *
 * Descreve ESTRUTURA, nunca dados: que métricas a fonte atual realmente fornece
 * para cada plataforma, com que rótulo, grupo semântico e prioridade visual.
 * Remove a hipótese — falsa — de que toda plataforma tem o mesmo schema.
 *
 * FONTE DA VERDADE: os providers reais em
 * apps/api/src/modules/artists/platform-profiles/providers/*.ts, que hoje
 * preenchem exatamente estes campos (o resto fica `null`):
 *
 *   spotify      → monthly_listeners   (followers/subscribers null)
 *   youtube      → subscribers         (followers/monthly_listeners null)
 *   soundcloud   → followers
 *   deezer       → followers           (fans da API Deezer)
 *   instagram    → followers
 *   tiktok       → followers
 *   apple_music  → NENHUMA             (os três campos são null)
 *
 * Apple Music não tem entrada de métrica de propósito: a Soundcharts não expõe
 * audiência para Apple Music no fluxo atual. Inventar "Ouvintes: 0" ou
 * "Ouvintes: N/A" só porque outras plataformas têm ouvintes seria fabricar
 * informação.
 */

/** Chaves de métrica que o backend realmente entrega. */
export type PlatformMetricKey = "monthly_listeners" | "followers" | "subscribers";

/**
 * Ordem semântica desejada quando houver dados correspondentes:
 * consumption → audience → reach → engagement → followers.
 */
export type MetricSemanticGroup =
  | "consumption" | "audience" | "reach" | "engagement" | "followers";

export interface PlatformMetricDefinition {
  key: PlatformMetricKey;
  label: string;
  semanticGroup: MetricSemanticGroup;
  /** Menor = mais importante. Deriva do grupo semântico. */
  priority: number;
}

const SEMANTIC_PRIORITY: Record<MetricSemanticGroup, number> = {
  consumption: 10,
  audience: 20,
  reach: 30,
  engagement: 40,
  followers: 50,
};

const def = (
  key: PlatformMetricKey, label: string, semanticGroup: MetricSemanticGroup,
): PlatformMetricDefinition => ({
  key, label, semanticGroup, priority: SEMANTIC_PRIORITY[semanticGroup],
});

/**
 * Capacidades por plataforma. Uma lista VAZIA é uma afirmação legítima:
 * "esta fonte não fornece métrica de audiência para esta plataforma".
 */
export const PLATFORM_METRIC_CAPABILITIES: Record<string, readonly PlatformMetricDefinition[]> = {
  spotify:     [def("monthly_listeners", "Ouvintes mensais", "audience")],
  youtube:     [def("subscribers", "Inscritos", "followers")],
  soundcloud:  [def("followers", "Seguidores", "followers")],
  deezer:      [def("followers", "Fãs", "followers")],
  instagram:   [def("followers", "Seguidores", "followers")],
  tiktok:      [def("followers", "Seguidores", "followers")],
  // Sem métrica de audiência na fonte atual — ver cabeçalho.
  apple_music: [],
};

/** Aceita os dois formatos de slug usados no projeto (apple-music / apple_music). */
function normalize(platform: string): string {
  return platform.trim().toLowerCase().replace(/-/g, "_");
}

export function metricCapabilitiesOf(platform: string): readonly PlatformMetricDefinition[] {
  return PLATFORM_METRIC_CAPABILITIES[normalize(platform)] ?? [];
}

export interface ResolvedMetric extends PlatformMetricDefinition {
  value: number;
}

/**
 * Resolve o que a UI deve renderizar para uma plataforma.
 *
 * Regras que este resolver existe para garantir:
 *   - métrica NÃO suportada pela fonte nunca aparece, mesmo que venha valor;
 *   - métrica suportada mas ausente (null/undefined) NÃO vira 0 fabricado;
 *   - `0` real é dado e continua sendo renderizado;
 *   - ordenação por prioridade semântica, não por ordem de chegada.
 */
export function resolvePlatformMetrics(
  platform: string,
  values: Partial<Record<PlatformMetricKey, number | null | undefined>>,
): ResolvedMetric[] {
  return metricCapabilitiesOf(platform)
    .filter((d) => typeof values[d.key] === "number" && Number.isFinite(values[d.key] as number))
    .map((d) => ({ ...d, value: values[d.key] as number }))
    .sort((a, b) => a.priority - b.priority);
}

/** Formatação compacta pt-BR, usada por todas as plataformas. */
export function formatMetricValue(value: number): string {
  return value.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
}

export interface PrimaryMetric {
  key: PlatformMetricKey;
  label: string;
  value: number | null;
}

/**
 * Métrica principal de uma plataforma: a de MAIOR prioridade semântica que a
 * fonte realmente suporta. `value: null` = suportada mas ausente (nunca 0
 * fabricado). Retorna null quando a fonte não fornece métrica alguma.
 */
export function primaryMetricFor(
  platform: string,
  snapshot: Partial<Record<PlatformMetricKey, number | null | undefined>> | null | undefined,
): PrimaryMetric | null {
  const [def] = [...metricCapabilitiesOf(platform)].sort((a, b) => a.priority - b.priority);
  if (!def) return null;
  const v = snapshot?.[def.key];
  const value = typeof v === "number" && Number.isFinite(v) ? v : null;
  return { key: def.key, label: def.label, value };
}
