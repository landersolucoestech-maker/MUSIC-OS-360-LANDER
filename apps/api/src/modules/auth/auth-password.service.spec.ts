import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AuthPasswordService } from './auth-password.service';
import type { JwtAuth } from '../../core/guards/auth.guard';
import type { ChangeRequiredPasswordDto } from './dto/change-required-password.dto';

const updateUserByIdMock = jest.fn();
const signOutAdminMock = jest.fn();
const signInWithPasswordMock = jest.fn();
const signOutAnonMock = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((_url: string, key: string) => {
    if (key === 'anon-key') {
      return {
        auth: {
          signInWithPassword: signInWithPasswordMock,
          signOut: signOutAnonMock,
        },
      };
    }
    return {
      auth: {
        admin: {
          updateUserById: updateUserByIdMock,
          signOut: signOutAdminMock,
        },
      },
    };
  }),
}));

function buildAuth(appMetadata: Record<string, unknown>, email = 'owner@lander.example'): JwtAuth {
  return {
    userId: 'user-1',
    sessionId: 'sess-1',
    orgId: 'org-1',
    orgRole: 'owner',
    claims: { app_metadata: appMetadata, email },
  };
}

const STRONG_PASSWORD = 'Correto-Cavalo9Bateria!';

function dto(newPassword: string, confirmPassword = newPassword): ChangeRequiredPasswordDto {
  return { newPassword, confirmPassword };
}

describe('AuthPasswordService.changeRequiredPassword', () => {
  const fullConfig = {
    get: (key: string) =>
      ({
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        SUPABASE_ANON_KEY: 'anon-key',
      })[key],
  } as any;

  beforeEach(() => {
    updateUserByIdMock.mockReset();
    signOutAdminMock.mockReset().mockResolvedValue({ data: null, error: null });
    signInWithPasswordMock.mockReset().mockResolvedValue({ data: { session: null }, error: { message: 'invalid credentials' } });
    signOutAnonMock.mockReset().mockResolvedValue({ error: null });
  });

  it('rejeita quando newPassword e confirmPassword divergem, sem chamar o Supabase', async () => {
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await expect(
      svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD, 'outra-coisa'), null),
    ).rejects.toThrow(BadRequestException);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejeita senha fraca antes de chamar o Supabase, listando os requisitos pendentes', async () => {
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await expect(
      svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto('fraca123'), null),
    ).rejects.toThrow(BadRequestException);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejeita reutilização da senha provisória atual quando tecnicamente verificável (sign-in de teste bem-sucedido)', async () => {
    signInWithPasswordMock.mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await expect(
      svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), null),
    ).rejects.toThrow(BadRequestException);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(signOutAnonMock).toHaveBeenCalled(); // não deixa a sessão de teste viva
  });

  it('não bloqueia a troca quando a checagem de reuso não é verificável (sem SUPABASE_ANON_KEY)', async () => {
    const configSemAnon = {
      get: (key: string) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' })[key],
    } as any;
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(configSemAnon, null, audit as any);

    await expect(
      svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), null),
    ).resolves.toEqual({ passwordChanged: true, mustRefreshSession: true });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it('troca a senha e limpa must_change_password NA MESMA chamada Admin API, preservando o resto do app_metadata', async () => {
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    const result = await svc.changeRequiredPassword(
      buildAuth({ org_id: 'org-1', role: 'owner', must_change_password: true }),
      'tenant-1',
      dto(STRONG_PASSWORD),
      null,
    );

    expect(result).toEqual({ passwordChanged: true, mustRefreshSession: true });
    expect(updateUserByIdMock).toHaveBeenCalledWith('user-1', {
      password: STRONG_PASSWORD,
      app_metadata: { org_id: 'org-1', role: 'owner', must_change_password: false },
    });
  });

  it('audita user.password_changed somente após sucesso confirmado', async () => {
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), null);

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      orgId: 'org-1',
      userId: 'user-1',
      actorRole: 'owner',
      action: 'user.password_changed',
      entity: 'user',
      entityId: 'user-1',
    }));
  });

  it('se o Supabase rejeitar a troca, must_change_password permanece true (nada muda) e nunca audita', async () => {
    updateUserByIdMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await expect(
      svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), null),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('lança ServiceUnavailableException sem SUPABASE_URL/SERVICE_ROLE_KEY, nunca tenta chamar a API', async () => {
    const emptyConfig = { get: () => undefined } as any;
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(emptyConfig, null, audit as any);

    await expect(
      svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), null),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it('revoga outras sessões via admin.signOut(accessToken, "others") quando um access token é fornecido', async () => {
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), 'current-access-token');

    expect(signOutAdminMock).toHaveBeenCalledWith('current-access-token', 'others');
  });

  it('falha ao revogar outras sessões não derruba o sucesso já confirmado da troca de senha', async () => {
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    signOutAdminMock.mockRejectedValue(new Error('revoke failed'));
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await expect(
      svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), 'token'),
    ).resolves.toEqual({ passwordChanged: true, mustRefreshSession: true });
    expect(audit.log).toHaveBeenCalled();
  });

  it('nunca inclui a senha em texto plano na chamada de auditoria', async () => {
    updateUserByIdMock.mockResolvedValue({ data: {}, error: null });
    const audit = { log: jest.fn() };
    const svc = new AuthPasswordService(fullConfig, null, audit as any);

    await svc.changeRequiredPassword(buildAuth({ must_change_password: true }), 'tenant-1', dto(STRONG_PASSWORD), null);

    const call = audit.log.mock.calls[0][0];
    expect(JSON.stringify(call)).not.toContain(STRONG_PASSWORD);
  });
});
