import { ForbiddenException } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

/**
 * GAP-06 (product-completion audit): presign() must enforce the tenant's
 * storage-quota plan limit before issuing a presigned upload URL. Guards
 * against the enforcement call being silently dropped in a future refactor.
 */
describe('UploadsController.presign — plan-limit enforcement', () => {
  const TENANT = { id: 'tenant-a' };
  const USER = { userId: 'user-1', orgId: 'org-a' };
  const DTO = {
    category: 'documents',
    fileName: 'a.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  } as never;

  function buildController(enforce: jest.Mock) {
    const repo = { create: jest.fn((v) => v), save: jest.fn().mockResolvedValue(undefined) };
    const ds = { getRepository: jest.fn().mockReturnValue(repo) };
    const storage = {
      createPresignedUpload: jest.fn().mockResolvedValue({
        presignedUrl: 'https://example.test/put',
        key: 'k',
        fileId: 'f',
        publicUrl: 'https://example.test/f',
      }),
    };
    const events = { emitTyped: jest.fn() };
    const planLimit = { enforce };

    const controller = new UploadsController(
      ds as never,
      storage as never,
      events as never,
      planLimit as never,
    );
    return { controller, storage };
  }

  it('checks the "storageGb" plan limit before generating a presigned URL', async () => {
    const enforce = jest.fn().mockRejectedValue(
      new ForbiddenException('Limite do plano atingido para "storageGb".'),
    );
    const { controller, storage } = buildController(enforce);

    await expect(controller.presign(TENANT, USER, DTO)).rejects.toBeInstanceOf(ForbiddenException);

    expect(enforce).toHaveBeenCalledWith('tenant-a', 'org-a', 'storageGb');
    expect(storage.createPresignedUpload).not.toHaveBeenCalled();
  });

  it('proceeds to presign when under the storage quota', async () => {
    const enforce = jest.fn().mockResolvedValue(undefined);
    const { controller, storage } = buildController(enforce);

    const result = await controller.presign(TENANT, USER, DTO);

    expect(result.fileId).toBe('f');
    expect(storage.createPresignedUpload).toHaveBeenCalled();
  });
});
