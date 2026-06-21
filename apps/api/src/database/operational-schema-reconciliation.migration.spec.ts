import { ReconcileOperationalSchema20260620000004 } from './migrations/20260620000004_ReconcileOperationalSchema';

describe('ReconcileOperationalSchema20260620000004', () => {
  it('creates active operational tables with forced tenant RLS', async () => {
    const qr = { query: jest.fn(async (_sql: string) => undefined) };
    await new ReconcileOperationalSchema20260620000004().up(qr as never);
    const sql = qr.query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of [
      'operational_tasks',
      'campaign_tasks',
      'campaign_assets',
      'ai_usage_logs',
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public."${table}"`);
      expect(sql).toContain(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`,
      );
      expect(sql).toContain(
        `ALTER TABLE public."${table}" FORCE ROW LEVEL SECURITY`,
      );
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_select"`);
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_insert"`);
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_update"`);
      expect(sql).toContain(`CREATE POLICY "${table}_tenant_delete"`);
    }
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(sql).toContain('fk_campaign_tasks_campaign_tenant');
    expect(sql).toContain('fk_campaign_assets_campaign_tenant');
  });
});
