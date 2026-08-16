import 'reflect-metadata';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { casUpdate } from './optimistic-update.util';

/**
 * Task K — cenário canônico de concorrência exigido pela auditoria:
 *   A lê versão X
 *   B lê versão X
 *   A salva
 *   B tenta salvar versão X
 *   → B NÃO pode sobrescrever silenciosamente A
 */
interface TestRow {
  id: string;
  nome?: string;
  x?: number;
}

describe('casUpdate', () => {
  function buildRepo(affected: number) {
    return { update: jest.fn().mockResolvedValue({ affected }) } as any;
  }

  it('sem expectedUpdatedAt: comportamento idêntico a repo.update() puro (retrocompatível)', async () => {
    const repo = buildRepo(1);
    await casUpdate<TestRow>(repo, { id: '1' }, { nome: 'x' }, undefined);
    expect(repo.update).toHaveBeenCalledWith({ id: '1' }, { nome: 'x' });
  });

  it('com expectedUpdatedAt: inclui updated_at no critério do UPDATE', async () => {
    const repo = buildRepo(1);
    const t = new Date('2026-08-14T10:00:00.000Z');
    await casUpdate<TestRow>(repo, { id: '1' }, { nome: 'x' }, t.toISOString());
    expect(repo.update).toHaveBeenCalledWith({ id: '1', updated_at: t }, { nome: 'x' });
  });

  it('cenário A/B: B tenta salvar contra a versão pré-escrita de A (0 linhas afetadas) -> 409, não sobrescreve', async () => {
    // A e B leram updated_at = T0. A salva (a coluna passa a T1 no banco, fora
    // deste teste). B tenta salvar ainda contra T0 -> WHERE não bate -> 0 rows.
    const repo = buildRepo(0);
    const t0 = new Date('2026-08-14T10:00:00.000Z').toISOString();
    await expect(casUpdate<TestRow>(repo, { id: '1' }, { nome: 'edição de B' }, t0))
      .rejects.toThrow(ConflictException);
    // A escrita de B nunca é aplicada de forma incondicional depois do 409 —
    // repo.update só foi chamado a UMA vez, com o critério condicional.
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('expectedUpdatedAt malformado -> 400, nunca ignora silenciosamente e aplica sem CAS', async () => {
    const repo = buildRepo(1);
    await expect(casUpdate<TestRow>(repo, { id: '1' }, { nome: 'x' }, 'não-é-uma-data'))
      .rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('mensagem de conflito customizável por domínio', async () => {
    const repo = buildRepo(0);
    await expect(
      casUpdate<TestRow>(repo, { id: '1' }, { x: 1 }, new Date().toISOString(), 'Mensagem específica do domínio'),
    ).rejects.toThrow('Mensagem específica do domínio');
  });
});
