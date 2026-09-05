import { BadRequestException } from '@nestjs/common';
import {
  resolvePhonogramAliases,
  resolvePhonogramQueryAliases,
} from './phonogram-legacy-alias.util';

function errorBody(fn: () => unknown): { code: string; message: string; fields?: unknown } {
  try {
    fn();
  } catch (e) {
    if (e instanceof BadRequestException) {
      return e.getResponse() as { code: string; message: string; fields?: unknown };
    }
    throw e;
  }
  throw new Error('expected BadRequestException to be thrown');
}

const UUID_A = '123e4567-e89b-12d3-a456-426614174000';
const UUID_A_UPPER = '123E4567-E89B-12D3-A456-426614174000';
const UUID_B = '223e4567-e89b-12d3-a456-426614174000';

describe('phonogram-legacy-alias.util', () => {
  describe('resolvePhonogramAliases — titulo/title', () => {
    it('somente PT: retorna titulo, sem alias legado', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramAliases({ titulo: 'Nome PT' });
      expect(normalized.titulo).toBe('Nome PT');
      expect(legacyAliasesUsed).not.toContain('title');
    });

    it('somente EN: retorna titulo com o valor de title, registra alias', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramAliases({ title: 'Nome EN' });
      expect(normalized.titulo).toBe('Nome EN');
      expect(legacyAliasesUsed).toContain('title');
    });

    it('ambos equivalentes (trim iguais): PT vence, valor original PT persistido, alias registrado', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramAliases({
        titulo: 'Nome', title: '  Nome  ',
      });
      expect(normalized.titulo).toBe('Nome');
      expect(legacyAliasesUsed).toContain('title');
    });

    it('ambos conflitantes: lança PHONOGRAM_ALIAS_CONFLICT com fields corretos', () => {
      const body = errorBody(() => resolvePhonogramAliases({ titulo: 'A', title: 'B' }));
      expect(body.code).toBe('PHONOGRAM_ALIAS_CONFLICT');
      expect(body.fields).toEqual([{ canonical: 'titulo', legacy: 'title' }]);
    });

    it('title undefined explícito: tratado como ausente (não conflita, não lança)', () => {
      const { normalized } = resolvePhonogramAliases({ titulo: 'Nome', title: undefined });
      expect(normalized.titulo).toBe('Nome');
    });

    it('ausência total: titulo fica undefined no resultado', () => {
      const { normalized } = resolvePhonogramAliases({});
      expect(normalized.titulo).toBeUndefined();
    });

    it('titulo null: inválido (PHONOGRAM_TITLE_INVALID)', () => {
      const body = errorBody(() => resolvePhonogramAliases({ titulo: null }));
      expect(body.code).toBe('PHONOGRAM_TITLE_INVALID');
    });

    it('titulo vazio: inválido', () => {
      const body = errorBody(() => resolvePhonogramAliases({ titulo: '' }));
      expect(body.code).toBe('PHONOGRAM_TITLE_INVALID');
    });

    it('titulo somente espaços: inválido', () => {
      const body = errorBody(() => resolvePhonogramAliases({ titulo: '   ' }));
      expect(body.code).toBe('PHONOGRAM_TITLE_INVALID');
    });

    it('title (alias) vazio: também inválido', () => {
      const body = errorBody(() => resolvePhonogramAliases({ title: '' }));
      expect(body.code).toBe('PHONOGRAM_TITLE_INVALID');
    });

    it('não trima silenciosamente o valor salvo (persiste string original com espaços internos/externos preservados quando só um lado é enviado)', () => {
      const { normalized } = resolvePhonogramAliases({ titulo: '  Nome Com Espaço  ' });
      expect(normalized.titulo).toBe('  Nome Com Espaço  ');
    });

    it('mensagem de erro não inclui o conteúdo do título', () => {
      const body = errorBody(() => resolvePhonogramAliases({ titulo: 'ValorSecreto', title: 'OutroValor' }));
      expect(JSON.stringify(body)).not.toContain('ValorSecreto');
      expect(JSON.stringify(body)).not.toContain('OutroValor');
    });
  });

  describe.each([
    ['obra_id', 'workId', 'obra_id' as const],
    ['artist_id', 'artistId', 'artist_id' as const],
  ])('resolvePhonogramAliases — %s/%s', (canonical, legacy, key) => {
    it('somente PT: retorna o valor, sem alias legado', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramAliases({ [canonical]: UUID_A });
      expect(normalized[key]).toBe(UUID_A);
      expect(legacyAliasesUsed).not.toContain(legacy);
    });

    it('somente EN: retorna o valor, registra alias', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramAliases({ [legacy]: UUID_A });
      expect(normalized[key]).toBe(UUID_A);
      expect(legacyAliasesUsed).toContain(legacy);
    });

    it('ambos iguais (case-insensitive): aceita, persiste valor original do lado PT, alias registrado', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramAliases({
        [canonical]: UUID_A, [legacy]: UUID_A_UPPER,
      });
      expect(normalized[key]).toBe(UUID_A);
      expect(legacyAliasesUsed).toContain(legacy);
    });

    it('ambos diferentes: PHONOGRAM_ALIAS_CONFLICT', () => {
      const body = errorBody(() => resolvePhonogramAliases({ [canonical]: UUID_A, [legacy]: UUID_B }));
      expect(body.code).toBe('PHONOGRAM_ALIAS_CONFLICT');
      expect(body.fields).toEqual([{ canonical, legacy }]);
    });

    it('ambos null: equivalentes, alias registrado, valor null', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramAliases({
        [canonical]: null, [legacy]: null,
      });
      expect(normalized[key]).toBeNull();
      expect(legacyAliasesUsed).toContain(legacy);
    });

    it('PT null + EN válido: conflito', () => {
      const body = errorBody(() => resolvePhonogramAliases({ [canonical]: null, [legacy]: UUID_A }));
      expect(body.code).toBe('PHONOGRAM_ALIAS_CONFLICT');
    });

    it('PT válido + EN null: conflito', () => {
      const body = errorBody(() => resolvePhonogramAliases({ [canonical]: UUID_A, [legacy]: null }));
      expect(body.code).toBe('PHONOGRAM_ALIAS_CONFLICT');
    });

    it('alias EN undefined explícito: tratado como ausente', () => {
      const { normalized } = resolvePhonogramAliases({ [canonical]: UUID_A, [legacy]: undefined });
      expect(normalized[key]).toBe(UUID_A);
    });

    it('ausência total: fica undefined no resultado', () => {
      const { normalized } = resolvePhonogramAliases({});
      expect(normalized[key]).toBeUndefined();
    });

    it('UUID inválido no lado PT: PHONOGRAM_UUID_INVALID', () => {
      const body = errorBody(() => resolvePhonogramAliases({ [canonical]: 'nao-e-uuid' }));
      expect(body.code).toBe('PHONOGRAM_UUID_INVALID');
    });

    it('UUID inválido no lado EN: PHONOGRAM_UUID_INVALID', () => {
      const body = errorBody(() => resolvePhonogramAliases({ [legacy]: 'nao-e-uuid' }));
      expect(body.code).toBe('PHONOGRAM_UUID_INVALID');
    });

    it('mensagem de erro não inclui o UUID recebido', () => {
      const body = errorBody(() => resolvePhonogramAliases({ [canonical]: UUID_A, [legacy]: UUID_B }));
      expect(JSON.stringify(body)).not.toContain(UUID_A);
      expect(JSON.stringify(body)).not.toContain(UUID_B);
    });
  });

  describe('resolvePhonogramQueryAliases — obra_id/workId e artist_id/artistId', () => {
    it('obra_id sozinho: aceito', () => {
      const { normalized } = resolvePhonogramQueryAliases({ obra_id: UUID_A });
      expect(normalized.obra_id).toBe(UUID_A);
    });

    it('workId sozinho: aceito, alias registrado', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramQueryAliases({ workId: UUID_A });
      expect(normalized.obra_id).toBe(UUID_A);
      expect(legacyAliasesUsed).toContain('workId');
    });

    it('obra_id e workId iguais: aceito', () => {
      const { normalized } = resolvePhonogramQueryAliases({ obra_id: UUID_A, workId: UUID_A });
      expect(normalized.obra_id).toBe(UUID_A);
    });

    it('obra_id e workId diferentes: 400', () => {
      const body = errorBody(() => resolvePhonogramQueryAliases({ obra_id: UUID_A, workId: UUID_B }));
      expect(body.code).toBe('PHONOGRAM_ALIAS_CONFLICT');
    });

    it('artist_id sozinho: aceito', () => {
      const { normalized } = resolvePhonogramQueryAliases({ artist_id: UUID_A });
      expect(normalized.artist_id).toBe(UUID_A);
    });

    it('artistId sozinho: aceito, alias registrado', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramQueryAliases({ artistId: UUID_A });
      expect(normalized.artist_id).toBe(UUID_A);
      expect(legacyAliasesUsed).toContain('artistId');
    });

    it('artist_id e artistId iguais: aceito', () => {
      const { normalized } = resolvePhonogramQueryAliases({ artist_id: UUID_A, artistId: UUID_A });
      expect(normalized.artist_id).toBe(UUID_A);
    });

    it('artist_id e artistId diferentes: 400', () => {
      const body = errorBody(() => resolvePhonogramQueryAliases({ artist_id: UUID_A, artistId: UUID_B }));
      expect(body.code).toBe('PHONOGRAM_ALIAS_CONFLICT');
    });

    it('ausência total: normalized vazio, sem aliases', () => {
      const { normalized, legacyAliasesUsed } = resolvePhonogramQueryAliases({});
      expect(normalized.obra_id).toBeUndefined();
      expect(normalized.artist_id).toBeUndefined();
      expect(legacyAliasesUsed).toEqual([]);
    });

    it('não processa titulo/title — confirmado por não lançar e não retornar esses campos mesmo se presentes no input', () => {
      const { normalized } = resolvePhonogramQueryAliases({ titulo: 'X', title: 'Y qualquer coisa' } as unknown as Record<string, unknown>);
      expect(normalized).not.toHaveProperty('titulo');
      expect(normalized).not.toHaveProperty('title');
    });

    it('titulo/title conflitantes no input da query NÃO lançam erro (função de query os ignora)', () => {
      expect(() =>
        resolvePhonogramQueryAliases({ titulo: 'A', title: 'B' } as unknown as Record<string, unknown>),
      ).not.toThrow();
    });
  });
});
