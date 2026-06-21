import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RbacAdminService } from './rbac-admin.service';

describe('RbacAdminService security boundaries', () => {
  const mutations = {
    grantRolePermission: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a cross-tenant role before mutating grants', async () => {
    const ds = { query: jest.fn().mockResolvedValueOnce([]) };
    const service = new RbacAdminService(ds as never, mutations as never);

    await expect(
      service.grant('tenant-a', 'user-a', 'admin', 'role-from-b', 'permission-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mutations.grantRolePermission).not.toHaveBeenCalled();
  });

  it('rejects self-escalation for an admin changing its own role', async () => {
    const ds = {
      query: jest.fn()
        .mockResolvedValueOnce([{
          id: 'role-a',
          tenant_id: 'tenant-a',
          slug: 'custom',
          name: 'Custom',
          description: null,
          hierarchy_level: 10,
          is_system: false,
          archived_at: null,
        }])
        .mockResolvedValueOnce([{ exists: 1 }]),
    };
    const service = new RbacAdminService(ds as never, mutations as never);

    await expect(
      service.grant('tenant-a', 'user-a', 'admin', 'role-a', 'permission-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mutations.grantRolePermission).not.toHaveBeenCalled();
  });

  it('rejects an invalid or non-assignable permission', async () => {
    const ds = {
      query: jest.fn()
        .mockResolvedValueOnce([{
          id: 'role-a',
          tenant_id: 'tenant-a',
          slug: 'custom',
          name: 'Custom',
          description: null,
          hierarchy_level: 10,
          is_system: false,
          archived_at: null,
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };
    const service = new RbacAdminService(ds as never, mutations as never);

    await expect(
      service.grant('tenant-a', 'user-a', 'admin', 'role-a', 'missing-permission'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mutations.grantRolePermission).not.toHaveBeenCalled();
  });
});
