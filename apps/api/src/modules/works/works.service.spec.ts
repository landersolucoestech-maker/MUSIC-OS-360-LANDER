import 'reflect-metadata';
import { Test }              from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance }   from 'class-transformer';
import { validate }          from 'class-validator';
import { WorksService }      from './works.service';
import { CreateWorkDto }     from './dto/create-work.dto';
import { DATA_SOURCE }       from '../../database/database.module';
import { EventsService }     from '../../core/events/events.service';

async function validateDto(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreateWorkDto, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

const TENANT  = 'tenant-test';
const WORK_ID = 'work-test';
const mockWork = { id: WORK_ID, tenant_id: TENANT, titulo: 'Test', tipo: 'original', deleted_at: null };

const buildMockQb = (getOneValue: any = mockWork) => {
  const qb: any = {
    where:           jest.fn(),
    andWhere:        jest.fn(),
    getOne:          jest.fn().mockResolvedValue(getOneValue),
    getMany:         jest.fn().mockResolvedValue([mockWork]),
    getManyAndCount: jest.fn().mockResolvedValue([[mockWork], 1]),
    skip:            jest.fn(),
    take:            jest.fn(),
    orderBy:         jest.fn(),
    update:          jest.fn(),
    set:             jest.fn(),
    execute:         jest.fn().mockResolvedValue({ affected: 1 }),
  };
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.skip.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.update.mockReturnValue(qb);
  qb.set.mockReturnValue(qb);
  return qb;
};

const buildMockDs = (getOneValue: any = mockWork) => {
  const qb   = buildMockQb(getOneValue);
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    create: jest.fn((v: any) => v),
    save:   jest.fn((v: any) => Promise.resolve({ id: WORK_ID, ...v })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    _qb: qb,
  };
  return {
    getRepository: jest.fn(() => repo),
    _repo: repo,
  };
};

describe('WorksService', () => {
  let service: WorksService;
  let mockDs: ReturnType<typeof buildMockDs>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDs = buildMockDs();
    const module = await Test.createTestingModule({
      providers: [
        WorksService,
        { provide: DATA_SOURCE, useValue: mockDs },
        { provide: EventsService, useValue: { emitTyped: jest.fn() } },
      ],
    }).compile();
    service = module.get<WorksService>(WorksService);
  });

  it('cria obra com dados corretos', async () => {
    await service.create(TENANT, 'u1', { titulo: 'Nova', tipo: 'original' } as any);
    expect(mockDs._repo.save).toHaveBeenCalled();
    expect(mockDs._repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: TENANT, titulo: 'Nova' }),
    );
  });

  it('softDelete define deleted_at (não executa DELETE SQL)', async () => {
    await service.softDelete(TENANT, WORK_ID);
    expect(mockDs._repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: WORK_ID, tenant_id: TENANT }),
      expect.objectContaining({ deleted_at: expect.any(Date) }),
    );
  });

  it('findById lança NotFoundException para obra inexistente', async () => {
    mockDs._repo._qb.getOne.mockResolvedValueOnce(null);
    await expect(service.findById(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
  });

  it('findById usa where com tenant_id correto', async () => {
    await service.findById(TENANT, WORK_ID);
    expect(mockDs._repo._qb.where).toHaveBeenCalled();
  });

  describe('CreateWorkDto — payload real do formulário (Estado B, pré-C2)', () => {
    const realFormPayload = {
      titulo: 'Minha Obra',
      genero: 'pop',
      idioma: 'pt',
      cod_abramus: null,
      cod_ecad: null,
      duracao: '03:30',
      instrumental: 'nao',
      criada_por_ia: false,
      tipo_ia: null,
      ia_harmonia: null,
      ia_melodia: null,
      ia_letra: null,
      outros_titulos: null,
      referencias_conexas: null,
      letra_completa: null,
      participantes: null,
      status: 'pendente',
      compositores: ['Fulano'],
      letristas: null,
      projeto_id: '123e4567-e89b-12d3-a456-426614174000',
      artista_id: null,
      tipo_obra: 'musica',
    };

    it('aceita o payload real do frontend (formToObraPayload), incluindo projeto_id', async () => {
      const errors = await validateDto(realFormPayload);
      expect(errors).toEqual([]);
    });

    it('rejeita projeto_id com UUID inválido', async () => {
      const errors = await validateDto({ ...realFormPayload, projeto_id: 'nao-e-uuid' });
      expect(errors.some((e) => e.property === 'projeto_id')).toBe(true);
    });

    it('rejeita campo desconhecido (whitelist)', async () => {
      const errors = await validateDto({ ...realFormPayload, campo_inexistente: 'x' });
      expect(errors.some((e) => e.property === 'campo_inexistente')).toBe(true);
    });
  });

  describe('create() — fallback de tipo (works.tipo é NOT NULL)', () => {
    it('usa tipo_obra quando tipo está ausente', async () => {
      await service.create(TENANT, 'u1', { titulo: 'Nova', tipo_obra: 'musica' } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'musica' }),
      );
    });

    it('usa composicao quando tipo e tipo_obra estão ausentes', async () => {
      await service.create(TENANT, 'u1', { titulo: 'Nova' } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'composicao' }),
      );
    });

    it('tipo explícito vence sobre tipo_obra quando ambos presentes', async () => {
      await service.create(TENANT, 'u1', { titulo: 'Nova', tipo: 'original', tipo_obra: 'musica' } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'original' }),
      );
    });

    it('persiste compositores como array', async () => {
      await service.create(TENANT, 'u1', { titulo: 'Nova', tipo: 'original', compositores: ['A', 'B'] } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ compositores: ['A', 'B'] }),
      );
    });
  });

  describe('update() — PATCH parcial não força default de tipo', () => {
    it('não inclui tipo no payload de update quando o DTO não o envia', async () => {
      await service.update(TENANT, 'u1', WORK_ID, { observacoes: 'x' } as any);
      const updateCall = mockDs._repo.update.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty('tipo');
    });
  });
});
