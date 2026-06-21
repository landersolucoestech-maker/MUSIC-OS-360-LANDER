import { AssetLinkingHandler } from './asset-linking.handler';

/** P2-9 — context propagation + fail-closed for the asset-linking handler (via service). */
describe('AssetLinkingHandler — P2-9', () => {
  function build() {
    const assetLinking = { processUpload: jest.fn().mockResolvedValue(undefined) };
    const dbContext = { runInTenantContext: jest.fn((_c: unknown, w: () => unknown) => w()) };
    const handler = new AssetLinkingHandler(assetLinking as any, dbContext as any);
    return { handler, assetLinking, dbContext };
  }

  const payload = { uploadId: 'up1', tenantId: 't1' };

  it('tenantId válido → processa dentro de runInTenantContext', async () => {
    const { handler, assetLinking, dbContext } = build();
    await handler.onAssetUploaded({ tenantId: 't1', payload, correlationId: null } as any);
    expect(dbContext.runInTenantContext).toHaveBeenCalledWith({ tenantId: 't1', orgId: null, role: null }, expect.any(Function));
    expect(assetLinking.processUpload).toHaveBeenCalledWith(payload);
  });

  it('usa tenantId do payload quando o evento não tem top-level tenantId', async () => {
    const { handler, dbContext } = build();
    await handler.onAssetUploaded({ payload, correlationId: null } as any);
    expect(dbContext.runInTenantContext).toHaveBeenCalledWith({ tenantId: 't1', orgId: null, role: null }, expect.any(Function));
  });

  it('tenantId ausente → aborta (fail-closed), service não é chamado', async () => {
    const { handler, assetLinking, dbContext } = build();
    await handler.onAssetUploaded({ payload: { uploadId: 'up1' }, correlationId: null } as any);
    expect(dbContext.runInTenantContext).not.toHaveBeenCalled();
    expect(assetLinking.processUpload).not.toHaveBeenCalled();
  });

  it('DatabaseContextService ausente → aborta (fail-closed), service não é chamado', async () => {
    const assetLinking = { processUpload: jest.fn().mockResolvedValue(undefined) };
    const handler = new AssetLinkingHandler(assetLinking as any, undefined);

    await handler.onAssetUploaded({ tenantId: 't1', payload, correlationId: null } as any);

    expect(assetLinking.processUpload).not.toHaveBeenCalled();
  });
});
