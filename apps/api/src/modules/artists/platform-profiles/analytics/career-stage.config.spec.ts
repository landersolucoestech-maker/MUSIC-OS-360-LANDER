import { DIMENSION_METRICS, GROWTH_ELIGIBLE_METRICS, CAREER_STAGE_WEIGHTS, AUDIENCE_CEILINGS } from './career-stage.config';
import { METRIC_KEYS } from '../metric-keys';

/**
 * career-stage.config.spec.ts
 *
 * Fase 3.1 — auditoria de double counting (item 28): garante estruturalmente
 * que nenhuma métrica de tamanho/audiência contribui para mais de uma
 * dimensão de tamanho (AUDIENCE/STREAMING/SOCIAL/MARKET_PRESENCE) ao mesmo
 * tempo — regressão do achado real (Spotify contava em AUDIENCE e
 * STREAMING). GROWTH/MOMENTUM são auxiliares e legitimamente reaproveitam o
 * mesmo conjunto de métricas-base (são uma transformação diferente — taxa de
 * variação, não tamanho — não é double counting).
 */
describe('DIMENSION_METRICS — sem double counting entre dimensões de tamanho', () => {
  it('nenhuma métrica aparece em mais de uma dimensão de tamanho', () => {
    const seen = new Map<string, string>();
    for (const [dimension, metrics] of Object.entries(DIMENSION_METRICS)) {
      for (const metric of metrics) {
        const owner = seen.get(metric);
        if (owner) throw new Error(`métrica ${metric} já pertence a ${owner}, não pode também pertencer a ${dimension}`);
        seen.set(metric, dimension);
      }
    }
  });

  it('SPOTIFY_MONTHLY_LISTENERS pertence exclusivamente a STREAMING (regressão do achado real)', () => {
    expect(DIMENSION_METRICS.AUDIENCE).not.toContain(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS);
    expect(DIMENSION_METRICS.STREAMING).toContain(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS);
  });

  it('toda métrica com ceiling configurado é usada em pelo menos uma dimensão ou growth (nenhum ceiling órfão)', () => {
    const usedInDimensions = new Set(Object.values(DIMENSION_METRICS).flat());
    const usedInGrowth = new Set(GROWTH_ELIGIBLE_METRICS);
    for (const metric of Object.keys(AUDIENCE_CEILINGS) as (keyof typeof AUDIENCE_CEILINGS)[]) {
      const used = usedInDimensions.has(metric) || usedInGrowth.has(metric);
      // YOUTUBE_VIEWS/YOUTUBE_VIDEOS têm ceiling documentado para uso futuro
      // do histórico do YouTube, mas não alimentam nenhuma dimensão hoje —
      // exceção conhecida, não um bug.
      if (metric === METRIC_KEYS.YOUTUBE_VIEWS || metric === METRIC_KEYS.YOUTUBE_VIDEOS) continue;
      if (!used) throw new Error(`ceiling configurado para ${metric} mas não usado em nenhuma dimensão/growth`);
    }
  });
});

describe('CAREER_STAGE_WEIGHTS', () => {
  it('cobre exatamente as 6 dimensões do engine, nenhuma a mais ou a menos', () => {
    expect(Object.keys(CAREER_STAGE_WEIGHTS).sort()).toEqual(
      ['AUDIENCE', 'GROWTH', 'MARKET_PRESENCE', 'MOMENTUM', 'SOCIAL', 'STREAMING'].sort(),
    );
  });
});
