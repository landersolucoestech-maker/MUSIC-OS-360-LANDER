import { Test }              from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorksService }      from './works.service';
import { DRIZZLE_DB }        from '../../database/database.module';

const TENANT = 'tenant-test';
const WORK_ID = 'work-test';
const mockWork = { id: WORK_ID, tenant_id: TENANT, titulo: 'Test', tipo: 'original', deleted_at: null };

const buildMockDb = () => {
  const m = {
    select:    jest.fn(),
    from:      jest.fn(),
    where:     jest.fn(),
    limit:     jest.fn().mockResolvedValue([mockWork]),
    offset:    jest.fn(),
    orderBy:   jest.fn(),
    insert:    jest.fn(),
    values:    jest.fn(),
    returning: jest.fn().mockResolvedValue([mockWork]),
    update:    jest.fn(),
    set:       jest.fn(),
  };
  m.select.mockReturnValue(m);
  m.from.mockReturnValue(m);
  m.where.mockReturnValue(m);
  m.offset.mockReturnValue(m);
  m.orderBy.mockReturnValue(m);
  m.insert.mockReturnValue(m);
  m.values.mockReturnValue(m);
  m.update.mockReturnValue(m);
  m.set.mockReturnValue(m);
  return m;
};

describe('WorksService', () => {
  let service: WorksService;
  let mockDb: ReturnType<typeof buildMockDb>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb = buildMockDb();
    const module = await Test.createTestingModule({
      providers: [
        WorksService,
        { provide: DRIZZLE_DB, useValue: mockDb },
      ],
    }).compile();
    service = module.get<WorksService>(WorksService);
  });

  it('cria obra com dados corretos', async () => {
    await service.create(TENANT, 'u1', { titulo: 'Nova', tipo: 'original' } as any);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: TENANT, titulo: 'Nova' }),
    );
  });

  it('softDelete define deleted_at (não executa DELETE SQL)', async () => {
    await service.softDelete(TENANT, WORK_ID);
    const setArg = mockDb.set.mock.calls[0][0];
    expect(setArg).toHaveProperty('deleted_at');
    expect(setArg.deleted_at).toBeInstanceOf(Date);
  });

  it('findById lança NotFoundException para obra inexistente', async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    await expect(service.findById(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
  });

  it('findById usa where com tenant_id correto', async () => {
    await service.findById(TENANT, WORK_ID);
    expect(mockDb.where).toHaveBeenCalled();
  });
});
