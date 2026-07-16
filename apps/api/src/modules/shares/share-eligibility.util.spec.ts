import { isRegistryEligibleShare, REGISTRY_ELIGIBLE_SHARE_SQL } from './share-eligibility.util';

describe('isRegistryEligibleShare — predicado TS equivalente ao SQL "share_type IS NULL"', () => {
  it('true quando share_type é null', () => {
    expect(isRegistryEligibleShare({ share_type: null })).toBe(true);
  });

  it('false quando share_type tem qualquer valor não-null', () => {
    expect(isRegistryEligibleShare({ share_type: 'pendente' })).toBe(false);
    expect(isRegistryEligibleShare({ share_type: '' })).toBe(false);
    expect(isRegistryEligibleShare({ share_type: 'registry' })).toBe(false);
  });

  it('não trata undefined como elegível (entidades persistidas sempre têm share_type null ou string)', () => {
    expect(isRegistryEligibleShare({ share_type: undefined as unknown as null })).toBe(false);
  });

  it('a constante SQL exportada é exatamente a mesma condição, para uso em query builders', () => {
    expect(REGISTRY_ELIGIBLE_SHARE_SQL).toBe('share_type IS NULL');
  });

  it('equivalência: para um conjunto de linhas simuladas, o filtro TS produz o mesmo subconjunto que o filtro SQL aplicaria', () => {
    const rows = [
      { id: '1', share_type: null },
      { id: '2', share_type: 'pendente' },
      { id: '3', share_type: null },
      { id: '4', share_type: 'financeiro' },
    ];
    // Simula o resultado de `SELECT * FROM shares WHERE share_type IS NULL`
    const sqlEquivalentResult = rows.filter((r) => r.share_type === null);
    const tsResult = rows.filter(isRegistryEligibleShare);
    expect(tsResult).toEqual(sqlEquivalentResult);
    expect(tsResult.map((r) => r.id)).toEqual(['1', '3']);
  });
});
