import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * GAP-06 (product-completion audit): invite() must enforce the tenant's plan
 * seat limit before creating any Supabase side effect. Guards against the
 * enforcement call being silently dropped in a future refactor.
 */
describe('UsersService.invite — plan-limit enforcement', () => {
  const TENANT = 'tenant-a';
  const ORG = 'org-a';

  function buildService(enforce: jest.Mock) {
    const query = jest.fn()
      .mockResolvedValueOnce([{ slug: 'editor' }]) // role lookup
      .mockResolvedValueOnce([{ slug: 'owner', hierarchy_level: 100 }]) // assertCanAssignRole
      .mockResolvedValueOnce([{ org_id: ORG, slug: 'tenant-a-slug' }]) // tenant lookup
      .mockResolvedValueOnce([]) // existing member check
      .mockResolvedValueOnce([]); // pending invitation check

    const repo = { manager: { query } };
    const dataSource = { getRepository: jest.fn().mockReturnValue(repo) };
    const roleResolver = {};
    const rbacCache = {};
    const config = {};
    const mail = {};
    const planLimit = { enforce };

    const service = new UsersService(
      dataSource as never,
      { emitTyped: jest.fn() } as never,
      roleResolver as never,
      rbacCache as never,
      config as never,
      mail as never,
      planLimit as never,
    );
    return { service, query };
  }

  it('checks the "users" plan limit for the tenant\'s org before inviting', async () => {
    const enforce = jest.fn().mockRejectedValue(
      new ForbiddenException('Limite do plano atingido para "users".'),
    );
    const { service } = buildService(enforce);

    await expect(
      service.invite(TENANT, 'new@example.com', 'role-1', 'inviter-1', 'owner'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(enforce).toHaveBeenCalledWith(TENANT, ORG, 'users');
  });

  it('proceeds to create the invite when under the plan limit', async () => {
    const enforce = jest.fn().mockResolvedValue(undefined);
    const { service } = buildService(enforce);

    // No Supabase config in this unit test — expect it to fail past the
    // enforcement point (inside supabaseAdmin()), proving enforce() did not
    // block a within-limit invite.
    await expect(
      service.invite(TENANT, 'new@example.com', 'role-1', 'inviter-1', 'owner'),
    ).rejects.not.toBeInstanceOf(ForbiddenException);

    expect(enforce).toHaveBeenCalledWith(TENANT, ORG, 'users');
  });
});
