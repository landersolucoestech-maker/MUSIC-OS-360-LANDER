import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { PermissionResolverService } from './permission-resolver.service';
import { RbacMutationService } from './rbac-mutation.service';

const roleId = '00000000-0000-0000-0000-000000000001';
const parentRoleId = '00000000-0000-0000-0000-000000000002';
const tenantId = '10000000-0000-0000-0000-000000000001';
const permissionId = '20000000-0000-0000-0000-000000000001';
const otherPermissionId = '20000000-0000-0000-0000-000000000002';
const mutationId = '30000000-0000-0000-0000-000000000001';

function makeResolver(): jest.Mocked<PermissionResolverService> {
  return {
    invalidateRole: jest.fn().mockResolvedValue(new Set([roleId])),
    invalidateRolePermission: jest.fn().mockResolvedValue(new Set([roleId])),
    invalidateRoleInheritance: jest
      .fn()
      .mockResolvedValue(new Set([roleId, parentRoleId])),
    invalidatePermissionDependencies: jest
      .fn()
      .mockResolvedValue(new Set([roleId])),
    invalidatePermissionConflicts: jest
      .fn()
      .mockResolvedValue(new Set([roleId])),
  } as unknown as jest.Mocked<PermissionResolverService>;
}

function makeDataSource(): DataSource {
  return {
    query: jest.fn().mockImplementation((sql: string) => {
      if (
        sql.includes('INSERT INTO "roles"') ||
        sql.includes('UPDATE "roles"') ||
        sql.includes('DELETE FROM "roles"')
      ) {
        return [{ id: roleId, tenant_id: tenantId }];
      }
      if (
        sql.includes('INSERT INTO "role_permissions"') ||
        sql.includes('DELETE FROM "role_permissions"')
      ) {
        return [{ role_id: roleId }];
      }
      if (
        sql.includes('WITH restored AS') ||
        sql.includes('UPDATE "role_inheritance"')
      ) {
        return [
          {
            child_role_id: roleId,
            parent_role_id: parentRoleId,
            tenant_id: tenantId,
          },
        ];
      }
      if (sql.includes('SELECT "permission_id", "depends_on_permission_id"')) {
        return [
          {
            permission_id: permissionId,
            depends_on_permission_id: otherPermissionId,
          },
        ];
      }
      if (
        sql.includes('INSERT INTO "permission_dependencies"') ||
        sql.includes('UPDATE "permission_dependencies"') ||
        sql.includes('DELETE FROM "permission_dependencies"')
      ) {
        return [
          {
            permission_id: permissionId,
            depends_on_permission_id: otherPermissionId,
          },
        ];
      }
      if (
        sql.includes(
          'SELECT "permission_id", "conflicts_with_permission_id"',
        )
      ) {
        return [
          {
            permission_id: permissionId,
            conflicts_with_permission_id: otherPermissionId,
          },
        ];
      }
      if (
        sql.includes('INSERT INTO "permission_conflicts"') ||
        sql.includes('UPDATE "permission_conflicts"') ||
        sql.includes('DELETE FROM "permission_conflicts"')
      ) {
        return [
          {
            permission_id: permissionId,
            conflicts_with_permission_id: otherPermissionId,
          },
        ];
      }
      throw new Error(`Unexpected query: ${sql}`);
    }),
  } as unknown as DataSource;
}

function setup() {
  const ds = makeDataSource();
  const resolver = makeResolver();
  return {
    ds,
    resolver,
    service: new RbacMutationService(ds, resolver),
  };
}

describe('RbacMutationService cache integration', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('invalidates a created role', async () => {
    const { service, resolver } = setup();

    await expect(
      service.createRole({
        tenantId,
        slug: 'manager',
        name: 'Manager',
      }),
    ).resolves.toEqual({ id: roleId, tenant_id: tenantId });
    expect(resolver.invalidateRole).toHaveBeenCalledWith(roleId, tenantId);
  });

  it('invalidates an updated role', async () => {
    const { service, resolver } = setup();

    await service.updateRole(roleId, tenantId, { name: 'Updated' });

    expect(resolver.invalidateRole).toHaveBeenCalledWith(roleId, tenantId);
  });

  it('invalidates an archived role', async () => {
    const { service, resolver } = setup();

    await service.archiveRole(roleId, tenantId);

    expect(resolver.invalidateRole).toHaveBeenCalledWith(roleId, tenantId);
  });

  it('invalidates a restored role', async () => {
    const { service, resolver } = setup();

    await service.restoreRole(roleId, tenantId);

    expect(resolver.invalidateRole).toHaveBeenCalledWith(roleId, tenantId);
  });

  it('invalidates before soft deleting a role', async () => {
    const { service, resolver, ds } = setup();

    await service.softDeleteRole(roleId, tenantId);

    expect(resolver.invalidateRole).toHaveBeenCalledWith(roleId, tenantId);
    expect(resolver.invalidateRole.mock.invocationCallOrder[0]).toBeLessThan(
      (ds.query as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('invalidates before hard deleting a role', async () => {
    const { service, resolver, ds } = setup();

    await service.deleteRole(roleId, tenantId);

    expect(resolver.invalidateRole).toHaveBeenCalledWith(roleId, tenantId);
    expect(resolver.invalidateRole.mock.invocationCallOrder[0]).toBeLessThan(
      (ds.query as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('invalidates role permission grants', async () => {
    const { service, resolver } = setup();

    await expect(
      service.grantRolePermission(roleId, permissionId, tenantId),
    ).resolves.toBe(true);
    expect(resolver.invalidateRolePermission).toHaveBeenCalledWith(
      roleId,
      tenantId,
    );
  });

  it('invalidates role permission revocations', async () => {
    const { service, resolver } = setup();

    await expect(
      service.revokeRolePermission(roleId, permissionId, tenantId),
    ).resolves.toBe(true);
    expect(resolver.invalidateRolePermission).toHaveBeenCalledWith(
      roleId,
      tenantId,
    );
  });

  it('restores role permissions idempotently through grant', async () => {
    const { service, resolver } = setup();

    await service.restoreRolePermission(roleId, permissionId, tenantId);

    expect(resolver.invalidateRolePermission).toHaveBeenCalledWith(
      roleId,
      tenantId,
    );
  });

  it('invalidates inheritance creation with child-parent ordering', async () => {
    const { service, resolver } = setup();

    await service.createRoleInheritance(roleId, parentRoleId, tenantId);

    expect(resolver.invalidateRoleInheritance).toHaveBeenCalledWith(
      roleId,
      parentRoleId,
      tenantId,
    );
  });

  it('invalidates inheritance removal', async () => {
    const { service, resolver } = setup();

    await expect(
      service.removeRoleInheritance(roleId, parentRoleId, tenantId),
    ).resolves.toBe(true);
    expect(resolver.invalidateRoleInheritance).toHaveBeenCalledWith(
      roleId,
      parentRoleId,
      tenantId,
    );
  });

  it('restores inheritance through the active-edge upsert', async () => {
    const { service, resolver } = setup();

    await service.restoreRoleInheritance(roleId, parentRoleId, tenantId);

    expect(resolver.invalidateRoleInheritance).toHaveBeenCalledWith(
      roleId,
      parentRoleId,
      tenantId,
    );
  });

  it('invalidates dependency creation endpoints', async () => {
    const { service, resolver } = setup();

    await service.createPermissionDependency(
      permissionId,
      otherPermissionId,
    );

    expect(resolver.invalidatePermissionDependencies).toHaveBeenCalledWith([
      permissionId,
      otherPermissionId,
    ]);
  });

  it('invalidates dependency deletion endpoints', async () => {
    const { service, resolver } = setup();

    await expect(service.deletePermissionDependency(mutationId)).resolves.toBe(
      true,
    );
    expect(resolver.invalidatePermissionDependencies).toHaveBeenCalledWith([
      permissionId,
      otherPermissionId,
    ]);
  });

  it('invalidates old and new dependency endpoints on update', async () => {
    const { service, resolver } = setup();

    await service.updatePermissionDependency(
      mutationId,
      permissionId,
      otherPermissionId,
    );

    expect(resolver.invalidatePermissionDependencies).toHaveBeenCalledWith([
      permissionId,
      otherPermissionId,
    ]);
  });

  it('normalizes and invalidates conflict creation', async () => {
    const { service, resolver, ds } = setup();

    await service.createPermissionConflict(
      otherPermissionId,
      permissionId,
    );

    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "permission_conflicts"'),
      [permissionId, otherPermissionId],
    );
    expect(resolver.invalidatePermissionConflicts).toHaveBeenCalledWith([
      permissionId,
      otherPermissionId,
    ]);
  });

  it('invalidates conflict deletion endpoints', async () => {
    const { service, resolver } = setup();

    await expect(service.deletePermissionConflict(mutationId)).resolves.toBe(
      true,
    );
    expect(resolver.invalidatePermissionConflicts).toHaveBeenCalledWith([
      permissionId,
      otherPermissionId,
    ]);
  });

  it('invalidates old and new conflict endpoints on update', async () => {
    const { service, resolver } = setup();

    await service.updatePermissionConflict(
      mutationId,
      otherPermissionId,
      permissionId,
    );

    expect(resolver.invalidatePermissionConflicts).toHaveBeenCalledWith([
      permissionId,
      otherPermissionId,
    ]);
  });

  it('preserves the main operation when invalidation fails', async () => {
    const { service, resolver } = setup();
    resolver.invalidateRole.mockRejectedValueOnce(
      new Error('cache unavailable'),
    );

    await expect(
      service.createRole({
        tenantId,
        slug: 'manager',
        name: 'Manager',
      }),
    ).resolves.toEqual({ id: roleId, tenant_id: tenantId });
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining(
        '"event":"rbac_mutation_cache_invalidation_failed"',
      ),
    );
  });

  it('executes multiple invalidations independently', async () => {
    const { service, resolver } = setup();

    await service.grantRolePermission(roleId, permissionId, tenantId);
    await service.createPermissionDependency(
      permissionId,
      otherPermissionId,
    );
    await service.createPermissionConflict(permissionId, otherPermissionId);

    expect(resolver.invalidateRolePermission).toHaveBeenCalledTimes(1);
    expect(resolver.invalidatePermissionDependencies).toHaveBeenCalledTimes(1);
    expect(resolver.invalidatePermissionConflicts).toHaveBeenCalledTimes(1);
  });

  it('logs mutation observability without actor payloads', async () => {
    const { service } = setup();

    await service.grantRolePermission(
      roleId,
      permissionId,
      tenantId,
      '40000000-0000-0000-0000-000000000001',
    );

    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('"mutation_type":"grant"'),
    );
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('"resource_type":"role_permission"'),
    );
    expect(Logger.prototype.log).not.toHaveBeenCalledWith(
      expect.stringContaining('40000000-0000-0000-0000-000000000001'),
    );
  });
});
