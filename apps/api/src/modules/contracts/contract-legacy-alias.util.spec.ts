import { BadRequestException } from '@nestjs/common';
import { resolveContractAliases, resolveContractQueryAliases } from './contract-legacy-alias.util';

function getBody(fn: () => void): { code: string; message: string; fields?: unknown[] } {
  try {
    fn();
    throw new Error('esperava BadRequestException');
  } catch (e) {
    if (!(e instanceof BadRequestException)) throw e;
    return e.getResponse() as { code: string; message: string; fields?: unknown[] };
  }
}

describe('resolveContractAliases — título (obrigatoriedade tratada pelo chamador; aqui só conteúdo/conflito)', () => {
  it('ausência total → titulo undefined (chamador decide se é erro)', () => {
    const { normalized } = resolveContractAliases({});
    expect(normalized.titulo).toBeUndefined();
  });

  it('titulo: null → CONTRACT_TITLE_INVALID', () => {
    const body = getBody(() => resolveContractAliases({ titulo: null }));
    expect(body.code).toBe('CONTRACT_TITLE_INVALID');
  });

  it('titulo: "" → CONTRACT_TITLE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: '' })).code).toBe('CONTRACT_TITLE_INVALID');
  });

  it('titulo: "   " (whitespace) → CONTRACT_TITLE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: '   ' })).code).toBe('CONTRACT_TITLE_INVALID');
  });

  it('title (EN) inválido também rejeita', () => {
    expect(getBody(() => resolveContractAliases({ title: '' })).code).toBe('CONTRACT_TITLE_INVALID');
  });

  it('equivalência por trim: titulo="Contrato A", title=" Contrato A " → aceito, persiste o valor de titulo original (não trimmed)', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'Contrato A', title: ' Contrato A ' });
    expect(normalized.titulo).toBe('Contrato A');
    expect(legacyAliasesUsed).toContain('title');
  });

  it('somente EN aceito temporariamente: persiste o valor original (não trimmed), registra alias', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ title: ' Contrato A ' });
    expect(normalized.titulo).toBe(' Contrato A ');
    expect(legacyAliasesUsed).toEqual(['title']);
  });

  it('titulo e title com conteúdos realmente diferentes → CONTRACT_ALIAS_CONFLICT', () => {
    const body = getBody(() => resolveContractAliases({ titulo: 'A', title: 'B' }));
    expect(body.code).toBe('CONTRACT_ALIAS_CONFLICT');
  });
});

describe('resolveContractAliases — tipo/type (comparação estrita, sem trim)', () => {
  it('somente PT', () => {
    expect(resolveContractAliases({ titulo: 'X', tipo: 'gravacao' }).normalized.tipo).toBe('gravacao');
  });

  it('somente EN', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', type: 'gravacao' });
    expect(normalized.tipo).toBe('gravacao');
    expect(legacyAliasesUsed).toContain('type');
  });

  it('ambos equivalentes (idênticos)', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', tipo: 'gravacao', type: 'gravacao' });
    expect(normalized.tipo).toBe('gravacao');
    expect(legacyAliasesUsed).toContain('type');
  });

  it('ambos conflitantes', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', tipo: 'gravacao', type: 'edicao' })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('diferença só de espaços é CONFLITO (sem trim aplicado a tipo)', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', tipo: 'gravacao', type: ' gravacao ' })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('ambos null → equivalente, retorna null', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', tipo: null, type: null });
    expect(normalized.tipo).toBeNull();
    expect(legacyAliasesUsed).toContain('type');
  });

  it('PT null e EN válido → CONFLITO (nunca fallback silencioso)', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', tipo: null, type: 'gravacao' })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('PT válido e EN null → CONFLITO', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', tipo: 'gravacao', type: null })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('EN undefined é tratado como ausente (não conta como "ambos presentes")', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', tipo: 'gravacao', type: undefined });
    expect(normalized.tipo).toBe('gravacao');
    expect(legacyAliasesUsed).toEqual([]);
  });

  it('ausência total → tipo undefined', () => {
    expect(resolveContractAliases({ titulo: 'X' }).normalized.tipo).toBeUndefined();
  });

  it('somente PT com null → válido, não gera 400, retorna null', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', tipo: null });
    expect(normalized.tipo).toBeNull();
    expect(legacyAliasesUsed).toEqual([]);
  });

  it('somente EN com null → válido durante a depreciação, registra alias, retorna null', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', type: null });
    expect(normalized.tipo).toBeNull();
    expect(legacyAliasesUsed).toEqual(['type']);
  });
});

describe('resolveContractAliases — artista_id/artistId (UUID, case-insensitive na comparação)', () => {
  const UUID_A = '11111111-1111-4111-8111-111111111111';
  const UUID_A_UPPER = '11111111-1111-4111-8111-111111111111'.toUpperCase();
  const UUID_B = '22222222-2222-4222-8222-222222222222';

  it('somente PT válido', () => {
    expect(resolveContractAliases({ titulo: 'X', artista_id: UUID_A }).normalized.artista_id).toBe(UUID_A);
  });

  it('somente EN válido', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', artistId: UUID_A });
    expect(normalized.artista_id).toBe(UUID_A);
    expect(legacyAliasesUsed).toContain('artistId');
  });

  it('ambos com mesmo UUID mas capitalização diferente → equivalente, persiste o valor PT original', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', artista_id: UUID_A, artistId: UUID_A_UPPER });
    expect(normalized.artista_id).toBe(UUID_A);
  });

  it('ambos diferentes → conflito', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', artista_id: UUID_A, artistId: UUID_B })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('UUID inválido (só PT) → CONTRACT_UUID_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', artista_id: 'not-a-uuid' })).code).toBe('CONTRACT_UUID_INVALID');
  });

  it('UUID inválido (só EN) → CONTRACT_UUID_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', artistId: 'not-a-uuid' })).code).toBe('CONTRACT_UUID_INVALID');
  });

  it('null/null → equivalente, retorna null', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', artista_id: null, artistId: null });
    expect(normalized.artista_id).toBeNull();
  });

  it('null/válido → conflito', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', artista_id: null, artistId: UUID_A })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('ausência total → undefined', () => {
    expect(resolveContractAliases({ titulo: 'X' }).normalized.artista_id).toBeUndefined();
  });
});

describe('resolveContractAliases — data_inicio/startsAt e data_fim/expiresAt', () => {
  it('mesmo instante em representações ISO diferentes → equivalente', () => {
    const { normalized } = resolveContractAliases({
      titulo: 'X',
      data_inicio: '2026-01-01T00:00:00.000Z',
      startsAt: '2026-01-01T00:00:00Z',
    });
    expect(normalized.data_inicio).toBe('2026-01-01T00:00:00.000Z'); // valor original PT, não normalizado
  });

  it('instantes diferentes → conflito', () => {
    expect(getBody(() => resolveContractAliases({
      titulo: 'X', data_inicio: '2026-01-01T00:00:00.000Z', startsAt: '2026-01-02T00:00:00.000Z',
    })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('data inválida (só PT) → CONTRACT_DATE_INVALID, não lança RangeError', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', data_inicio: 'not-a-date' })).code).toBe('CONTRACT_DATE_INVALID');
  });

  it('data inválida (só EN) → CONTRACT_DATE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', expiresAt: 'not-a-date' })).code).toBe('CONTRACT_DATE_INVALID');
  });

  it('null/null → equivalente, retorna null (não vira epoch 1970)', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', data_fim: null, expiresAt: null });
    expect(normalized.data_fim).toBeNull();
  });

  it('null/data válida → conflito', () => {
    expect(getBody(() => resolveContractAliases({
      titulo: 'X', data_fim: null, expiresAt: '2026-01-01T00:00:00.000Z',
    })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('undefined representa propriedade ausente (não conflita)', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', data_fim: '2026-01-01T00:00:00.000Z', expiresAt: undefined });
    expect(normalized.data_fim).toBe('2026-01-01T00:00:00.000Z');
  });

  it('ausência total → undefined', () => {
    expect(resolveContractAliases({ titulo: 'X' }).normalized.data_inicio).toBeUndefined();
  });
});

describe('resolveContractAliases — arquivo_url/fileUrl (estrita, sem normalização)', () => {
  it('somente PT', () => {
    expect(resolveContractAliases({ titulo: 'X', arquivo_url: 'https://a.com/x.pdf' }).normalized.arquivo_url).toBe('https://a.com/x.pdf');
  });

  it('somente EN, registra alias', () => {
    const { normalized, legacyAliasesUsed } = resolveContractAliases({ titulo: 'X', fileUrl: 'https://a.com/x.pdf' });
    expect(normalized.arquivo_url).toBe('https://a.com/x.pdf');
    expect(legacyAliasesUsed).toContain('fileUrl');
  });

  it('ambos idênticos → equivalente', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', arquivo_url: 'https://a.com/x.pdf', fileUrl: 'https://a.com/x.pdf' });
    expect(normalized.arquivo_url).toBe('https://a.com/x.pdf');
  });

  it('diferença por espaços é conflito (sem trim/normalização de URL)', () => {
    expect(getBody(() => resolveContractAliases({
      titulo: 'X', arquivo_url: 'https://a.com/x.pdf', fileUrl: 'https://a.com/x.pdf ',
    })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('null/null → equivalente, retorna null', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', arquivo_url: null, fileUrl: null });
    expect(normalized.arquivo_url).toBeNull();
  });

  it('null/valor → conflito', () => {
    expect(getBody(() => resolveContractAliases({
      titulo: 'X', arquivo_url: null, fileUrl: 'https://a.com/x.pdf',
    })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('ausência total → undefined', () => {
    expect(resolveContractAliases({ titulo: 'X' }).normalized.arquivo_url).toBeUndefined();
  });
});

describe('resolveContractAliases — valor/value (coerção numérica)', () => {
  it('10 e "10" são equivalentes', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', valor: 10, value: '10' });
    expect(normalized.valor).toBe('10');
  });

  it('10 e "10.0" são equivalentes', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', valor: 10, value: '10.0' });
    expect(normalized.valor).toBe('10');
  });

  it('0 e "0" são equivalentes', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', valor: 0, value: '0' });
    expect(normalized.valor).toBe('0');
  });

  it('0 e "" NÃO são equivalentes — "" é inválido → CONTRACT_VALUE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: 0, value: '' })).code).toBe('CONTRACT_VALUE_INVALID');
  });

  it('string vazia isolada → CONTRACT_VALUE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: '' })).code).toBe('CONTRACT_VALUE_INVALID');
  });

  it('whitespace isolado → CONTRACT_VALUE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', value: '   ' })).code).toBe('CONTRACT_VALUE_INVALID');
  });

  it('NaN (string não numérica) → CONTRACT_VALUE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: 'abc' })).code).toBe('CONTRACT_VALUE_INVALID');
  });

  it('Infinity → CONTRACT_VALUE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: Infinity })).code).toBe('CONTRACT_VALUE_INVALID');
  });

  it('tipos inválidos (objeto/array/boolean) → CONTRACT_VALUE_INVALID', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: {} })).code).toBe('CONTRACT_VALUE_INVALID');
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: [] })).code).toBe('CONTRACT_VALUE_INVALID');
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: true })).code).toBe('CONTRACT_VALUE_INVALID');
  });

  it('null/0 são conflitantes (null nunca é tratado como zero)', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: null, value: 0 })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('null/null → equivalente, retorna null', () => {
    const { normalized } = resolveContractAliases({ titulo: 'X', valor: null, value: null });
    expect(normalized.valor).toBeNull();
  });

  it('ausência total → undefined', () => {
    expect(resolveContractAliases({ titulo: 'X' }).normalized.valor).toBeUndefined();
  });

  it('valores conflitantes (10 vs 20) → CONTRACT_ALIAS_CONFLICT', () => {
    expect(getBody(() => resolveContractAliases({ titulo: 'X', valor: 10, value: '20' })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });
});

describe('resolveContractQueryAliases — apenas tipo/type e artista_id/artistId', () => {
  it('tipo canônico', () => {
    expect(resolveContractQueryAliases({ tipo: 'gravacao' }).normalized.tipo).toBe('gravacao');
  });

  it('type legado', () => {
    const { normalized, legacyAliasesUsed } = resolveContractQueryAliases({ type: 'gravacao' });
    expect(normalized.tipo).toBe('gravacao');
    expect(legacyAliasesUsed).toContain('type');
  });

  it('artista_id canônico', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    expect(resolveContractQueryAliases({ artista_id: uuid }).normalized.artista_id).toBe(uuid);
  });

  it('artistId legado', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const { normalized, legacyAliasesUsed } = resolveContractQueryAliases({ artistId: uuid });
    expect(normalized.artista_id).toBe(uuid);
    expect(legacyAliasesUsed).toContain('artistId');
  });

  it('conflito tipo/type', () => {
    expect(getBody(() => resolveContractQueryAliases({ tipo: 'gravacao', type: 'edicao' })).code).toBe('CONTRACT_ALIAS_CONFLICT');
  });

  it('null/null em tipo → equivalente', () => {
    const { normalized } = resolveContractQueryAliases({ tipo: null, type: null });
    expect(normalized.tipo).toBeNull();
  });

  it('ausência total → objeto vazio', () => {
    const { normalized, legacyAliasesUsed } = resolveContractQueryAliases({});
    expect(normalized.tipo).toBeUndefined();
    expect(normalized.artista_id).toBeUndefined();
    expect(legacyAliasesUsed).toEqual([]);
  });

  it('confirma que title/value/datas não são processados pela query (ausentes do resultado mesmo se enviados)', () => {
    const { normalized } = resolveContractQueryAliases({ title: 'X', value: '10', startsAt: '2026-01-01T00:00:00.000Z' } as never);
    expect(normalized).not.toHaveProperty('titulo');
    expect(normalized).not.toHaveProperty('valor');
    expect(normalized).not.toHaveProperty('data_inicio');
    expect(Object.keys(normalized)).toEqual([]);
  });
});
