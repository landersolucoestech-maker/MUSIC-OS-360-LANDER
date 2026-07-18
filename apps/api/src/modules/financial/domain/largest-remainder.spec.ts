import { LargestRemainderError, largestRemainder } from './largest-remainder';

/**
 * Fase 13A Etapa 12 — testes unitários PUROS do algoritmo normativo de maior
 * resto (sem banco, sem rede). Casos mínimos exigidos pelo mandato + casos
 * normativos da Fase 12 §10.
 */
describe('largestRemainder — algoritmo normativo (Fases 11/12)', () => {
  it('R$ 1.000,00 → 60/40 = 600,00 + 400,00', () => {
    expect(largestRemainder('1000.00', ['60', '40'])).toEqual(['600.00', '400.00']);
  });

  it('R$ 1.000,00 → 70/30 = 700,00 + 300,00', () => {
    expect(largestRemainder('1000.00', ['70', '30'])).toEqual(['700.00', '300.00']);
  });

  it('R$ 100,00 → 33,33/33,33/33,34 (sem resíduo) = exatamente as frações', () => {
    expect(largestRemainder('100.00', ['33.33', '33.33', '33.34']))
      .toEqual(['33.33', '33.33', '33.34']);
  });

  it('caso normativo Fase 12: 3×33,3333% de R$ 100,00 → resíduo de 1 centavo vai à maior fração (menor índice)', () => {
    expect(largestRemainder('100.00', ['33.3333', '33.3333', '33.3333']))
      .toEqual(['33.34', '33.33', '33.33']);
  });

  it('conciliação exata (I7): Σ alocado = round(amount × Σpct/100, 2) em amostras', () => {
    const cases: Array<[string, string[]]> = [
      ['999.99', ['33.33', '33.33', '33.34']],
      ['0.03', ['50', '50']],
      ['123456789.01', ['12.5', '12.5', '75']],
      ['77.77', ['14.2857', '14.2857', '14.2857', '14.2857', '14.2857', '14.2857', '14.2858']],
    ];
    for (const [amount, pcts] of cases) {
      const result = largestRemainder(amount, pcts);
      const sumCents = result.reduce((acc, v) => acc + Math.round(Number(v) * 100), 0);
      const sumPct = pcts.reduce((acc, p) => acc + Number(p), 0);
      const expected = Math.round((Number(amount) * sumPct) / 100 * 100);
      expect(sumCents).toBe(expected);
    }
  });

  it('percentuais abaixo de 100% (rateio parcial): Σ alocado = fração alocada; resto é "Sem vínculo" implícito', () => {
    expect(largestRemainder('1000.00', ['25', '25'])).toEqual(['250.00', '250.00']);
  });

  it('soma acima de 100% → rejeita (I5)', () => {
    expect(() => largestRemainder('1000.00', ['60', '50']))
      .toThrow(LargestRemainderError);
    expect(() => largestRemainder('1000.00', ['60', '50']))
      .toThrow(/excede 100/);
  });

  it('R$ 0,01 → 60/40: parcela de R$ 0,00 é REJEITADA (allocated_amount > 0)', () => {
    expect(() => largestRemainder('0.01', ['60', '40']))
      .toThrow(/R\$ 0,00/);
  });

  it('percentual inválido (0, negativo, >100, texto) → rejeita', () => {
    expect(() => largestRemainder('100.00', ['0'])).toThrow(LargestRemainderError);
    expect(() => largestRemainder('100.00', ['-5'])).toThrow(LargestRemainderError);
    expect(() => largestRemainder('100.00', ['100.0001'])).toThrow(LargestRemainderError);
    expect(() => largestRemainder('100.00', ['abc'])).toThrow(LargestRemainderError);
  });

  it('amount inválido (zero, negativo, >2 casas) → rejeita', () => {
    expect(() => largestRemainder('0.00', ['100'])).toThrow(LargestRemainderError);
    expect(() => largestRemainder('-10.00', ['100'])).toThrow(LargestRemainderError);
    expect(() => largestRemainder('10.001', ['100'])).toThrow(LargestRemainderError);
  });

  it('lista vazia → rejeita', () => {
    expect(() => largestRemainder('100.00', [])).toThrow(/vazia/);
  });

  it('duplicatas de percentual são aceitas pelo algoritmo (a UNIQUE de alvo é responsabilidade do banco)', () => {
    expect(largestRemainder('100.00', ['50', '50'])).toEqual(['50.00', '50.00']);
  });

  it('determinismo: mesma entrada → mesma saída; ordem de entrada define o desempate', () => {
    const a = largestRemainder('100.00', ['33.3333', '33.3333', '33.3333']);
    const b = largestRemainder('100.00', ['33.3333', '33.3333', '33.3333']);
    expect(a).toEqual(b);
    // o centavo residual segue a MAIOR fração (0,66 de 33,3333% > 0,34 de
    // 66,6667%), independentemente da ordem — posição acompanha a entrada.
    const c = largestRemainder('200.00', ['66.6667', '33.3333']);
    const d = largestRemainder('200.00', ['33.3333', '66.6667']);
    expect(c).toEqual(['133.33', '66.67']);
    expect(d).toEqual(['66.67', '133.33']);
  });

  it('nunca usa float no caminho monetário: aceita strings exatas e preserva 2 casas', () => {
    expect(largestRemainder('0.10', ['50', '50'])).toEqual(['0.05', '0.05']);
    expect(largestRemainder('0.03', ['33.3333', '33.3333', '33.3334']))
      .toEqual(['0.01', '0.01', '0.01']);
  });
});
