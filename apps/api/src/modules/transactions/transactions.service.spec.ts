import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { DATA_SOURCE } from '../../database/database.module';
import { TransactionEntity } from '../../database/entities';

/**
 * Task J — fase de continuidade (concurrent writes / stale-lost updates).
 * update()/patch() antes sobrescreviam incondicionalmente (repo.update sem
 * checar version/updated_at) — dois usuários editando a mesma transação em
 * paralelo perdiam a edição de um deles silenciosamente. Agora, quando o
 * chamador manda `expectedUpdatedAt`, o UPDATE só aplica se `updated_at` no
 * banco ainda for exatamente esse valor (CAS via coluna já existente, sem
 * migração); 0 linhas afetadas -> 409, nunca sobrescreve silenciosamente.
 * Sem `expectedUpdatedAt`, o comportamento é idêntico ao anterior
 * (compatibilidade retroativa).
 */

const TENANT = 'tenant-test';
const TX_ID  = 'tx-test';
const NOW    = new Date('2026-08-14T12:00:00.000Z');

const mockTx = {
  id: TX_ID,
  tenant_id: TENANT,
  tipo: 'receita',
  categoria: 'outros',
  status: 'pendente',
  valor: '100',
  metadata: {},
  deleted_at: null,
  updated_at: NOW,
} as unknown as TransactionEntity;

function buildMockDs(updateResult: { affected: number } = { affected: 1 }) {
  const qb: any = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn().mockResolvedValue(mockTx),
  };
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);

  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    update: jest.fn().mockResolvedValue(updateResult),
  };
  return { getRepository: jest.fn(() => repo), _repo: repo, _qb: qb };
}

describe('TransactionsService — concorrência otimista em update/patch', () => {
  let service: TransactionsService;
  let mockDs: ReturnType<typeof buildMockDs>;

  async function buildService(updateResult?: { affected: number }) {
    mockDs = buildMockDs(updateResult);
    const module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DATA_SOURCE, useValue: mockDs },
      ],
    }).compile();
    return module.get<TransactionsService>(TransactionsService);
  }

  it('sem expectedUpdatedAt: aplica update incondicional (compatibilidade retroativa)', async () => {
    service = await buildService({ affected: 1 });
    await service.patch(TENANT, 'u1', TX_ID, { descricao: 'Nova descrição' } as any);

    expect(mockDs._repo.update).toHaveBeenCalledWith(
      { id: TX_ID, tenant_id: TENANT },
      expect.objectContaining({ descricao: 'Nova descrição' }),
    );
  });

  it('com expectedUpdatedAt correto: inclui updated_at no critério e aplica normalmente', async () => {
    service = await buildService({ affected: 1 });
    await service.patch(TENANT, 'u1', TX_ID, {
      descricao: 'Editado',
      expectedUpdatedAt: NOW.toISOString(),
    } as any);

    expect(mockDs._repo.update).toHaveBeenCalledWith(
      { id: TX_ID, tenant_id: TENANT, updated_at: NOW },
      expect.objectContaining({ descricao: 'Editado' }),
    );
  });

  it('com expectedUpdatedAt desatualizado (0 linhas afetadas): lança ConflictException (409), não sobrescreve', async () => {
    service = await buildService({ affected: 0 });
    await expect(
      service.patch(TENANT, 'u1', TX_ID, {
        descricao: 'Tentativa concorrente',
        expectedUpdatedAt: new Date('2026-08-14T11:00:00.000Z').toISOString(),
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('mesma proteção se aplica a update() (PUT), não só patch()', async () => {
    service = await buildService({ affected: 0 });
    await expect(
      service.update(TENANT, 'u1', TX_ID, {
        tipoTransacao: 'receita',
        expectedUpdatedAt: new Date('2026-08-14T11:00:00.000Z').toISOString(),
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('expectedUpdatedAt com formato inválido: 400, não 500 nem silêncio', async () => {
    service = await buildService({ affected: 1 });
    await expect(
      service.patch(TENANT, 'u1', TX_ID, {
        descricao: 'x',
        expectedUpdatedAt: 'not-a-date',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
