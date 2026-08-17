import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { TakedownsService } from './takedowns.service';
import { DATA_SOURCE } from '../../database/database.module';
import { TakedownEntity } from '../../database/entities';

/**
 * Task K — concorrência otimista em TakedownsService.update().
 * Antes: repo.update() incondicional. Agora, com `expectedUpdatedAt`, 0
 * linhas afetadas -> 409 (ConflictException). Sem, comportamento idêntico.
 */

const TENANT = 'tenant-test';
const TAKEDOWN_ID = 'takedown-test';
const NOW = new Date('2026-08-14T12:00:00.000Z');

const mockTakedown = {
  id: TAKEDOWN_ID,
  tenant_id: TENANT,
  titulo: 'Takedown teste',
  status: 'pendente',
  plataforma: 'youtube',
  deleted_at: null,
  updated_at: NOW,
} as unknown as TakedownEntity;

function buildMockDs(updateResult: { affected: number } = { affected: 1 }) {
  const qb: any = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn().mockResolvedValue(mockTakedown),
  };
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);

  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    update: jest.fn().mockResolvedValue(updateResult),
  };
  return { getRepository: jest.fn(() => repo), _repo: repo };
}

describe('TakedownsService — concorrência otimista em update()', () => {
  let service: TakedownsService;
  let mockDs: ReturnType<typeof buildMockDs>;

  async function buildService(updateResult?: { affected: number }) {
    mockDs = buildMockDs(updateResult);
    const module = await Test.createTestingModule({
      providers: [
        TakedownsService,
        { provide: DATA_SOURCE, useValue: mockDs },
      ],
    }).compile();
    return module.get<TakedownsService>(TakedownsService);
  }

  it('sem expectedUpdatedAt: aplica update incondicional (compatibilidade retroativa)', async () => {
    service = await buildService({ affected: 1 });
    await service.update(TENANT, 'u1', TAKEDOWN_ID, { titulo: 'Novo título' } as any);

    expect(mockDs._repo.update).toHaveBeenCalledWith(
      { id: TAKEDOWN_ID, tenant_id: TENANT },
      expect.objectContaining({ titulo: 'Novo título' }),
    );
  });

  it('com expectedUpdatedAt correto: inclui updated_at no critério', async () => {
    service = await buildService({ affected: 1 });
    await service.update(TENANT, 'u1', TAKEDOWN_ID, {
      titulo: 'Editado',
      expectedUpdatedAt: NOW.toISOString(),
    } as any);

    const [criteria, payload] = mockDs._repo.update.mock.calls[0];
    expect(criteria.id).toBe(TAKEDOWN_ID);
    expect(criteria.tenant_id).toBe(TENANT);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = criteria.updated_at as any;
    expect(op._type).toBe('raw');
    expect(op._objectLiteralParameters).toEqual({ expected: NOW });
    expect(payload).toEqual(expect.objectContaining({ titulo: 'Editado' }));
  });

  it('com expectedUpdatedAt desatualizado (0 linhas afetadas): lança ConflictException (409)', async () => {
    service = await buildService({ affected: 0 });
    await expect(
      service.update(TENANT, 'u1', TAKEDOWN_ID, {
        titulo: 'Tentativa concorrente',
        expectedUpdatedAt: new Date('2026-08-14T11:00:00.000Z').toISOString(),
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('expectedUpdatedAt com formato inválido: 400, não 500 nem silêncio', async () => {
    service = await buildService({ affected: 1 });
    await expect(
      service.update(TENANT, 'u1', TAKEDOWN_ID, {
        titulo: 'x',
        expectedUpdatedAt: 'not-a-date',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
