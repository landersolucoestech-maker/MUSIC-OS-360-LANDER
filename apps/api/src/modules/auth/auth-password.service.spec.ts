import { ServiceUnavailableException } from '@nestjs/common';
import { AuthPasswordService } from './auth-password.service';
import type { JwtAuth } from '../../core/guards/auth.guard';

const updateUserByIdMock = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { admin: { updateUserById: updateUserByIdMock } },
  })),
}));

function buildAuth(appMetadata: Record<string, unknown>): JwtAuth {
  return {
    userId: 'user-1',
    sessionId: 'sess-1',
    orgId: 'org-1',
    orgRole: 'owner',
    claims: { app_metadata: appMetadata },
  };
}

describe('AuthPasswordService.clearMustChangePassword', () => {
  const config = { get: (key: string) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' }[key]) } as any;

  beforeEach(() => {
    updateUserByIdMock.mockReset();
  });

  it('é um no-op idempotente quando must_change_password já não é true', async () => {
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(config, null, audit as any);

    await svc.clearMustChangePassword(buildAuth({ org_id: 'org-1', role: 'owner' }), 'tenant-1');

    expect(updateUserByIdMock).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('limpa a flag via updateUserById preservando o resto do app_metadata, e audita', async () => {
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(config, null, audit as any);

    await svc.clearMustChangePassword(buildAuth({ org_id: 'org-1', role: 'owner', must_change_password: true }), 'tenant-1');

    expect(updateUserByIdMock).toHaveBeenCalledWith('user-1', {
      app_metadata: { org_id: 'org-1', role: 'owner', must_change_password: false },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'user.password_changed',
      entity: 'user',
      entityId: 'user-1',
    }));
  });

  it('propaga falha da Supabase Admin API como ServiceUnavailableException e nunca audita um sucesso falso', async () => {
    updateUserByIdMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(config, null, audit as any);

    await expect(
      svc.clearMustChangePassword(buildAuth({ must_change_password: true }), 'tenant-1'),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('lança ServiceUnavailableException sem SUPABASE_URL/SERVICE_ROLE_KEY, nunca tenta chamar a API', async () => {
    const emptyConfig = { get: () => undefined } as any;
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(emptyConfig, null, audit as any);

    await expect(
      svc.clearMustChangePassword(buildAuth({ must_change_password: true }), 'tenant-1'),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });
});
