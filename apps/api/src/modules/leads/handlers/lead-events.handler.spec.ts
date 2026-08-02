import 'reflect-metadata';
import { LeadEventsHandler } from './lead-events.handler';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { LeadConvertedPayload } from '../../../core/events/domain-events.types';

/**
 * lead-events.handler.spec.ts  (Parte 78)
 *
 * Guarda permanente: onLeadConverted() criava ClientEntity com
 * segmento/responsavel — colunas removidas fisicamente de `clients` pela
 * migration 20260719000010 (mesma causa raiz do bug de exportação de
 * clientes). Como o catch silencioso só loga o erro, toda conversão de lead
 * em cliente falhava sem nenhum sinal visível: nenhum cliente era criado,
 * `lead.cliente_id` nunca era vinculado. Não havia spec algum para este
 * handler antes desta Parte.
 */
function makeRepo() {
  return {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn(async (entity: unknown) => ({ ...(entity as object) })),
    update: jest.fn(async () => ({ affected: 1 })),
  };
}

function makeEvent(): DomainEvent<LeadConvertedPayload> {
  return {
    type: DOMAIN_EVENTS.LEAD_CONVERTED,
    tenantId: 'tenant-1',
    userId: 'user-1',
    correlationId: 'corr-1',
    payload: {
      tenantId: 'tenant-1',
      leadId: 'lead-1',
      nome: 'Fulano de Tal',
      empresa: false,
      convertedBy: 'user-1',
      convertedAt: new Date().toISOString(),
    },
  } as unknown as DomainEvent<LeadConvertedPayload>;
}

describe('LeadEventsHandler.onLeadConverted', () => {
  it('cria o cliente usando categoria/perfil/responsavel_nome (colunas físicas reais), nunca segmento/responsavel (removidas)', async () => {
    const clientRepo = makeRepo();
    const leadRepo = makeRepo();
    const artistRepo = makeRepo();
    const ds = {
      getRepository: jest.fn((entity: { name: string }) => {
        if (entity.name === 'ClientEntity') return clientRepo;
        if (entity.name === 'LeadEntity') return leadRepo;
        return artistRepo;
      }),
    } as any;

    const handler = new LeadEventsHandler(ds, undefined);
    await handler.onLeadConverted(makeEvent());

    expect(clientRepo.create).toHaveBeenCalledTimes(1);
    const created = clientRepo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(created['segmento']).toBeUndefined();
    expect(created['responsavel']).toBeUndefined();
    expect(created['categoria']).toBe('CORPORATE_CLIENT');
    expect(created['perfil']).toBe('outros');
    expect(created['responsavel_nome']).toBe('user-1');
    expect(clientRepo.save).toHaveBeenCalledTimes(1);
  });

  it('vincula lead.cliente_id após criar o cliente com sucesso', async () => {
    const clientRepo = makeRepo();
    const leadRepo = makeRepo();
    const artistRepo = makeRepo();
    const ds = {
      getRepository: jest.fn((entity: { name: string }) => {
        if (entity.name === 'ClientEntity') return clientRepo;
        if (entity.name === 'LeadEntity') return leadRepo;
        return artistRepo;
      }),
    } as any;

    const handler = new LeadEventsHandler(ds, undefined);
    await handler.onLeadConverted(makeEvent());

    expect(leadRepo.update).toHaveBeenCalledWith(
      { id: 'lead-1', tenant_id: 'tenant-1' },
      expect.objectContaining({ cliente_id: expect.any(String), status: 'convertido' }),
    );
  });
});
