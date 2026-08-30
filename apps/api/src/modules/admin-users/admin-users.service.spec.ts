import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { AdminUsersService } from './admin-users.service';

jest.mock('@supabase/supabase-js', () => {
  const listUsers = jest.fn();
  const ctor = jest.fn(() => ({ auth: { admin: { listUsers } } }));
  return { createClient: ctor, __listUsers: listUsers };
});

const listUsersMock = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@supabase/supabase-js').__listUsers as jest.Mock;
};

/**
 * Decision Gate item 6 (GAP-07): Admin Users precisa de MFA/last-login reais sem
 * N+1 por usuário — listUsers() paginado uma vez, com cache curto, montado num Map.
 */
function makeService() {
  const ds = { query: jest.fn().mockResolvedValue([]) };
  const config = { getOrThrow: jest.fn((k: string) => `fake-${k}`) };
  const svc = new AdminUsersService(ds as never, config as unknown as ConfigService);
  return { svc, ds };
}

describe('AdminUsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('junta org_members + tenants + roles e enriquece com MFA/last_login por auth_user_id', async () => {
    const { svc, ds } = makeService();
    ds.query.mockResolvedValueOnce([
      {
        id: 'm1', auth_user_id: 'auth-1', name: 'Ana', email: 'ana@x.com',
        role_slug: 'admin', role_name: 'Administrador', tenant_id: 't1', tenant_name: 'Tenant 1',
        status: 'active', joined_at: '2026-01-01T00:00:00Z',
      },
    ]);
    listUsersMock().mockResolvedValueOnce({
      data: { users: [{ id: 'auth-1', last_sign_in_at: '2026-08-01T00:00:00Z', factors: [{ status: 'verified' }] }] },
      error: null,
    });

    const result = await svc.list({});

    expect(result).toEqual([
      expect.objectContaining({
        id: 'm1', last_login: '2026-08-01T00:00:00Z', mfa_enabled: true, sessions_count: null,
      }),
    ]);
  });

  it('nunca fabrica sessions_count — sempre null mesmo com auth resolvido', async () => {
    const { svc, ds } = makeService();
    ds.query.mockResolvedValueOnce([
      { id: 'm1', auth_user_id: 'auth-1', name: 'Ana', email: 'ana@x.com', role_slug: 'admin', role_name: 'Administrador', tenant_id: 't1', tenant_name: 'T1', status: 'active', joined_at: null },
    ]);
    listUsersMock().mockResolvedValueOnce({ data: { users: [{ id: 'auth-1', last_sign_in_at: null, factors: [] }] }, error: null });

    const [row] = await svc.list({});
    expect(row!.sessions_count).toBeNull();
  });

  it('marca MFA/last_login como indisponível (null) quando o membro não aparece no auth', async () => {
    const { svc, ds } = makeService();
    ds.query.mockResolvedValueOnce([
      { id: 'm1', auth_user_id: 'auth-orphan', name: 'Ana', email: 'ana@x.com', role_slug: 'admin', role_name: 'Administrador', tenant_id: 't1', tenant_name: 'T1', status: 'active', joined_at: null },
    ]);
    listUsersMock().mockResolvedValueOnce({ data: { users: [] }, error: null });

    const [row] = await svc.list({});
    expect(row!.last_login).toBeNull();
    expect(row!.mfa_enabled).toBeNull();
  });

  it('não fabrica dados quando listUsers falha — segue com auth indisponível para todos', async () => {
    const { svc, ds } = makeService();
    ds.query.mockResolvedValueOnce([
      { id: 'm1', auth_user_id: 'auth-1', name: 'Ana', email: 'ana@x.com', role_slug: 'admin', role_name: 'Administrador', tenant_id: 't1', tenant_name: 'T1', status: 'active', joined_at: null },
    ]);
    listUsersMock().mockRejectedValueOnce(new Error('network down'));

    const [row] = await svc.list({});
    expect(row!.last_login).toBeNull();
    expect(row!.mfa_enabled).toBeNull();
  });

  it('reutiliza o cache de auth dentro da janela de TTL — não chama listUsers de novo', async () => {
    const { svc, ds } = makeService();
    ds.query.mockResolvedValue([]);
    listUsersMock().mockResolvedValue({ data: { users: [] }, error: null });

    await svc.list({});
    await svc.list({});

    expect(listUsersMock()).toHaveBeenCalledTimes(1);
  });

  it('aplica filtro de busca por email/nome/tenant como parâmetro (sem concatenação insegura)', async () => {
    const { svc, ds } = makeService();
    listUsersMock().mockResolvedValueOnce({ data: { users: [] }, error: null });

    await svc.list({ search: 'Ana' });

    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('lower(m.email) LIKE $1'),
      ['%ana%'],
    );
  });

  it('filtra por status active/blocked via m.is_active', async () => {
    const { svc, ds } = makeService();
    listUsersMock().mockResolvedValueOnce({ data: { users: [] }, error: null });

    await svc.list({ status: 'blocked' });

    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('m.is_active = $1'),
      [false],
    );
  });
});
