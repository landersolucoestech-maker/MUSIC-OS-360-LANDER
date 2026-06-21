import { DatabaseContextService } from './database-context.service';

/**
 * P2-2 — unit coverage for the runtime session-context primitive.
 * Proves flag-OFF pass-through (no transaction, no context) and flag-ON behaviour
 * (transaction + set_config per variable + commit/rollback + release).
 */

function makeQueryRunner() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue(undefined),
    isTransactionActive: true,
    manager: { id: 'tx-manager' },
  };
}

function makeDataSource(qr: ReturnType<typeof makeQueryRunner>) {
  return {
    manager: { id: 'default-manager' },
    createQueryRunner: jest.fn(() => qr),
  } as any;
}

function configWith(flag: string) {
  return { get: jest.fn(() => flag) } as any;
}

describe('DatabaseContextService', () => {
  describe('flag OFF (default)', () => {
    it('is not enabled and runs work against the default manager without a transaction', async () => {
      const qr = makeQueryRunner();
      const ds = makeDataSource(qr);
      const svc = new DatabaseContextService(ds, configWith('false'));

      expect(svc.isEnabled).toBe(false);

      const work = jest.fn(async (m: any) => m.id);
      const result = await svc.runInTenantContext(
        { tenantId: 't-1', orgId: 'o-1', role: 'admin' },
        work,
      );

      expect(result).toBe('default-manager');
      expect(work).toHaveBeenCalledWith(ds.manager);
      expect(ds.createQueryRunner).not.toHaveBeenCalled();
      expect(qr.startTransaction).not.toHaveBeenCalled();
      expect(qr.query).not.toHaveBeenCalled();
    });
  });

  describe('flag ON', () => {
    it('opens a transaction, binds tenant/org/role via set_config, commits and releases', async () => {
      const qr = makeQueryRunner();
      const ds = makeDataSource(qr);
      const svc = new DatabaseContextService(ds, configWith('true'));

      expect(svc.isEnabled).toBe(true);

      const work = jest.fn(async (m: any) => m.id);
      const result = await svc.runInTenantContext(
        { tenantId: 't-1', orgId: 'o-1', role: 'admin' },
        work,
      );

      expect(result).toBe('tx-manager');
      expect(work).toHaveBeenCalledWith(qr.manager);
      expect(qr.startTransaction).toHaveBeenCalledTimes(1);

      // Three transaction-local set_config calls, parameterised.
      expect(qr.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        ['t-1'],
      );
      expect(qr.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_org_id', $1, true)`,
        ['o-1'],
      );
      expect(qr.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_role', $1, true)`,
        ['admin'],
      );

      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
      expect(qr.rollbackTransaction).not.toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('binds missing context values as empty string (fail-closed) ', async () => {
      const qr = makeQueryRunner();
      const ds = makeDataSource(qr);
      const svc = new DatabaseContextService(ds, configWith('true'));

      await svc.runInTenantContext({}, async () => 'ok');

      expect(qr.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        [''],
      );
    });

    it('rolls back and releases when the work throws', async () => {
      const qr = makeQueryRunner();
      const ds = makeDataSource(qr);
      const svc = new DatabaseContextService(ds, configWith('true'));

      const boom = new Error('boom');
      await expect(
        svc.runInTenantContext({ tenantId: 't-1' }, async () => {
          throw boom;
        }),
      ).rejects.toBe(boom);

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('no DataSource (standalone mode)', () => {
    it('is disabled and passes undefined manager through', async () => {
      const svc = new DatabaseContextService(null, configWith('true'));
      expect(svc.isEnabled).toBe(false);
      const result = await svc.runInTenantContext({ tenantId: 't-1' }, async () => 'standalone');
      expect(result).toBe('standalone');
    });
  });
});
