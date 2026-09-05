import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './projects.dto';

/**
 * projects.dto.spec.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — bug real confirmado): o DTO
 * antigo usava nomes em inglês (title/type/artistId/budget/currency/
 * startsAt/deadlineAt/releasedAt) que NUNCA batiam com o payload real
 * enviado por ProjetoFormModal.tsx/Projetos.tsx (titulo/tipo/status/
 * observacoes/descricao/genero/artist_id/musicas[]) nem com as colunas
 * físicas da entity (titulo/tipo/status/descricao — português). Com
 * ValidationPipe (whitelist + forbidNonWhitelisted), toda criação/edição de
 * projeto retornava 400.
 */
async function validatePayload(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreateProjectDto, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

const REAL_FORM_PAYLOAD = {
  titulo: 'Meu Álbum',
  tipo: 'album',
  observacoes: 'Notas internas',
  descricao: null,
  genero: 'pop',
  artist_id: '123e4567-e89b-12d3-a456-426614174000',
  musicas: [
    {
      id: 'faixa-1', nome: 'Faixa 1', soloFeat: 'solo', originalRemix: 'original',
      instrumental: 'nao', duracaoMin: '3', duracaoSeg: '30', genero: 'pop', idioma: 'pt-BR',
      compositores: ['Fulano'], interpretes: ['Beltrano'], produtores: ['Ciclano'], letra: 'lalala',
    },
  ],
};

describe('CreateProjectDto — contrato canônico real (auditoria 2026-07-18)', () => {
  it('aceita o payload real do formulário (antes rejeitado inteiro por forbidNonWhitelisted)', async () => {
    const errors = await validatePayload(REAL_FORM_PAYLOAD);
    expect(errors).toEqual([]);
  });

  it('rejeita os nomes em inglês do DTO antigo (title/type/artistId/budget/currency/startsAt/deadlineAt/releasedAt)', async () => {
    for (const key of ['title', 'type', 'artistId', 'budget', 'currency', 'startsAt', 'deadlineAt', 'releasedAt']) {
      const errors = await validatePayload({ ...REAL_FORM_PAYLOAD, [key]: 'x' });
      expect(errors.some((e) => e.property === key)).toBe(true);
    }
  });

  it('aceita payload mínimo (apenas titulo/tipo obrigatórios)', async () => {
    const errors = await validatePayload({ titulo: 'X', tipo: 'single' });
    expect(errors).toEqual([]);
  });

  it('rejeita tipo fora do enum real', async () => {
    const errors = await validatePayload({ titulo: 'X', tipo: 'inexistente' });
    expect(errors.some((e) => e.property === 'tipo')).toBe(true);
  });
});
