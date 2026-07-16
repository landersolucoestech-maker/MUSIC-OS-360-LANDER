import 'reflect-metadata';
import { Test }              from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance }   from 'class-transformer';
import { validate }          from 'class-validator';
import { PhonogramsService } from './phonograms.service';
import { CreatePhonogramDto } from './dto/create-phonogram.dto';
import { DATA_SOURCE }       from '../../database/database.module';
import { EventsService }     from '../../core/events/events.service';

async function validateDto(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreatePhonogramDto, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

const TENANT = 'tenant-test';
const PHONO_ID = 'phono-test';
const mockPhono = { id: PHONO_ID, tenant_id: TENANT, titulo: 'Test', tipo: 'master', deleted_at: null };

const buildMockQb = (getOneValue: any = mockPhono) => {
  const qb: any = {
    where:           jest.fn(),
    andWhere:        jest.fn(),
    getOne:          jest.fn().mockResolvedValue(getOneValue),
    getManyAndCount: jest.fn().mockResolvedValue([[mockPhono], 1]),
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

const buildMockDs = (getOneValue: any = mockPhono) => {
  const qb   = buildMockQb(getOneValue);
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    create: jest.fn((v: any) => v),
    save:   jest.fn((v: any) => Promise.resolve({ id: PHONO_ID, ...v })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    _qb: qb,
  };
  return {
    getRepository: jest.fn(() => repo),
    _repo: repo,
  };
};

describe('PhonogramsService — Estado B (pré-C2, comportamento atual documentado)', () => {
  let service: PhonogramsService;
  let mockDs: ReturnType<typeof buildMockDs>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDs = buildMockDs();
    const module = await Test.createTestingModule({
      providers: [
        PhonogramsService,
        { provide: DATA_SOURCE, useValue: mockDs },
        { provide: EventsService, useValue: { emitTyped: jest.fn() } },
      ],
    }).compile();
    service = module.get<PhonogramsService>(PhonogramsService);
  });

  describe('CreatePhonogramDto — validação', () => {
    const realFormPayload = {
      titulo: 'Noite Estrelada',
      obra_id: '123e4567-e89b-12d3-a456-426614174000',
      artista_id: '223e4567-e89b-12d3-a456-426614174000',
      cod_abramus: null,
      cod_ecad: null,
      agregadora: null,
      isrc_pais: 'BR',
      isrc_registrante: 'ABC',
      isrc_ano: '25',
      isrc_designacao: '12345',
      criada_por_ia: false,
      instrumental: false,
      nacional: true,
      pub_simultanea: false,
      emissao: null,
      gravacao_original: null,
      data_lancamento: null,
      duracao: '03:30',
      duracao_min: 3,
      duracao_seg: 30,
      midia: null,
      classificacao: null,
      pais_origem: null,
      pais_publicacao: null,
      gravadora: null,
      observacoes: null,
      status: 'pendente',
      participacao: null,
      arquivo_audio: null,
    };

    it('aceita o payload PT-BR real do frontend (todos os 21 campos físicos da migration)', async () => {
      const errors = await validateDto(realFormPayload);
      expect(errors).toEqual([]);
    });

    it('ainda aceita o payload EN legado (title/workId/artistId)', async () => {
      const errors = await validateDto({
        title: 'Noite Estrelada',
        workId: '123e4567-e89b-12d3-a456-426614174000',
        artistId: '223e4567-e89b-12d3-a456-426614174000',
      });
      expect(errors).toEqual([]);
    });

    it('rejeita campo desconhecido (whitelist)', async () => {
      const errors = await validateDto({ titulo: 'X', campo_inexistente: 'y' });
      expect(errors.some((e) => e.property === 'campo_inexistente')).toBe(true);
    });
  });

  describe('create() — obrigatoriedade de título', () => {
    it('lança BadRequestException quando titulo e title estão ausentes, sem chamar o repositório', async () => {
      await expect(
        service.create(TENANT, 'u1', {} as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockDs._repo.save).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando titulo e title são strings em branco', async () => {
      await expect(
        service.create(TENANT, 'u1', { titulo: '   ', title: '' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockDs._repo.save).not.toHaveBeenCalled();
    });
  });

  describe('create() — precedência atual PT/EN (comportamento documentado, não corrigido nesta fase)', () => {
    it('titulo (PT) sozinho é persistido', async () => {
      await service.create(TENANT, 'u1', { titulo: 'Nome PT' } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Nome PT' }),
      );
    });

    it('title (EN) sozinho é persistido em titulo', async () => {
      await service.create(TENANT, 'u1', { title: 'Nome EN' } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Nome EN' }),
      );
    });

    it('quando ambos presentes e diferentes, PT vence silenciosamente (sem erro, sem log)', async () => {
      await service.create(TENANT, 'u1', { titulo: 'Nome PT', title: 'Nome EN' } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Nome PT' }),
      );
    });

    it('obra_id (PT) e workId (EN) — PT vence quando ambos presentes', async () => {
      await service.create(TENANT, 'u1', {
        titulo: 'X', obra_id: 'obra-pt', workId: 'obra-en',
      } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ obra_id: 'obra-pt' }),
      );
    });

    it('artista_id (PT) e artistId (EN) — PT vence quando ambos presentes', async () => {
      await service.create(TENANT, 'u1', {
        titulo: 'X', artista_id: 'artista-pt', artistId: 'artista-en',
      } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ artista_id: 'artista-pt' }),
      );
    });

    it('titulo ausente + title=valor → titulo persistido com o valor de title (comportamento atual do "??")', async () => {
      await service.create(TENANT, 'u1', { title: 'ok', titulo: undefined } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'ok' }),
      );
    });
  });

  describe('create() — tipo default aplicado somente no create', () => {
    it("aplica tipo='master' quando o DTO não envia tipo", async () => {
      await service.create(TENANT, 'u1', { titulo: 'X' } as any);
      expect(mockDs._repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'master' }),
      );
    });

    it('resposta do create não contém aliases EN (title/workId/artistId/duration/fileUrl)', async () => {
      await service.create(TENANT, 'u1', {
        titulo: 'X', title: 'Y', obra_id: 'o1', workId: 'o2',
        artista_id: 'a1', artistId: 'a2', duration: 120, fileUrl: 'x.mp3',
      } as any);
      const created = mockDs._repo.create.mock.calls[0][0];
      expect(created).not.toHaveProperty('title');
      expect(created).not.toHaveProperty('workId');
      expect(created).not.toHaveProperty('artistId');
      expect(created).not.toHaveProperty('duration');
      expect(created).not.toHaveProperty('fileUrl');
    });
  });

  describe('update() — PATCH parcial não sobrescreve tipo', () => {
    it('não inclui tipo no payload de update quando o DTO não o envia', async () => {
      await service.update(TENANT, 'u1', PHONO_ID, { observacoes: 'x' } as any);
      const updateCall = mockDs._repo.update.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty('tipo');
    });

    it('preserva tipo enviado explicitamente no update', async () => {
      await service.update(TENANT, 'u1', PHONO_ID, { tipo: 'remix' } as any);
      const updateCall = mockDs._repo.update.mock.calls[0];
      expect(updateCall[1]).toHaveProperty('tipo', 'remix');
    });
  });

  it('findById lança NotFoundException para fonograma inexistente', async () => {
    mockDs._repo._qb.getOne.mockResolvedValueOnce(null);
    await expect(service.findById(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
  });
});
