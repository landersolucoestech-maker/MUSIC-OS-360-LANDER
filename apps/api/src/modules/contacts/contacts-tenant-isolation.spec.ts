import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactAttachmentsService } from '../contact-attachments/contact-attachments.service';
import { ContactContractsService } from '../contact-contracts/contact-contracts.service';
import { ContactTimelineService } from '../contact-timeline/contact-timeline.service';

/**
 * contacts-tenant-isolation.spec.ts  (reescrito na Parte 80)
 *
 * ContactsService deixou de ser um Map em memória e virou uma facade sobre
 * ClientsService (a tabela física `contacts` não existe — ver
 * contacts.service.ts). Tenant isolation real já é coberta em
 * clients.service.spec.ts / client-entity-schema-alignment.spec.ts; este
 * spec agora garante que a facade REPASSA o tenantId corretamente para
 * ClientsService em toda operação, sem vazar nem substituir por outro.
 *
 * A facade nunca repassa um `id` vindo do chamador para ClientsService.create()
 * (IDs são sempre gerados no servidor) — o mock abaixo reflete esse mesmo
 * comportamento; os testes capturam o id retornado em vez de assumir um fixo.
 */
function makeClientsServiceMock() {
  const store = new Map<string, Map<string, Record<string, unknown>>>();
  let counter = 0;
  const forTenant = (tenantId: string) => {
    let t = store.get(tenantId);
    if (!t) { t = new Map(); store.set(tenantId, t); }
    return t;
  };
  return {
    list: jest.fn(async (tenantId: string) => ({
      data: Array.from(forTenant(tenantId).values()),
      meta: { total: forTenant(tenantId).size, offset: 0, limit: 50 },
    })),
    findById: jest.fn(async (tenantId: string, id: string) => {
      const found = forTenant(tenantId).get(id);
      if (!found) throw new NotFoundException('Cliente não encontrado');
      return found;
    }),
    create: jest.fn(async (tenantId: string, _userId: string, dto: Record<string, unknown>) => {
      const id = `generated-id-${++counter}`;
      const entity = { id, name: dto['name'], ...dto };
      forTenant(tenantId).set(id, entity);
      return entity;
    }),
    update: jest.fn(async (tenantId: string, _userId: string, id: string, dto: Record<string, unknown>) => {
      const current = forTenant(tenantId).get(id);
      if (!current) throw new NotFoundException('Cliente não encontrado');
      const updated = { ...current, ...dto };
      forTenant(tenantId).set(id, updated);
      return updated;
    }),
    remove: jest.fn(async () => ({ deleted: true })),
  };
}

describe('ContactsService (facade) — repassa tenant corretamente para ClientsService', () => {
  let clients: ReturnType<typeof makeClientsServiceMock>;
  let contacts: ContactsService;
  let attachments: ContactAttachmentsService;
  let contracts: ContactContractsService;
  let timeline: ContactTimelineService;

  beforeEach(() => {
    clients = makeClientsServiceMock();
    contacts = new ContactsService(clients as any);
    attachments = new ContactAttachmentsService(contacts);
    contracts = new ContactContractsService(contacts);
    timeline = new ContactTimelineService(contacts);
  });

  it('isola contatos por tenant mesmo com o mesmo nome em ambos', async () => {
    const a = await contacts.create('tenant-a', { name: 'Tenant A Contact' });
    const b = await contacts.create('tenant-b', { name: 'Tenant B Contact' });

    await expect(contacts.getById('tenant-a', a.id as string)).resolves.toMatchObject({ name: 'Tenant A Contact' });
    await expect(contacts.getById('tenant-b', b.id as string)).resolves.toMatchObject({ name: 'Tenant B Contact' });
    expect(clients.findById).toHaveBeenCalledWith('tenant-a', a.id);
    expect(clients.findById).toHaveBeenCalledWith('tenant-b', b.id);
  });

  it('não permite que o tenant A acesse um contato do tenant B por id', async () => {
    const b = await contacts.create('tenant-b', { name: 'Tenant B Contact' });

    await expect(contacts.getById('tenant-a', b.id as string)).rejects.toThrow('Cliente não encontrado');
    await expect(contacts.update('tenant-a', b.id as string, { name: 'Changed' })).rejects.toThrow();
  });

  it('escopa anexos, contratos vinculados e timeline ao tenant do contato (via assertBelongsToTenant)', async () => {
    const a = await contacts.create('tenant-a', { name: 'Tenant A Contact' });
    const b = await contacts.create('tenant-b', { name: 'Tenant B Contact' });
    const contactA = a.id as string;
    const contactB = b.id as string;

    await attachments.create('tenant-a', contactA, {
      mimeType: 'application/pdf',
      extension: 'pdf',
      size: 1234,
      fileName: 'a.pdf',
    });
    await contracts.link('tenant-a', contactA, { contractId: 'contract-a' });
    await timeline.create('tenant-a', contactA, { type: 'note', description: 'tenant-a note' });

    await expect(attachments.list('tenant-a', contactA)).resolves.toHaveLength(1);
    await expect(contracts.list('tenant-a', contactA)).resolves.toHaveLength(1);
    await expect(timeline.list('tenant-a', contactA)).resolves.toHaveLength(1);

    await expect(attachments.list('tenant-b', contactB)).resolves.toEqual([]);
    await expect(contracts.list('tenant-b', contactB)).resolves.toEqual([]);
    await expect(timeline.list('tenant-b', contactB)).resolves.toEqual([]);
  });

  it('bloqueia acesso via subrota quando o contato pertence a outro tenant', async () => {
    const b = await contacts.create('tenant-b', { name: 'Tenant B Contact' });
    const contactB = b.id as string;

    await expect(attachments.list('tenant-a', contactB)).rejects.toThrow();
    await expect(contracts.list('tenant-a', contactB)).rejects.toThrow();
    await expect(timeline.list('tenant-a', contactB)).rejects.toThrow();
  });
});
