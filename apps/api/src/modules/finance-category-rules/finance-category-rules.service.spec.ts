import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FinanceCategoryRulesService } from './finance-category-rules.service';

const NOW = new Date('2026-08-16T12:00:00.000Z');
const RULE = {
  id: 'rule-1', tenant_id: 'tenant-1', keywords: ['spotify', 'streaming'],
  transaction_type: 'RECEITA', category_id: 'cat-1', priority: 100, active: true,
  deleted_at: null, updated_at: NOW,
};

function makeQueryBuilder(rows: unknown[]) {
  const qb: any = {
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    take: jest.fn(() => qb),
    getManyAndCount: jest.fn(async () => [rows, rows.length]),
  };
  return qb;
}

function makeRepo(rows: unknown[] = [RULE]) {
  return {
    findOne: jest.fn(async () => RULE),
    update: jest.fn(async () => ({ affected: 1 })),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: unknown) => ({ ...(data as object), id: 'new-id' })),
    createQueryBuilder: jest.fn(() => makeQueryBuilder(rows)),
  };
}

function makeService(rows?: unknown[]) {
  const repo = makeRepo(rows);
  const ds = { getRepository: jest.fn(() => repo) } as any;
  const svc = new FinanceCategoryRulesService(ds);
  return { svc, repo };
}

describe('FinanceCategoryRulesService', () => {
  it('list: escopa por tenant e retorna meta de paginação', async () => {
    const { svc, repo } = makeService([RULE]);
    const result = await svc.list('tenant-1', {} as any);

    expect(result.data).toEqual([RULE]);
    expect(result.meta).toEqual({ total: 1, offset: 0, limit: 100 });
    expect(repo.createQueryBuilder).toHaveBeenCalled();
  });

  it('findById: lança NotFoundException quando não encontrada', async () => {
    const { svc, repo } = makeService();
    (repo.findOne as jest.Mock).mockResolvedValueOnce(null);

    await expect(svc.findById('tenant-1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('create: associa tenant_id e created_by/updated_by', async () => {
    const { svc, repo } = makeService();

    await svc.create('tenant-1', 'user-1', {
      keywords: ['ads'], transaction_type: 'RECEITA', category_id: 'cat-2',
    } as any);

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-1', created_by: 'user-1', updated_by: 'user-1',
    }));
  });

  it('update sem expectedUpdatedAt: aplica update incondicional', async () => {
    const { svc, repo } = makeService();

    await svc.update('tenant-1', 'user-1', 'rule-1', { priority: 50 } as any);

    const [criteria] = (repo.update as jest.Mock).mock.calls[0];
    expect(criteria).toEqual({ id: 'rule-1', tenant_id: 'tenant-1' });
  });

  it('update com expectedUpdatedAt correto: inclui updated_at no critério', async () => {
    const { svc, repo } = makeService();

    await svc.update('tenant-1', 'user-1', 'rule-1', {
      priority: 50,
      expectedUpdatedAt: NOW.toISOString(),
    } as any);

    const [criteria] = (repo.update as jest.Mock).mock.calls[0];
    expect(criteria).toEqual({ id: 'rule-1', tenant_id: 'tenant-1', updated_at: NOW });
  });

  it('update com expectedUpdatedAt desatualizado (0 linhas afetadas): lança ConflictException', async () => {
    const { svc, repo } = makeService();
    (repo.update as jest.Mock).mockResolvedValueOnce({ affected: 0 });

    await expect(
      svc.update('tenant-1', 'user-1', 'rule-1', {
        priority: 50,
        expectedUpdatedAt: new Date('2026-08-16T11:00:00.000Z').toISOString(),
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('softDelete: escopa por tenant e marca deleted_at', async () => {
    const { svc, repo } = makeService();

    await svc.softDelete('tenant-1', 'rule-1');

    const [criteria, patch] = (repo.update as jest.Mock).mock.calls[0];
    expect(criteria).toEqual({ id: 'rule-1', tenant_id: 'tenant-1' });
    expect(patch).toHaveProperty('deleted_at');
  });
});
