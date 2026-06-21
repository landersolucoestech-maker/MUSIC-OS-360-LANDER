import 'reflect-metadata';
import { AutentiqueService } from './autentique.service';
import { ContractEntity, IntegrationEntity } from '../../../database/entities';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';

describe('AutentiqueService webhook tenant context', () => {
  it('resolve o tenant por leitura administrativa e processa o contrato no contexto correto', async () => {
    const contract = {
      id: 'contract-a',
      tenant_id: 'tenant-a',
      titulo: 'Contrato A',
      artista_id: 'artist-a',
      autentique_doc_id: 'doc-a',
    };
    const updateQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 1 })),
    };
    const contextualContractRepo = {
      findOne: jest.fn(async () => contract),
      createQueryBuilder: jest.fn(() => updateQb),
    };
    const integrationQb = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => null),
    };
    const integrationRepo = {
      createQueryBuilder: jest.fn(() => integrationQb),
    };
    const appContractRepo = {};
    const appDataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === IntegrationEntity ? integrationRepo : appContractRepo),
    };
    const adminContractRepo = {
      findOne: jest.fn(async () => contract),
    };
    const adminDataSource = {
      getRepository: jest.fn(() => adminContractRepo),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        expect(entity).toBe(ContractEntity);
        return contextualContractRepo;
      }),
    };
    const dbContext = {
      runInTenantContext: jest.fn(
        async (_ctx: unknown, work: (manager: unknown) => Promise<unknown>) => work(manager),
      ),
    };
    const events = { emitTyped: jest.fn() };
    const webhookSvc = {
      validateSharedSecret: jest.fn(() => true),
      ingest: jest.fn(async () => ({
        isDuplicate: false,
        eventId: 'webhook-a',
        status: 'pending',
      })),
      markProcessed: jest.fn(),
    };
    const service = new AutentiqueService(
      appDataSource as never,
      {} as never,
      { get: jest.fn(() => 'secret') } as never,
      events as never,
      null as never,
      webhookSvc as never,
      dbContext as never,
      adminDataSource as never,
    );

    await service.handleWebhook({
      event: 'document.signed',
      event_id: 'event-a',
      document_id: 'doc-a',
    }, 'secret');

    expect(adminContractRepo.findOne).toHaveBeenCalledWith({
      where: { autentique_doc_id: 'doc-a' },
    });
    expect(dbContext.runInTenantContext).toHaveBeenCalledWith(
      { tenantId: 'tenant-a', orgId: null, role: null },
      expect.any(Function),
    );
    expect(contextualContractRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'contract-a', tenant_id: 'tenant-a' },
    });
    expect(updateQb.where).toHaveBeenCalledWith(
      'id = :id AND tenant_id = :tenantId',
      { id: 'contract-a', tenantId: 'tenant-a' },
    );
    expect(events.emitTyped).toHaveBeenCalledWith(
      DOMAIN_EVENTS.CONTRACT_SIGNED,
      expect.objectContaining({ tenantId: 'tenant-a', aggregateId: 'contract-a' }),
    );
  });
});
