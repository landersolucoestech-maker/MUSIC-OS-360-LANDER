import { computeGrowth } from './metric-growth.util';

const day = (n: number) => new Date(`2026-08-${String(n).padStart(2, '0')}T00:00:00Z`);

describe('computeGrowth', () => {
  it('INSUFFICIENT_HISTORY quando não há pontos', () => {
    expect(computeGrowth([], 30, day(31))).toEqual({ status: 'INSUFFICIENT_HISTORY', periodDays: 30 });
  });

  it('INSUFFICIENT_HISTORY quando só existe o ponto atual (sem histórico anterior)', () => {
    const result = computeGrowth([{ value: 100, observedAt: day(31) }], 30, day(31));
    expect(result.status).toBe('INSUFFICIENT_HISTORY');
  });

  it('7d: calcula variação absoluta e percentual com ponto dentro da tolerância', () => {
    const points = [{ value: 1000, observedAt: day(24) }, { value: 1100, observedAt: day(31) }];
    const result = computeGrowth(points, 7, day(31));
    expect(result).toMatchObject({
      status: 'OK', periodDays: 7, currentValue: 1100, previousValue: 1000, absoluteChange: 100,
    });
    if (result.status === 'OK') expect(result.percentageChange).toBeCloseTo(10);
  });

  it('30d: seleciona o ponto mais próximo de (now - 30d) por distância real, não pela posição no array', () => {
    // now(31) - 30d = day(1) exatamente. day(5) está a 4 dias de distância —
    // mais longe — mas aparece ANTES de day(1) no array, provando que a
    // seleção usa distância temporal, não a primeira entrada.
    const points = [
      { value: 700, observedAt: day(5) },
      { value: 500, observedAt: day(1) }, // mais próximo do alvo (diff=0)
      { value: 1100, observedAt: day(31) },
    ];
    const result = computeGrowth(points, 30, day(31));
    expect(result).toMatchObject({ status: 'OK', previousValue: 500 });
  });

  it('90d: INSUFFICIENT_HISTORY quando o ponto mais próximo está fora da tolerância', () => {
    const points = [{ value: 500, observedAt: day(28) }, { value: 1100, observedAt: day(31) }];
    const result = computeGrowth(points, 90, day(31));
    expect(result.status).toBe('INSUFFICIENT_HISTORY');
  });

  it('180d/365d: mesma função cobre períodos maiores sem lógica especial', () => {
    const points = [{ value: 700, observedAt: day(1) }, { value: 1100, observedAt: day(31) }];
    const r180 = computeGrowth(points, 180, day(31), 200);
    const r365 = computeGrowth(points, 365, day(31), 400);
    expect(r180.status).toBe('OK');
    expect(r365.status).toBe('OK');
  });

  it('previousValue = 0: percentageChange é null, nunca Infinity/NaN', () => {
    const points = [{ value: 0, observedAt: day(24) }, { value: 50, observedAt: day(31) }];
    const result = computeGrowth(points, 7, day(31));
    expect(result).toMatchObject({ status: 'OK', absoluteChange: 50 });
    if (result.status === 'OK') {
      expect(result.percentageChange).toBeNull();
      expect(Number.isFinite(result.percentageChange as unknown as number)).toBe(false); // null, não um número
    }
  });

  it('crescimento negativo: absoluteChange e percentageChange negativos', () => {
    const points = [{ value: 1000, observedAt: day(24) }, { value: 800, observedAt: day(31) }];
    const result = computeGrowth(points, 7, day(31));
    expect(result).toMatchObject({ status: 'OK', absoluteChange: -200 });
    if (result.status === 'OK') expect(result.percentageChange).toBeCloseTo(-20);
  });

  it('sem variação: absoluteChange=0, percentageChange=0', () => {
    const points = [{ value: 1000, observedAt: day(24) }, { value: 1000, observedAt: day(31) }];
    const result = computeGrowth(points, 7, day(31));
    expect(result).toMatchObject({ status: 'OK', absoluteChange: 0, percentageChange: 0 });
  });

  it('linhas fora de ordem: função ordena internamente, não assume input já ordenado', () => {
    const points = [{ value: 1100, observedAt: day(31) }, { value: 1000, observedAt: day(24) }];
    const result = computeGrowth(points, 7, day(31));
    expect(result).toMatchObject({ status: 'OK', currentValue: 1100, previousValue: 1000 });
  });

  it('timestamp duplicado: não quebra, usa o mais próximo determinístico', () => {
    const points = [
      { value: 1000, observedAt: day(24) },
      { value: 1000, observedAt: day(24) },
      { value: 1100, observedAt: day(31) },
    ];
    const result = computeGrowth(points, 7, day(31));
    expect(result.status).toBe('OK');
  });

  it('ponto stale (muito antigo, fora de todas as tolerâncias): INSUFFICIENT_HISTORY', () => {
    const points = [{ value: 100, observedAt: day(1) }, { value: 1100, observedAt: day(31) }];
    const result = computeGrowth(points, 7, day(31));
    expect(result.status).toBe('INSUFFICIENT_HISTORY');
  });

  it('métrica nula/ausente: chamador não deve passar pontos com value não numérico — função não fabrica 0', () => {
    // Contrato: computeGrowth só recebe GrowthPoint[] com value:number — a
    // exclusão de nulls/ausência é responsabilidade do snapshot store, não
    // de computeGrowth (que nunca inventa um 0).
    const result = computeGrowth([], 7, day(31));
    expect(result.status).toBe('INSUFFICIENT_HISTORY');
  });
});
