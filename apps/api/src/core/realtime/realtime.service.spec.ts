import 'reflect-metadata';
import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';

jest.mock('@supabase/supabase-js', () => {
  const send = jest.fn().mockResolvedValue(undefined);
  const subscribe = jest.fn((cb: (status: string) => void) => {
    cb('SUBSCRIBED');
    return { send };
  });
  const channel = jest.fn(() => ({ subscribe, send }));
  const removeChannel = jest.fn();
  const removeAllChannels = jest.fn();
  const ctor = jest.fn(() => ({ channel, removeChannel, removeAllChannels }));
  return { createClient: ctor, __channel: channel, __send: send };
});

import { RealtimeService } from './realtime.service';

function channelMock() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@supabase/supabase-js').__channel as jest.Mock;
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Regressão: RealtimeService.sendToTenant recebia tenants.id (PK) de todos os
 * callers e publicava em `tenant:<tenants.id>` — mas a policy RLS de autorização
 * do canal (20260801000001_RealtimeBroadcastAuthorization) e o frontend
 * (ws-client.ts) autorizam/assinam `tenant:<org_id>`. Broadcasts nunca chegavam.
 * O fix resolve tenants.id -> tenants.org_id internamente antes de publicar, sem
 * exigir que nenhum caller mude — este teste prova que o tópico publicado usa
 * org_id, não o tenantId passado pelo caller.
 */
describe('RealtimeService — canonical tenant topic (tenants.id -> org_id)', () => {
  function makeService(tenantRow: { org_id: string } | null = { org_id: 'org-xyz-canonical' }) {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key';
        return undefined;
      }),
    } as unknown as ConfigService;

    const findOne = jest.fn().mockResolvedValue(tenantRow);
    const tenantRepo = { findOne };
    const ds = { getRepository: jest.fn(() => tenantRepo) } as unknown as DataSource;

    return { service: new RealtimeService(config, ds), findOne };
  }

  beforeEach(() => jest.clearAllMocks());

  it('sendToTenant publica em tenant:<org_id>, nunca em tenant:<tenants.id>', async () => {
    const { service, findOne } = makeService({ org_id: 'org-xyz-canonical' });

    service.sendToTenant('tenant-pk-123', 'conversation:message', { hello: 'world' });
    await flush();

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tenant-pk-123' } }));
    expect(channelMock()).toHaveBeenCalledWith('tenant:org-xyz-canonical', expect.anything());
    expect(channelMock()).not.toHaveBeenCalledWith('tenant:tenant-pk-123', expect.anything());
  });

  it('resolve org_id apenas uma vez por tenant (cache) em chamadas subsequentes', async () => {
    const { service, findOne } = makeService({ org_id: 'org-cached' });

    service.sendToTenant('tenant-1', 'conversation:created', {});
    await flush();
    service.sendToTenant('tenant-1', 'conversation:updated', {});
    await flush();

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(channelMock()).toHaveBeenCalledWith('tenant:org-cached', expect.anything());
  });

  it('tenant inexistente: não publica em um tópico com o tenantId cru como fallback', async () => {
    const { service } = makeService(null);

    service.sendToTenant('tenant-desconhecido', 'conversation:message', {});
    await flush();

    expect(channelMock()).not.toHaveBeenCalledWith('tenant:tenant-desconhecido', expect.anything());
    expect(channelMock()).not.toHaveBeenCalled();
  });

  it('sendToUser publica no canal do usuário com o id literal E no tenant:<org_id> resolvido', async () => {
    const { service } = makeService({ org_id: 'org-for-user' });

    service.sendToUser('tenant-pk-999', 'user-abc', 'notification:new', {});
    await flush();

    expect(channelMock()).toHaveBeenCalledWith('user:user-abc', expect.anything());
    expect(channelMock()).toHaveBeenCalledWith('tenant:org-for-user', expect.anything());
  });

  it('sendToUserOnly publica apenas no canal do usuário, nunca no canal do tenant (evento privado ponto-a-ponto)', async () => {
    const { service } = makeService({ org_id: 'org-for-user' });

    service.sendToUserOnly('user-abc', 'internalConversation:message', {});
    await flush();

    expect(channelMock()).toHaveBeenCalledWith('user:user-abc', expect.anything());
    expect(channelMock()).not.toHaveBeenCalledWith('tenant:org-for-user', expect.anything());
  });
});
