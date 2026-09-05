import { BillingEnforcementService } from './billing-enforcement.service';

/**
 * P0-2 regression: webhook idempotency must be retry-safe, not just
 * duplicate-safe. See billing.service.ts's handleWebhook for the full
 * flow — this spec exercises the exact SQL contract recordWebhookProcessed/
 * markWebhookProcessed/markWebhookFailed guarantee.
 */
describe('BillingEnforcementService — webhook idempotency lifecycle', () => {
  function makeService(queryImpl: jest.Mock) {
    const ds = { query: queryImpl } as never;
    const audit = { record: jest.fn() } as never;
    return new BillingEnforcementService(ds, audit);
  }

  it('primeira entrega: INSERT reivindica o evento (status=processing) — "inserted"', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ id: 'row-1' }]); // INSERT ... RETURNING id
    const service = makeService(query);

    const result = await service.recordWebhookProcessed({
      tenantId: 'tenant-1', stripeEventId: 'evt_1', eventType: 'invoice.paid', payload: {},
    });

    expect(result).toBe('inserted');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/INSERT INTO payment_events/);
    expect(query.mock.calls[0][0]).toMatch(/status'?\)?\s*\n?\s*VALUES.*'processing'/s);
  });

  it('evento já PROCESSED: INSERT conflita, reclaim (WHERE status=\'failed\') não afeta nenhuma linha — "duplicate"', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([]) // INSERT ... ON CONFLICT DO NOTHING → 0 rows (already exists)
      .mockResolvedValueOnce([]); // UPDATE ... WHERE status='failed' → 0 rows (it's 'processed', not 'failed')
    const service = makeService(query);

    const result = await service.recordWebhookProcessed({
      tenantId: 'tenant-1', stripeEventId: 'evt_done', eventType: 'invoice.paid', payload: {},
    });

    expect(result).toBe('duplicate');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toMatch(/UPDATE payment_events/);
    expect(query.mock.calls[1][0]).toMatch(/WHERE stripe_event_id = \$1 AND status = 'failed'/);
  });

  it('evento em PROCESSING por outra entrega concorrente: reclaim também não afeta linha — "duplicate", nunca reprocessa em paralelo', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([]) // INSERT conflicts — a sibling delivery already holds it
      .mockResolvedValueOnce([]); // reclaim fails — status is 'processing', not 'failed'
    const service = makeService(query);

    const result = await service.recordWebhookProcessed({
      tenantId: 'tenant-1', stripeEventId: 'evt_inflight', eventType: 'invoice.paid', payload: {},
    });

    expect(result).toBe('duplicate');
  });

  it('evento FAILED (falha transitória anterior): reclaim afeta a linha — "inserted", retry legítimo acontece', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([]) // INSERT conflicts — row already exists from the failed attempt
      .mockResolvedValueOnce([{ id: 'row-1' }]); // reclaim succeeds — status was 'failed'
    const service = makeService(query);

    const result = await service.recordWebhookProcessed({
      tenantId: 'tenant-1', stripeEventId: 'evt_retry', eventType: 'invoice.paid', payload: {},
    });

    expect(result).toBe('inserted');
  });

  it('markWebhookProcessed: seta status=processed e processed_at=now() — só isso conta como aplicado de verdade', async () => {
    const query = jest.fn().mockResolvedValueOnce([]);
    const service = makeService(query);

    await service.markWebhookProcessed('evt_1');

    expect(query.mock.calls[0][0]).toMatch(/SET status = 'processed', processed_at = now\(\)/);
    expect(query.mock.calls[0][1]).toEqual(['evt_1']);
  });

  it('markWebhookFailed: seta status=failed — FAILED != PROCESSED, e habilita reclaim futuro', async () => {
    const query = jest.fn().mockResolvedValueOnce([]);
    const service = makeService(query);

    await service.markWebhookFailed('evt_1');

    expect(query.mock.calls[0][0]).toMatch(/SET status = 'failed'/);
    expect(query.mock.calls[0][1]).toEqual(['evt_1']);
  });
});
