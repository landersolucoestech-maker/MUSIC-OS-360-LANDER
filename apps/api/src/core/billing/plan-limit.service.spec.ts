import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { PlanLimitService } from './plan-limit.service';

function makeDs(count: number) {
  const sub = { plan: 'starter' };
  return {
    getRepository: jest.fn(() => ({
      findOne: jest.fn().mockResolvedValue(sub),
    })),
    query: jest.fn().mockResolvedValue([{ cnt: String(count) }]),
  };
}

describe('PlanLimitService', () => {
  it('resolvePlan retorna "starter" quando DS é null', async () => {
    const svc = new PlanLimitService(null);
    const plan = await svc.resolvePlan('org-1');
    expect(plan).toBe('starter');
  });

  it('enforce retorna sem erros quando DS é null (noop)', async () => {
    const svc = new PlanLimitService(null);
    await expect(svc.enforce('t1', 'org-1', 'artists')).resolves.toBeUndefined();
  });

  it('enforce passa quando abaixo do limite', async () => {
    const ds = makeDs(3); // limit = 5 para starter
    const svc = new PlanLimitService(ds as any);

    await expect(svc.enforce('t1', 'org-1', 'artists')).resolves.toBeUndefined();
    expect(ds.query).toHaveBeenCalled();
  });

  it('enforce lança ForbiddenException quando no limite', async () => {
    const ds = makeDs(5); // starter limit for artists = 5
    const svc = new PlanLimitService(ds as any);

    await expect(svc.enforce('t1', 'org-1', 'artists')).rejects.toThrow(ForbiddenException);
  });

  it('enforce passa quando limite é null (ilimitado — enterprise)', async () => {
    const ds = makeDs(9999);
    // Override plan to enterprise
    ds.getRepository = jest.fn(() => ({
      findOne: jest.fn().mockResolvedValue({ plan: 'enterprise' }),
    }));
    const svc = new PlanLimitService(ds as any);

    await expect(svc.enforce('t1', 'org-1', 'artists')).resolves.toBeUndefined();
  });

  it('getUsageSummary retorna usage, limits e percent', async () => {
    const ds = makeDs(2);
    const svc = new PlanLimitService(ds as any);

    const result = await svc.getUsageSummary('t1', 'org-1');
    expect(result).toHaveProperty('plan');
    expect(result).toHaveProperty('usage');
    expect(result).toHaveProperty('limits');
    expect(result).toHaveProperty('percent');
  });

  it('getUsageSummary retorna null percentage para plano ilimitado', async () => {
    const ds = makeDs(10);
    ds.getRepository = jest.fn(() => ({
      findOne: jest.fn().mockResolvedValue({ plan: 'enterprise' }),
    }));
    const svc = new PlanLimitService(ds as any);

    const result = await svc.getUsageSummary('t1', 'org-1');
    expect(result.percent['artists']).toBeNull();
  });
});
