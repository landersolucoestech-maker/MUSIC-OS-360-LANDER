/**
 * external-data-exchange.service.spec.ts
 *
 * Fase 5 / C6: buildSocietyPayload() (privado) monta metadata.contributors/
 * rightHolders a partir de shares — só shares elegíveis para registro
 * (share_type IS NULL, não soft-deleted) podem entrar; shares financeiras/
 * pendentes nunca são tratadas como titular/autor numa submissão externa.
 *
 * O método é privado e chamado por submitSociety(), que também orquestra
 * provider/eventos/persistResult — irrelevante para o que o C6 mudou aqui.
 * Testamos buildSocietyPayload() isoladamente via cast, para não precisar
 * mockar toda a orquestração só para provar o filtro de elegibilidade.
 */
import 'reflect-metadata';
import { ExternalDataExchangeService } from './external-data-exchange.service';
import { WorkEntity, PhonogramEntity, ShareEntity } from '../../database/entities';

function makeQb(rows: Record<string, unknown>[]) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb;
  qb['where'] = jest.fn(chain);
  qb['getMany'] = jest.fn(async () => rows);
  return qb;
}

function makeDs(opts: { works?: Record<string, unknown>[]; shares?: Record<string, unknown>[] }) {
  const worksRepo = { createQueryBuilder: jest.fn(() => makeQb(opts.works ?? [])) };
  const phonogramsRepo = { createQueryBuilder: jest.fn(() => makeQb([])) };
  const sharesRepo = { createQueryBuilder: jest.fn(() => makeQb(opts.shares ?? [])) };
  const map = new Map<unknown, unknown>([
    [WorkEntity, worksRepo],
    [PhonogramEntity, phonogramsRepo],
    [ShareEntity, sharesRepo],
  ]);
  return { getRepository: jest.fn((e: unknown) => map.get(e) ?? {}) } as never;
}

function makeTenantResolver(active = true) {
  return { resolveTenant: jest.fn(async () => (active ? { id: 'tenant-1', active: true } : null)) };
}

function makeService(
  opts: { works?: Record<string, unknown>[]; shares?: Record<string, unknown>[] },
  tenantResolver: unknown = makeTenantResolver(),
) {
  const registry = {} as never;
  const events = { emitTyped: jest.fn() } as never;
  return new ExternalDataExchangeService(makeDs(opts), registry, events, tenantResolver as never);
}

describe('ExternalDataExchangeService.buildSocietyPayload — elegibilidade de shares (Fase 5 / C6)', () => {
  const work = { id: 'w1', titulo: 'Obra', compositores: null, compositor: null, co_compositores: null, editora: null, detentores: null, genero: null, isrc: null, iswc: null };

  it('contributors/rightHolders só incluem shares elegíveis (share_type null)', async () => {
    const svc = makeService({
      works: [work],
      shares: [
        { titular_nome: 'Autor Elegível', papel: 'autor', percentual: '100', titular_doc: null, status: 'ativo', share_type: null },
        { titular_nome: 'Financeiro', papel: 'autor', percentual: '999', titular_doc: null, status: 'ativo', share_type: 'pendente' },
      ],
    });

    const payload = await (svc as unknown as {
      buildSocietyPayload: (input: unknown, providerId: string) => Promise<{ metadata: Record<string, unknown> }>;
    }).buildSocietyPayload({ tenantId: 't1', userId: 'u1', workIds: ['w1'] }, 'abramus');

    const metadata = payload.metadata as { contributors: { name: string }[]; rightHolders: { name: string }[] };
    expect(metadata.contributors).toHaveLength(1);
    expect(metadata.contributors[0].name).toBe('Autor Elegível');
    expect(metadata.rightHolders).toHaveLength(1);
    expect(metadata.rightHolders[0].name).toBe('Autor Elegível');
  });

  it('nenhuma share elegível quando todas são financeiras/pendentes', async () => {
    const svc = makeService({
      works: [work],
      shares: [{ titular_nome: 'Financeiro', papel: 'autor', percentual: '100', titular_doc: null, status: 'ativo', share_type: 'pendente' }],
    });

    const payload = await (svc as unknown as {
      buildSocietyPayload: (input: unknown, providerId: string) => Promise<{ metadata: Record<string, unknown> }>;
    }).buildSocietyPayload({ tenantId: 't1', userId: 'u1', workIds: ['w1'] }, 'abramus');

    const metadata = payload.metadata as { contributors: unknown[] };
    expect(metadata.contributors).toHaveLength(0);
  });
});

describe('ExternalDataExchangeService.ingestWebhook — P0-3: tenant desativado', () => {
  it('tenant inativo: rejeita ANTES de qualquer escrita (webhookEvents.findOne/save nunca chamados)', async () => {
    const resolver = makeTenantResolver(false); // resolveTenant → null
    const svc = makeService({}, resolver);

    await expect(
      svc.ingestWebhook({ tenantId: 'tenant-1', providerId: 'abramus', kind: 'society', payload: { id: 'evt-1' } }),
    ).rejects.toThrow('Tenant not found or inactive');

    expect(resolver.resolveTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('sem secret configurado (assertSignature no-op) ainda assim checa tenant.active antes de tocar o banco', async () => {
    // Proves the tenant-active check doesn't depend on signature verification
    // having run something DB-side first — it's an independent gate.
    const resolver = { resolveTenant: jest.fn(async () => ({ id: 'tenant-1', active: false })) };
    const svc = makeService({}, resolver);

    await expect(
      svc.ingestWebhook({
        tenantId: 'tenant-1', providerId: 'abramus', kind: 'society',
        payload: {}, signature: null, secret: null,
      }),
    ).rejects.toThrow('Tenant not found or inactive');
  });
});
