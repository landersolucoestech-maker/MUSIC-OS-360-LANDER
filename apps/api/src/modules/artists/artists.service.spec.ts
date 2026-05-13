import 'reflect-metadata';
import { ArtistsService } from './artists.service';
import { NotFoundException } from '@nestjs/common';

function makeChainable(finalResult: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'offset', 'limit', 'insert', 'values', 'returning', 'update', 'set'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  (chain as Record<string, unknown>)['then'] = undefined;
  return { chain, finalResult };
}

function buildMockDb() {
  const selectChain: Record<string, jest.Mock> = {};
  const selectMethods = ['from', 'where', 'orderBy', 'offset', 'limit'];
  selectMethods.forEach((m) => {
    selectChain[m] = jest.fn().mockReturnValue(selectChain);
  });

  const insertChain: Record<string, jest.Mock> = {};
  ['values', 'returning'].forEach((m) => {
    insertChain[m] = jest.fn().mockReturnValue(insertChain);
  });

  const updateChain: Record<string, jest.Mock> = {};
  ['set', 'where', 'returning'].forEach((m) => {
    updateChain[m] = jest.fn().mockReturnValue(updateChain);
  });

  const db = {
    select: jest.fn().mockReturnValue(selectChain),
    insert: jest.fn().mockReturnValue(insertChain),
    update: jest.fn().mockReturnValue(updateChain),
    _selectChain: selectChain,
    _insertChain: insertChain,
    _updateChain: updateChain,
  };

  return db;
}

describe('ArtistsService', () => {
  const TENANT_A = 'tenant-aaa';
  const TENANT_B = 'tenant-bbb';
  const USER_ID  = 'user-111';

  const artistA = {
    id: 'artist-001',
    tenant_id: TENANT_A,
    nome_artistico: 'Artista Alpha',
    deleted_at: null,
    created_at: new Date(),
  };

  it('list() retorna artistas filtrados pelo tenant correcto', async () => {
    const db = buildMockDb();
    db._selectChain.limit = jest.fn().mockResolvedValue([artistA]);
    db.select = jest.fn().mockImplementation((sel?: unknown) => {
      if (sel && typeof sel === 'object' && 'value' in (sel as object)) {
        const countChain: Record<string, jest.Mock> = {};
        ['from', 'where'].forEach((m) => {
          countChain[m] = jest.fn().mockReturnValue(countChain);
        });
        countChain['where'] = jest.fn().mockResolvedValue([{ value: 1 }]);
        return countChain;
      }
      return db._selectChain;
    });

    db._selectChain.from = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.orderBy = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.offset = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit = jest.fn().mockResolvedValue([artistA]);

    const service = new ArtistsService(db as any);
    const result = await service.list(TENANT_A, {});
    expect(result.data).toEqual([artistA]);
    expect(result.meta.total).toBe(1);
  });

  it('findById() retorna artista quando pertence ao tenant', async () => {
    const db = buildMockDb();
    db._selectChain.from = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit = jest.fn().mockResolvedValue([artistA]);

    const service = new ArtistsService(db as any);
    const result = await service.findById(TENANT_A, 'artist-001');
    expect(result).toEqual(artistA);
  });

  it('findById() lança NotFoundException para artista de outro tenant', async () => {
    const db = buildMockDb();
    db._selectChain.from = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit = jest.fn().mockResolvedValue([]);

    const service = new ArtistsService(db as any);
    await expect(service.findById(TENANT_B, 'artist-001')).rejects.toThrow(NotFoundException);
  });

  it('create() insere com o tenant_id correcto', async () => {
    const db = buildMockDb();
    const created = { ...artistA, nome_artistico: 'Novo Artista' };
    db._insertChain.values = jest.fn().mockReturnValue(db._insertChain);
    db._insertChain.returning = jest.fn().mockResolvedValue([created]);

    const service = new ArtistsService(db as any);
    const result = await service.create(TENANT_A, USER_ID, {
      nome_artistico: 'Novo Artista',
    });
    expect(result.tenant_id).toBe(TENANT_A);
    expect(db.insert).toHaveBeenCalled();
    expect(db._insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: TENANT_A }),
    );
  });

  it('softDelete() define deleted_at (não apaga fisicamente)', async () => {
    const db = buildMockDb();
    db._selectChain.from = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit = jest.fn().mockResolvedValue([artistA]);

    db._updateChain.set = jest.fn().mockReturnValue(db._updateChain);
    db._updateChain.where = jest.fn().mockResolvedValue([]);

    const service = new ArtistsService(db as any);
    const result = await service.softDelete(TENANT_A, 'artist-001');
    expect(result).toEqual({ deleted: true });
    expect(db.update).toHaveBeenCalled();
    expect(db._updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(Date) }),
    );
  });
});
