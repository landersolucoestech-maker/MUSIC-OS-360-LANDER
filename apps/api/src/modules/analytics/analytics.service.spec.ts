import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let svc: AnalyticsService;

  beforeEach(() => {
    svc = new AnalyticsService(null);
  });

  it('logAiUsage is a no-op when DS is null', async () => {
    await expect(svc.logAiUsage({
      tenantId:     'tenant-1',
      model:        'claude-3-5-sonnet',
      feature:      'summarize',
      tokensInput:  100,
      tokensOutput: 50,
    })).resolves.toBeUndefined();
  });

  it('getAiUsageSummary returns null when DS is null', async () => {
    const result = await svc.getAiUsageSummary('tenant-1', 30);
    expect(result).toBeNull();
  });

  it('getDashboard returns null when DS is null', async () => {
    const result = await svc.getDashboard('tenant-1');
    expect(result).toBeNull();
  });

  it('getRevenueOverview returns null when DS is null', async () => {
    const result = await svc.getRevenueOverview('tenant-1', 6);
    expect(result).toBeNull();
  });
});
