import { RbacErrorLogService } from './rbac-error-log.service';

describe('RbacErrorLogService', () => {
  function make(query = jest.fn(async () => undefined)) {
    const ds = { isInitialized: true, query } as unknown as ConstructorParameters<typeof RbacErrorLogService>[0];
    return { svc: new RbacErrorLogService(ds), query };
  }

  it('increments the per-type counter and persists a row', async () => {
    const { svc, query } = make();
    await svc.record({
      errorType: 'cache_error',
      errorSource: 'RbacDistributedCache:get',
      error: new Error('redis down'),
      tenantId: '10000000-0000-0000-0000-000000000002',
      userId: 'a8672305-2fb6-448b-9a5e-75c702d3f718',
      metadata: { op: 'get' },
    });
    expect(svc.getCounters().cache_error).toBe(1);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO rbac_error_logs');
    expect(params[4]).toBe('cache_error'); // error_type
    expect(params[2]).toBe('10000000-0000-0000-0000-000000000002'); // tenant_id (valid uuid kept)
  });

  it('tracks each error type independently', async () => {
    const { svc } = make();
    await svc.record({ errorType: 'shadow_error', errorSource: 's' });
    await svc.record({ errorType: 'guard_error', errorSource: 'g' });
    await svc.record({ errorType: 'guard_error', errorSource: 'g' });
    await svc.record({ errorType: 'permission_resolution_error', errorSource: 'r' });
    const c = svc.getCounters();
    expect(c.shadow_error).toBe(1);
    expect(c.guard_error).toBe(2);
    expect(c.permission_resolution_error).toBe(1);
  });

  it('nulls out non-uuid tenant/user ids before persisting', async () => {
    const { svc, query } = make();
    await svc.record({ errorType: 'guard_error', errorSource: 'g', tenantId: 'not-a-uuid', userId: '' });
    const [, params] = query.mock.calls[0];
    expect(params[2]).toBeNull(); // tenant_id
    expect(params[3]).toBeNull(); // user_id
  });

  it('never throws when the datasource is unavailable', async () => {
    const ds = { isInitialized: false, query: jest.fn() } as unknown as ConstructorParameters<typeof RbacErrorLogService>[0];
    const svc = new RbacErrorLogService(ds);
    await expect(svc.record({ errorType: 'cache_error', errorSource: 'x' })).resolves.toBeUndefined();
    expect(svc.getCounters().cache_error).toBe(1);
  });

  it('never throws when persistence itself fails', async () => {
    const query = jest.fn(async () => { throw new Error('insert failed'); });
    const ds = { isInitialized: true, query } as unknown as ConstructorParameters<typeof RbacErrorLogService>[0];
    const svc = new RbacErrorLogService(ds);
    await expect(svc.record({ errorType: 'shadow_error', errorSource: 'x' })).resolves.toBeUndefined();
  });
});
