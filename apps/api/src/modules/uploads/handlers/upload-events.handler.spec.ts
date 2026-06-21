import { UploadEventsHandler } from './upload-events.handler';

/** P2-9 — context propagation + fail-closed for the asset-uploaded handler. */
describe('UploadEventsHandler — P2-9', () => {
  function build() {
    const uploadRepo = {
      findOne: jest.fn().mockResolvedValue({ size_bytes: 1024, mime_type: 'audio/mpeg' }),
      update: jest.fn().mockResolvedValue({}),
    };
    const ds = { getRepository: jest.fn(() => uploadRepo) };
    const queue = { addNotification: jest.fn().mockResolvedValue(undefined) };
    const dbContext = { runInTenantContext: jest.fn((_c: unknown, w: (m: unknown) => unknown) => w(undefined)) };
    const handler = new UploadEventsHandler(ds as any, queue as any, dbContext as any);
    return { handler, uploadRepo, queue, dbContext };
  }

  const basePayload = {
    uploadId: 'up1', tenantId: 't1', entityType: 'artist', entityId: 'a1',
    fileName: 'song.mp3', mimeType: 'audio/mpeg', uploadedBy: 'u1',
  };

  it('tenantId válido → executa dentro de runInTenantContext e confirma upload', async () => {
    const { handler, uploadRepo, dbContext } = build();
    await handler.onAssetUploaded({ payload: basePayload, correlationId: null } as any);
    expect(dbContext.runInTenantContext).toHaveBeenCalledWith({ tenantId: 't1', orgId: null, role: null }, expect.any(Function));
    expect(uploadRepo.update).toHaveBeenCalledWith(
      { id: 'up1', tenant_id: 't1' },
      { status: 'confirmed' },
    );
  });

  it('tenantId ausente → aborta (fail-closed), não toca banco', async () => {
    const { handler, uploadRepo, dbContext } = build();
    await handler.onAssetUploaded({ payload: { ...basePayload, tenantId: undefined }, correlationId: null } as any);
    expect(dbContext.runInTenantContext).not.toHaveBeenCalled();
    expect(uploadRepo.findOne).not.toHaveBeenCalled();
    expect(uploadRepo.update).not.toHaveBeenCalled();
  });
});
