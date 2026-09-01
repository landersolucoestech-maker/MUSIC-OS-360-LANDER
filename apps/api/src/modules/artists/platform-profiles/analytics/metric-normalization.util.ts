/**
 * analytics/metric-normalization.util.ts
 *
 * Fase 3 — normalização determinística de métricas Soundcharts brutas para
 * escala 0-100 comparável entre plataformas de ordens de grandeza muito
 * diferentes (20 mil seguidores vs 1,2 milhão de views do YouTube). Nunca
 * agregar/comparar valores brutos diretamente entre métricas de unidades
 * diferentes (item 36) — toda comparação passa por aqui primeiro.
 */

export type NormalizationStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'ZERO_REAL';

export interface NormalizedScore {
  status: NormalizationStatus;
  /** 0-100, ou null quando status=UNAVAILABLE. */
  score: number | null;
  rawValue: number | null;
}

/**
 * Normalização logarítmica limitada para métricas de TAMANHO de audiência
 * (followers/subscribers/monthly listeners/fans/playlist count).
 *
 * Por quê log e não linear (item 17): audiência real segue distribuição de
 * cauda longa — a diferença entre 100 e 1.000 seguidores é tão significativa
 * para o estágio de carreira quanto a diferença entre 1M e 10M; uma escala
 * linear comprimiria toda a faixa "artista pequeno/médio" perto de zero e
 * tornaria o score insensível a crescimento real nessa faixa, que é
 * exatamente onde a maioria dos artistas do produto está.
 *
 * `ceiling` é um valor de referência versionado (não um limite físico —
 * valores acima dele são clampados a 100), documentado por métrica em
 * career-stage.config.ts.
 *
 * Fórmula: score = 100 * log10(value + 1) / log10(ceiling + 1), clamp [0,100].
 *
 * CALIBRAÇÃO (Fase 3.1, item 22 — auditoria matemática):
 *   - value = 0        → score = 0   (log10(1) = 0)
 *   - value = ceiling   → score = 100  (log10(ceiling+1)/log10(ceiling+1) = 1)
 *   - value = √ceiling  → score ≈ 50  (log10(√c+1)/log10(c+1) ≈ 0.5, propriedade
 *     matemática exata da escala log: o PONTO MÉDIO em espaço logarítmico entre
 *     1 e `ceiling` é a raiz quadrada de `ceiling`, não `ceiling/2`). Exemplo:
 *     ceiling=50.000.000 → score=50 em ~7.071 (não em 25.000.000) — é assim
 *     que uma escala log deveria funcionar: a diferença de 100→1.000 pesa
 *     tanto quanto 1M→10M, exatamente a justificativa do item 17.
 * `ceiling` em si continua sendo uma escolha de produto (documentada por
 * métrica em AUDIENCE_CEILINGS, não uma constante física) — o que deixou de
 * ser arbitrário é COMO um valor bruto vira 0-100 dado esse ceiling: a
 * fórmula é fixa, testada (metric-normalization.util.spec.ts, casos "large
 * audience"/"small audience"/anchors) e produz exatamente o mesmo número
 * para a mesma entrada sempre (determinismo comprovado por teste).
 */
export function normalizeAudienceSize(value: number | null | undefined, ceiling: number): NormalizedScore {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return { status: 'UNAVAILABLE', score: null, rawValue: null };
  }
  if (value === 0) {
    // Zero real é dado real (item 8) — nunca UNAVAILABLE, mas também não é
    // "sem audiência = neutro": score 0 é o resultado matematicamente
    // correto (log10(1)/log10(ceiling+1) = 0).
    return { status: 'ZERO_REAL', score: 0, rawValue: 0 };
  }
  const raw = 100 * (Math.log10(value + 1) / Math.log10(ceiling + 1));
  return { status: 'AVAILABLE', score: Math.max(0, Math.min(100, raw)), rawValue: value };
}

/**
 * Normalização de variação percentual (growth 30d/90d/etc.) para 0-100,
 * centrada em 50 (0% de crescimento = neutro).
 *
 * growth já é uma métrica relativa — não precisa de log-scale — mas precisa
 * de limites: um salto de +500% num artista muito pequeno (poucas dezenas de
 * seguidores) não deve "quebrar" a escala. `positiveCeiling`/`negativeFloor`
 * (percentuais) mapeiam para score 100/0; valores além são clampados.
 *
 * Sem histórico suficiente (`percentageChange === null`, incluindo o caso
 * `previousValue === 0` do computeGrowth) → UNAVAILABLE, NUNCA 50 forçado —
 * 50 só aparece quando o crescimento real medido é exatamente 0%.
 */
export function normalizeGrowthPercent(
  percentageChange: number | null,
  positiveCeiling: number,
  negativeFloor: number,
): NormalizedScore {
  if (percentageChange == null || !Number.isFinite(percentageChange)) {
    return { status: 'UNAVAILABLE', score: null, rawValue: null };
  }
  if (percentageChange === 0) {
    return { status: 'ZERO_REAL', score: 50, rawValue: 0 };
  }
  const raw =
    percentageChange >= 0
      ? 50 + 50 * Math.min(1, percentageChange / positiveCeiling)
      : 50 - 50 * Math.min(1, Math.abs(percentageChange) / Math.abs(negativeFloor));
  return { status: 'AVAILABLE', score: Math.max(0, Math.min(100, raw)), rawValue: percentageChange };
}

/** Média simples dos scores disponíveis (ignora UNAVAILABLE). null se nenhum disponível. */
export function averageAvailable(scores: NormalizedScore[]): number | null {
  const available = scores.filter((s): s is NormalizedScore & { score: number } => s.score != null);
  if (available.length === 0) return null;
  return available.reduce((acc, s) => acc + s.score, 0) / available.length;
}

/** Mediana de uma amostra numérica — correta para tamanho par e ímpar, entrada não ordenada. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Percentil do valor do artista dentro de uma coorte (0-100): "% da coorte
 * com valor menor ou igual, com empates contando pela metade" — o método
 * padrão de rank médio em empates, evita que um cluster de valores iguais
 * jogue o percentil artificialmente para cima ou para baixo. Determinístico
 * para entrada não ordenada, amostra pequena, outliers e valores negativos
 * (growth pode ser negativo — tratado normalmente, sem caso especial).
 */
export function percentileRank(cohortValues: number[], artistValue: number): number | null {
  if (cohortValues.length === 0) return null;
  const below = cohortValues.filter((v) => v < artistValue).length;
  const equal = cohortValues.filter((v) => v === artistValue).length;
  const rank = below + equal / 2;
  return (rank / cohortValues.length) * 100;
}
