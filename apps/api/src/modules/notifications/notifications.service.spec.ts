import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DatabaseContextService } from '../../database/database-context.service';

/**
 * P2-3 — proves the notifications module is wired through
 * DatabaseContextService.runInTenantContext():
 *  - flag OFF → passthrough (default manager, no transaction) — current behaviour
 *  - flag ON  → work runs inside the context transaction (set_config per request)
 *  - tenant/org/role context is bound correctly
 *  - errors propagate (→ rollback in the primitive) and payloads are unchanged
 */

function makeQb(result: { many?: unknown[]; count?: number; one?: unknown }) {
  const qb: any = {};
  qb.where = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  qb.orderBy = jest.fn(() => qb);
  qb.skip = jest.fn(() => qb);
  qb.take = jest.fn(() => qb);
  qb.update = jest.fn(() => qb);
  qb.set = jest.fn(() => qb);
  qb.getManyAndCount = jest.fn(async () => [result.many ?? [], result.count ?? 0]);
  qb.getCount = jest.fn(async () => result.count ?? 0);
  qb.getOne = jest.fn(async () => result.one ?? null);
  qb.execute = jest.fn(async () => ({ affected: result.count ?? 0 }));
  return qb;
}

function makeRepo() {
  const repo: any = { _qbs: [] as any[] };
  repo.createQueryBuilder = jest.fn(() => {
    const qb = repo._nextQb ?? makeQb({});
    repo._qbs.push(qb);
    return qb;
  });
  repo.update = jest.fn(async () => ({ affected: 1 }));
  return repo;
}

/** DataSource whose default manager + queryRunner manager both return `repo`. */
function makeDataSource(repo: any) {
  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue(undefined),
    isTransactionActive: true,
    manager: { getRepository: jest.fn(() => repo) },
  };
  return {
    _queryRunner: queryRunner,
    manager: { getRepository: jest.fn(() => repo) },
    getRepository: jest.fn(() => repo),
    createQueryRunner: jest.fn(() => queryRunner),
  } as any;
}

function build(flag: 'true' | 'false') {
  const repo = makeRepo();
  const ds = makeDataSource(repo);
  const dbContext = new DatabaseContextService(ds, { get: jest.fn(() => flag) } as any);
  const ws = {} as any;
  const queue = null;
  const svc = new NotificationsService(ds, queue, ws, dbContext);
  return { svc, ds, repo, dbContext };
}

describe('NotificationsService — P2-3 session-context wiring', () => {
  const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ctx = { orgId: 'org-1', role: 'manager' };

  describe('flag OFF (default) — passthrough', () => {
    it('list runs against the default manager, no transaction', async () => {
      const { svc, ds, repo } = build('false');
      repo._nextQb = makeQb({ many: [{ id: 'n1' }], count: 1 });

      const out = await svc.list(TENANT_A, 'user-1', { offset: 0, limit: 20 } as any, ctx);

      expect(out).toEqual({ data: [{ id: 'n1' }], meta: { total: 1, offset: 0, limit: 20 } });
      expect(ds.manager.getRepository).toHaveBeenCalled();
      expect(ds.createQueryRunner).not.toHaveBeenCalled();
      expect(ds._queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('markAllRead returns the same payload shape', async () => {
      const { svc, repo } = build('false');
      repo._nextQb = makeQb({ count: 3 });
      const out = await svc.markAllRead(TENANT_A, 'user-1', ctx);
      expect(out).toEqual({ updated: 3 });
    });
  });

  describe('flag ON — runs inside runInTenantContext', () => {
    it('list opens a transaction and binds tenant/org/role via set_config', async () => {
      const { svc, ds } = build('true');
      ds.getRepository().createQueryBuilder.mockReturnValueOnce(makeQb({ many: [], count: 0 }));

      await svc.list(TENANT_A, 'user-1', { offset: 0, limit: 20 } as any, ctx);

      const qr = ds._queryRunner;
      expect(ds.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(qr.startTransaction).toHaveBeenCalledTimes(1);
      expect(qr.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        [TENANT_A],
      );
      expect(qr.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_org_id', $1, true)`,
        ['org-1'],
      );
      expect(qr.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_role', $1, true)`,
        ['manager'],
      );
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('markRead throws NotFound (→ rollback + release) when row absent', async () => {
      const { svc, ds, repo } = build('true');
      repo._nextQb = makeQb({ one: null });

      await expect(svc.markRead(TENANT_A, 'missing-id', ctx)).rejects.toBeInstanceOf(NotFoundException);

      const qr = ds._queryRunner;
      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('markRead filters every query by tenant_id (tenant isolation preserved)', async () => {
      const { svc, repo } = build('true');
      const qb = makeQb({ one: { id: 'n1', tenant_id: TENANT_A } });
      repo._nextQb = qb;

      await svc.markRead(TENANT_A, 'n1', ctx);

      expect(qb.where).toHaveBeenCalledWith(
        'n.id = :id AND n.tenant_id = :tenantId',
        { id: 'n1', tenantId: TENANT_A },
      );
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'n1', tenant_id: TENANT_A },
        { read_at: expect.any(Date) },
      );
    });
  });
});
