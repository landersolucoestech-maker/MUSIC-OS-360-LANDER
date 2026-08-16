import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { FormsService } from './forms.service';
import { EventsService } from '../../core/events/events.service';

/**
 * Task K — mesma proteção de concorrência otimista aplicada a
 * TransactionsService/ClientsService: FormsService.update() usava
 * repo.update() incondicional — duas pessoas editando o mesmo formulário em
 * paralelo faziam a segunda gravação sobrescrever a primeira em silêncio.
 * Sem `expectedUpdatedAt`, o comportamento continua idêntico ao anterior.
 */

const NOW = new Date('2026-08-14T12:00:00.000Z');
const FORM = {
  id: 'form-1', tenant_id: 'tenant-1', name: 'Contato', status: 'draft',
  deleted_at: null, updated_at: NOW,
};

function makeRepo() {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb;
  qb['where'] = jest.fn(chain);
  qb['andWhere'] = jest.fn(chain);
  qb['getOne'] = jest.fn(async () => FORM);

  return {
    createQueryBuilder: jest.fn(() => qb),
    update: jest.fn(async () => ({ affected: 1 })),
    _qb: qb,
  };
}

function makeService() {
  const formRepo = makeRepo();
  const subRepo = { createQueryBuilder: jest.fn() };
  const leadRepo = { createQueryBuilder: jest.fn() };
  const ds = {
    getRepository: jest.fn((entity: unknown) => {
      const name = (entity as { name?: string })?.name ?? String(entity);
      if (name.includes('FormSubmission')) return subRepo;
      if (name.includes('Lead')) return leadRepo;
      return formRepo;
    }),
  } as any;
  const events = { emitTyped: jest.fn(), emit: jest.fn() } as unknown as EventsService;
  const svc = new FormsService(ds, events);
  return { svc, formRepo };
}

describe('FormsService.update — concorrência otimista (Task K)', () => {
  it('sem expectedUpdatedAt: aplica update incondicional (compatibilidade retroativa)', async () => {
    const { svc, formRepo } = makeService();

    await svc.update('tenant-1', 'form-1', { name: 'Contato Novo' } as any);

    const [criteria] = (formRepo.update as jest.Mock).mock.calls[0];
    expect(criteria).toEqual({ id: 'form-1', tenant_id: 'tenant-1' });
  });

  it('com expectedUpdatedAt correto: inclui updated_at no critério do UPDATE', async () => {
    const { svc, formRepo } = makeService();

    await svc.update('tenant-1', 'form-1', {
      name: 'Contato Novo',
      expectedUpdatedAt: NOW.toISOString(),
    } as any);

    const [criteria] = (formRepo.update as jest.Mock).mock.calls[0];
    expect(criteria).toEqual({ id: 'form-1', tenant_id: 'tenant-1', updated_at: NOW });
  });

  it('com expectedUpdatedAt desatualizado (0 linhas afetadas): lança ConflictException, não sobrescreve', async () => {
    const { svc, formRepo } = makeService();
    (formRepo.update as jest.Mock).mockResolvedValueOnce({ affected: 0 });

    await expect(
      svc.update('tenant-1', 'form-1', {
        name: 'Edição concorrente',
        expectedUpdatedAt: new Date('2026-08-14T11:00:00.000Z').toISOString(),
      } as any),
    ).rejects.toThrow(ConflictException);
  });
});
