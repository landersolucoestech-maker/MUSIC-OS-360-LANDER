import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { LicensingService } from './licensing.service';
import type { CreateLicenseDto } from './dto/licensing.dto';

/**
 * P1: create() accepted obra_id/artista_id/cliente_id from the DTO with no
 * check that the referenced row belongs to the same tenant. No read-side
 * leak (every list/get still filters by the license's own tenant_id), but
 * a tenant could create a license dangling-referencing another tenant's
 * work/artist/client.
 */
function makeService(queryImpl: jest.Mock) {
  const repo = {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn(async (entity: unknown) => ({ id: 'license-new', ...(entity as object) })),
  };
  const ds = { getRepository: jest.fn(() => repo), query: queryImpl } as never;
  return new LicensingService(ds);
}

describe('LicensingService.create — FK cross-tenant (P1)', () => {
  it('rejeita obra_id de outro tenant (ou inexistente)', async () => {
    const svc = makeService(jest.fn(async () => []));
    await expect(svc.create('tenant-1', 'user-1', {
      obra_id: 'work-from-another-tenant', titulo: 'X',
    } as unknown as CreateLicenseDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita artista_id de outro tenant (ou inexistente)', async () => {
    const svc = makeService(jest.fn(async () => []));
    await expect(svc.create('tenant-1', 'user-1', {
      artista_id: 'artist-from-another-tenant', titulo: 'X',
    } as unknown as CreateLicenseDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita cliente_id de outro tenant (ou inexistente)', async () => {
    const svc = makeService(jest.fn(async () => []));
    await expect(svc.create('tenant-1', 'user-1', {
      cliente_id: 'client-from-another-tenant', titulo: 'X',
    } as unknown as CreateLicenseDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite quando todas as referências pertencem ao tenant', async () => {
    const svc = makeService(jest.fn(async () => [{ exists: 1 }]));
    await expect(svc.create('tenant-1', 'user-1', {
      obra_id: 'work-1', artista_id: 'artist-1', cliente_id: 'client-1', titulo: 'X',
    } as unknown as CreateLicenseDto)).resolves.toBeDefined();
  });

  it('não consulta nada quando nenhuma referência é enviada', async () => {
    const queryImpl = jest.fn(async () => [{ exists: 1 }]);
    const svc = makeService(queryImpl);
    await svc.create('tenant-1', 'user-1', { titulo: 'X' } as unknown as CreateLicenseDto);
    expect(queryImpl).not.toHaveBeenCalled();
  });
});
