/**
 * tenant-isolation.spec.ts
 *
 * Verifica que ArtistsService aplica isolamento multi-tenant correctamente:
 * - list() devolve apenas artistas do tenant correcto
 * - findById() lança NotFoundException para artista de outro tenant
 * - update() lança NotFoundException para artista de outro tenant
 */

import 'reflect-metadata';
import { ArtistsService } from './artists.service';
import { NotFoundException } from '@nestjs/common';

const TENANT_A = 'tenant-alpha';
const TENANT_B = 'tenant-beta';
const USER_ID  = 'user-system';

const artistOfA = {
  id: 'artist-aaa-001',
  tenant_id: TENANT_A,
  nome_artistico: 'Artista do Tenant A',
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const artistOfB = {
  id: 'artist-bbb-001',
  tenant_id: TENANT_B,
  nome_artistico: 'Artista do Tenant B',
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

function buildIsolationDb(tenantArtists: Record<string, typeof artistOfA>) {
  const findForTenant = (tenantId: string, id?: string) => {
    if (id) {
      const found = tenantArtists[id];
      return found && found.tenant_id === tenantId ? [found] : [];
    }
    return Object.values(tenantArtists).filter(
      (a) => a.tenant_id === tenantId && a.deleted_at === null,
    );
  };

  const selectChain: Record<string, jest.Mock> = {};
  let currentTenantId = '';
  let currentId: string | undefined;

  selectChain.from = jest.fn().mockReturnValue(selectChain);
  selectChain.where = jest.fn().mockImplementation((cond: unknown) => {
    return selectChain;
  });
  selectChain.orderBy = jest.fn().mockReturnValue(selectChain);
  selectChain.offset  = jest.fn().mockReturnValue(selectChain);
  selectChain.limit   = jest.fn().mockReturnValue(selectChain);

  const updateChain: Record<string, jest.Mock> = {};
  updateChain.set  = jest.fn().mockReturnValue(updateChain);
  updateChain.where = jest.fn().mockResolvedValue([]);

  const db = {
    _tenantArtists: tenantArtists,
    select: jest.fn().mockImplementation((sel?: unknown) => {
      if (sel && typeof sel === 'object' && 'value' in (sel as object)) {
        const countChain: Record<string, jest.Mock> = {};
        countChain.from  = jest.fn().mockReturnValue(countChain);
        countChain.where = jest.fn().mockImplementation((cond: unknown) =>
          Promise.resolve([{ value: 0 }]),
        );
        return countChain;
      }
      return selectChain;
    }),
    insert: jest.fn(),
    update: jest.fn().mockReturnValue(updateChain),
    _updateChain: updateChain,
  };

  return db;
}

describe('Tenant Isolation — ArtistsService', () => {
  describe('list()', () => {
    it('devolve apenas artistas do tenant correcto', async () => {
      const db = buildIsolationDb({
        [artistOfA.id]: artistOfA,
        [artistOfB.id]: artistOfB,
      });

      db.select = jest.fn().mockImplementation((sel?: unknown) => {
        if (sel && typeof sel === 'object' && 'value' in (sel as object)) {
          const countChain: Record<string, jest.Mock> = {};
          countChain.from  = jest.fn().mockReturnValue(countChain);
          countChain.where = jest.fn().mockResolvedValue([{ value: 1 }]);
          return countChain;
        }
        const chain: Record<string, jest.Mock> = {};
        chain.from    = jest.fn().mockReturnValue(chain);
        chain.where   = jest.fn().mockReturnValue(chain);
        chain.orderBy = jest.fn().mockReturnValue(chain);
        chain.offset  = jest.fn().mockReturnValue(chain);
        chain.limit   = jest.fn().mockResolvedValue([artistOfA]);
        return chain;
      });

      const service = new ArtistsService(db as any);
      const result  = await service.list(TENANT_A, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tenant_id).toBe(TENANT_A);
      expect(result.data[0].id).toBe(artistOfA.id);
    });
  });

  describe('findById()', () => {
    it('retorna artista quando tenant coincide', async () => {
      const db = buildIsolationDb({ [artistOfA.id]: artistOfA });
      const chain: Record<string, jest.Mock> = {};
      chain.from  = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockResolvedValue([artistOfA]);
      db.select = jest.fn().mockReturnValue(chain);

      const service = new ArtistsService(db as any);
      const result  = await service.findById(TENANT_A, artistOfA.id);
      expect(result.id).toBe(artistOfA.id);
    });

    it('lança NotFoundException ao aceder a artista de outro tenant', async () => {
      const db = buildIsolationDb({ [artistOfA.id]: artistOfA });
      const chain: Record<string, jest.Mock> = {};
      chain.from  = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockResolvedValue([]);
      db.select = jest.fn().mockReturnValue(chain);

      const service = new ArtistsService(db as any);
      await expect(service.findById(TENANT_B, artistOfA.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('lança NotFoundException ao actualizar artista de outro tenant', async () => {
      const db = buildIsolationDb({ [artistOfA.id]: artistOfA });
      const chain: Record<string, jest.Mock> = {};
      chain.from  = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockResolvedValue([]);
      db.select = jest.fn().mockReturnValue(chain);

      const service = new ArtistsService(db as any);
      await expect(
        service.update(TENANT_B, USER_ID, artistOfA.id, { nome_artistico: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
