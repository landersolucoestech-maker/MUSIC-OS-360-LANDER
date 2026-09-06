import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

/**
 * REM-06 (Remaining Product Completion Backlog): `invoices` mistura Notas
 * Fiscais (o tenant fatura os SEUS clientes) com faturas Stripe da própria
 * assinatura SaaS do tenant (billing.service.ts upsertStripeInvoice,
 * type='stripe_subscription'). GET /invoices e GET /invoices/:id (
 * RequireRole('viewer')) vazavam essas faturas Stripe — o mesmo dado só
 * deveria ser acessível via /billing/subscription (RequireRole('admin')).
 */
function makeQb(rows: unknown[], one: unknown = null) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(async () => [rows, rows.length]),
    getOne: jest.fn(async () => one),
  };
}

function makeService(rows: unknown[] = [], one: unknown = null) {
  const qb = makeQb(rows, one);
  const repo = { createQueryBuilder: jest.fn(() => qb) };
  const ds = { getRepository: jest.fn(() => repo) } as any;
  const enc = { decryptNullable: jest.fn(() => null), encryptNullable: jest.fn(() => null) } as any;
  const svc = new InvoicesService(ds, enc);
  return { svc, qb };
}

describe('InvoicesService.list — exclui faturas Stripe da assinatura SaaS (REM-06)', () => {
  it('filtra type != stripe_subscription por padrão', async () => {
    const { svc, qb } = makeService();
    await svc.list('tenant-1', {} as any);

    expect(qb.andWhere).toHaveBeenCalledWith("i.type != 'stripe_subscription'");
  });
});

describe('InvoicesService.findById — exclui faturas Stripe da assinatura SaaS (REM-06)', () => {
  it('filtra type != stripe_subscription na busca por id', async () => {
    const { svc, qb } = makeService([], { id: 'inv-1', type: 'nfse' });
    await svc.findById('tenant-1', 'inv-1');

    expect(qb.andWhere).toHaveBeenCalledWith("i.type != 'stripe_subscription'");
  });

  it('lança NotFoundException quando a fatura Stripe é a única correspondência (excluída pela query)', async () => {
    const { svc } = makeService([], null);
    await expect(svc.findById('tenant-1', 'inv-stripe-1')).rejects.toThrow(NotFoundException);
  });
});
