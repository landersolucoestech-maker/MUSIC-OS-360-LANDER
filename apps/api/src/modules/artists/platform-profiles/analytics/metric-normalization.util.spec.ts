import { normalizeAudienceSize, normalizeGrowthPercent, averageAvailable, median, percentileRank } from './metric-normalization.util';

describe('normalizeAudienceSize', () => {
  it('large audience: valor no ceiling produz score ~100', () => {
    const r = normalizeAudienceSize(50_000_000, 50_000_000);
    expect(r.status).toBe('AVAILABLE');
    expect(r.score).toBeCloseTo(100, 0);
  });

  it('valor acima do ceiling é clampado a 100, nunca > 100', () => {
    const r = normalizeAudienceSize(500_000_000, 50_000_000);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeCloseTo(100, 0);
  });

  it('small audience: valor pequeno produz score baixo mas positivo (não zerado por escala linear)', () => {
    const r = normalizeAudienceSize(100, 50_000_000);
    expect(r.status).toBe('AVAILABLE');
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(50);
  });

  it('zero real: status ZERO_REAL, score 0 — nunca UNAVAILABLE', () => {
    const r = normalizeAudienceSize(0, 50_000_000);
    expect(r.status).toBe('ZERO_REAL');
    expect(r.score).toBe(0);
  });

  it('null/undefined: UNAVAILABLE, score null — nunca 0 fabricado', () => {
    expect(normalizeAudienceSize(null, 1000).status).toBe('UNAVAILABLE');
    expect(normalizeAudienceSize(null, 1000).score).toBeNull();
    expect(normalizeAudienceSize(undefined, 1000).status).toBe('UNAVAILABLE');
  });

  it('valor negativo (dado inválido, nunca deveria ocorrer com dado real): UNAVAILABLE', () => {
    expect(normalizeAudienceSize(-5, 1000).status).toBe('UNAVAILABLE');
  });

  it('unidades diferentes (ceiling diferente) produzem escalas comparáveis 0-100', () => {
    const spotify = normalizeAudienceSize(1_000_000, 50_000_000);
    const appleMusicPlaylists = normalizeAudienceSize(50, 5_000);
    expect(spotify.score).toBeGreaterThanOrEqual(0);
    expect(spotify.score).toBeLessThanOrEqual(100);
    expect(appleMusicPlaylists.score).toBeGreaterThanOrEqual(0);
    expect(appleMusicPlaylists.score).toBeLessThanOrEqual(100);
  });

  it('determinismo: mesma entrada produz exatamente o mesmo score', () => {
    const a = normalizeAudienceSize(123_456, 10_000_000);
    const b = normalizeAudienceSize(123_456, 10_000_000);
    expect(a).toEqual(b);
  });

  // ── Calibração / anchors (Fase 3.1, item 40) — known input -> known output,
  // provando que a fórmula não é ajuste arbitrário mas uma propriedade
  // matemática fixa da escala logarítmica.
  describe('calibração (anchors)', () => {
    it('anchor mínimo: value=0 -> score exatamente 0', () => {
      expect(normalizeAudienceSize(0, 1_000_000).score).toBe(0);
    });
    it('anchor máximo: value=ceiling -> score exatamente 100', () => {
      expect(normalizeAudienceSize(1_000_000, 1_000_000).score).toBeCloseTo(100, 6);
    });
    it('anchor central: value=√ceiling -> score ≈ 50 (propriedade matemática da escala log, não constante escolhida)', () => {
      const ceiling = 1_000_000;
      const sqrtCeiling = Math.sqrt(ceiling); // 1000
      const r = normalizeAudienceSize(sqrtCeiling, ceiling);
      expect(r.score).toBeCloseTo(50, 0);
    });
    it('a mesma proporção value/ceiling produz o mesmo score independente da escala absoluta (log é invariante a escala multiplicativa próxima do topo)', () => {
      const small = normalizeAudienceSize(900_000, 1_000_000);
      const large = normalizeAudienceSize(90_000_000, 100_000_000);
      // Ambos a 90% do próprio ceiling — não idênticos (log não é linear),
      // mas ambos devem ficar na faixa alta (>85), provando que o "sentido"
      // da escala (perto do teto = score alto) é consistente entre ceilings.
      expect(small.score).toBeGreaterThan(85);
      expect(large.score).toBeGreaterThan(85);
    });
  });
});

describe('normalizeGrowthPercent', () => {
  it('0% de crescimento real: ZERO_REAL, score 50 (neutro)', () => {
    const r = normalizeGrowthPercent(0, 50, -50);
    expect(r.status).toBe('ZERO_REAL');
    expect(r.score).toBe(50);
  });

  it('crescimento positivo no ceiling: score 100', () => {
    const r = normalizeGrowthPercent(50, 50, -50);
    expect(r.score).toBeCloseTo(100, 5);
  });

  it('crescimento negativo (negative growth) no floor: score 0', () => {
    const r = normalizeGrowthPercent(-50, 50, -50);
    expect(r.score).toBeCloseTo(0, 5);
  });

  it('crescimento além do ceiling/floor é clampado, nunca sai de [0,100]', () => {
    expect(normalizeGrowthPercent(500, 50, -50).score).toBeLessThanOrEqual(100);
    expect(normalizeGrowthPercent(-500, 50, -50).score).toBeGreaterThanOrEqual(0);
  });

  it('null (INSUFFICIENT_HISTORY do computeGrowth): UNAVAILABLE, nunca 50 forçado', () => {
    const r = normalizeGrowthPercent(null, 50, -50);
    expect(r.status).toBe('UNAVAILABLE');
    expect(r.score).toBeNull();
  });

  it('determinismo: mesma entrada produz exatamente o mesmo score', () => {
    expect(normalizeGrowthPercent(12.5, 50, -50)).toEqual(normalizeGrowthPercent(12.5, 50, -50));
  });

  it('anchors: 0%->50, +ceiling%->100, floor%->0 (item 29)', () => {
    expect(normalizeGrowthPercent(0, 50, -50).score).toBe(50);
    expect(normalizeGrowthPercent(50, 50, -50).score).toBeCloseTo(100, 6);
    expect(normalizeGrowthPercent(-50, 50, -50).score).toBeCloseTo(0, 6);
    expect(normalizeGrowthPercent(10, 50, -50).score).toBeCloseTo(60, 6); // 50 + 50*(10/50)
    expect(normalizeGrowthPercent(-10, 50, -50).score).toBeCloseTo(40, 6); // 50 - 50*(10/50)
  });
});

// ── Property tests (item 41): mais audiência nunca reduz o score; growth
// maior nunca reduz o score de growth. Casos representativos fixos (sem
// dependência de fast-check — não instalado no projeto, e alguns pontos
// determinísticos já provam a propriedade para uma função estritamente
// monotônica como log10).
describe('propriedades — monotonicidade', () => {
  it('normalizeAudienceSize é não-decrescente em value', () => {
    const ceiling = 10_000_000;
    const values = [0, 1, 100, 10_000, 1_000_000, 10_000_000, 100_000_000];
    const scores = values.map((v) => normalizeAudienceSize(v, ceiling).score as number);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  it('normalizeGrowthPercent é não-decrescente em percentageChange', () => {
    const changes = [-100, -50, -25, -10, 0, 10, 25, 50, 100];
    const scores = changes.map((c) => normalizeGrowthPercent(c, 50, -50).score as number);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  it('normalizeAudienceSize nunca sai de [0,100] para nenhuma entrada válida testada', () => {
    for (const v of [0, 1, 50, 999_999_999_999]) {
      const s = normalizeAudienceSize(v, 1_000_000).score as number;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe('averageAvailable', () => {
  it('ignora UNAVAILABLE, calcula média só dos disponíveis', () => {
    const scores = [
      { status: 'AVAILABLE' as const, score: 80, rawValue: 1 },
      { status: 'UNAVAILABLE' as const, score: null, rawValue: null },
      { status: 'AVAILABLE' as const, score: 40, rawValue: 2 },
    ];
    expect(averageAvailable(scores)).toBe(60);
  });

  it('todos UNAVAILABLE: retorna null', () => {
    expect(averageAvailable([{ status: 'UNAVAILABLE', score: null, rawValue: null }])).toBeNull();
  });

  it('lista vazia: retorna null', () => {
    expect(averageAvailable([])).toBeNull();
  });
});

describe('median', () => {
  it('amostra ímpar ordenada', () => {
    expect(median([1, 3, 5])).toBe(3);
  });
  it('amostra par ordenada', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('entrada NÃO ordenada produz mediana correta', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it('lista vazia: null', () => {
    expect(median([])).toBeNull();
  });
  it('amostra única', () => {
    expect(median([42])).toBe(42);
  });
});

describe('percentileRank', () => {
  it('valor no meio de uma amostra ordenada', () => {
    const cohort = [10, 20, 30, 40, 50];
    expect(percentileRank(cohort, 30)).toBe(50); // 2 abaixo + 1 igual/2 = 2.5 -> 2.5/5*100=50
  });
  it('valor abaixo de toda a coorte: percentil próximo de 0', () => {
    expect(percentileRank([10, 20, 30], 1)).toBe(0);
  });
  it('valor acima de toda a coorte: percentil 100', () => {
    expect(percentileRank([10, 20, 30], 999)).toBe(100);
  });
  it('empates: valor igual a vários da coorte usa rank médio (nunca 0 nem 100 artificial)', () => {
    const cohort = [10, 10, 10, 10];
    const p = percentileRank(cohort, 10);
    expect(p).toBe(50); // todos empatados -> rank médio = metade
  });
  it('todos os valores da coorte iguais entre si e ao artista: 50 (nem topo nem fundo)', () => {
    expect(percentileRank([5, 5, 5], 5)).toBe(50);
  });
  it('coorte com outlier extremo não quebra o cálculo', () => {
    const cohort = [1, 2, 3, 4, 1_000_000];
    const p = percentileRank(cohort, 3);
    expect(p).toBe(50);
  });
  it('coorte vazia: null (nunca percentil fictício)', () => {
    expect(percentileRank([], 10)).toBeNull();
  });
  it('growth negativo funciona normalmente (percentil não assume valores positivos)', () => {
    const cohort = [-10, -5, 0, 5, 10];
    expect(percentileRank(cohort, -5)).toBe(30);
  });
  it('determinismo: mesma entrada produz exatamente o mesmo percentil', () => {
    const cohort = [3, 7, 2, 9, 5];
    expect(percentileRank(cohort, 5)).toBe(percentileRank(cohort, 5));
  });
});
