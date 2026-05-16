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
import { EncryptionService } from '../../core/security/encryption.service';
import { EventsService } from '../../core/events/events.service';
import { NotFoundException } from '@nestjs/common';

function makeEventsMock() {
  return {
    emit:      jest.fn(),
    emitAsync: jest.fn().mockResolvedValue([]),
    on:        jest.fn(),
    off:       jest.fn(),
  } as unknown as EventsService;
}

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

function makeEncryptionMock(): jest.Mocked<EncryptionService> {
  return {
    encrypt:         jest.fn().mockImplementation((v: string) => `enc:${v}`),
    decrypt:         jest.fn().mockImplementation((v: string) => v.replace('enc:', '')),
    encryptNullable: jest.fn().mockImplementation((v: string | null | undefined) =>
      v == null || v === '' ? null : `enc:${v}`,
    ),
    decryptNullable: jest.fn().mockReturnValue(null),
  } as unknown as jest.Mocked<EncryptionService>;
}

describe('Tenant Isolation — ArtistsService', () => {
  describe('list()', () => {
    it('devolve apenas artistas do tenant correcto', async () => {
      const enc = makeEncryptionMock();

      const db = {
        select: jest.fn().mockImplementation((sel?: unknown) => {
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
        }),
        insert: jest.fn(),
        update: jest.fn(),
      };

      const service = new ArtistsService(db as any, enc, makeEventsMock());
      const result  = await service.list(TENANT_A, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tenant_id).toBe(TENANT_A);
      expect(result.data[0].id).toBe(artistOfA.id);
    });
  });

  describe('findById()', () => {
    it('retorna artista quando tenant coincide', async () => {
      const enc = makeEncryptionMock();
      const chain: Record<string, jest.Mock> = {};
      chain.from  = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockResolvedValue([artistOfA]);

      const db = { select: jest.fn().mockReturnValue(chain), insert: jest.fn(), update: jest.fn() };

      const service = new ArtistsService(db as any, enc, makeEventsMock());
      const result  = await service.findById(TENANT_A, artistOfA.id);
      expect(result.id).toBe(artistOfA.id);
    });

    it('lança NotFoundException ao aceder a artista de outro tenant', async () => {
      const enc = makeEncryptionMock();
      const chain: Record<string, jest.Mock> = {};
      chain.from  = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockResolvedValue([]);

      const db = { select: jest.fn().mockReturnValue(chain), insert: jest.fn(), update: jest.fn() };

      const service = new ArtistsService(db as any, enc, makeEventsMock());
      await expect(service.findById(TENANT_B, artistOfA.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('lança NotFoundException ao actualizar artista de outro tenant', async () => {
      const enc = makeEncryptionMock();
      const chain: Record<string, jest.Mock> = {};
      chain.from  = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.limit = jest.fn().mockResolvedValue([]);

      const db = { select: jest.fn().mockReturnValue(chain), insert: jest.fn(), update: jest.fn() };

      const service = new ArtistsService(db as any, enc, makeEventsMock());
      await expect(
        service.update(TENANT_B, USER_ID, artistOfA.id, { nome_artistico: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
