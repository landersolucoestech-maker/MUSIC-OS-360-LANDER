import type { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import {
  PermissionResolverService,
  type EffectivePermissionResolution,
} from './permission-resolver.service';

const roleId = '00000000-0000-0000-0000-000000000001';
const parentRoleId = '00000000-0000-0000-0000-000000000002';
const tenantId = '10000000-0000-0000-0000-000000000001';
const readId = '20000000-0000-0000-0000-000000000001';
const updateId = '20000000-0000-0000-0000-000000000002';
const approveId = '20000000-0000-0000-0000-000000000003';

const member = { role: 'viewer', role_id: roleId, tenant_id: tenantId };

interface ResolverFixture {
  roleRows?: unknown[];
  effectiveRoles?: unknown[];
  fingerprint?: string;
  grants?: unknown[];
  dependencies?: unknown[];
  conflicts?: unknown[];
}

function makeDataSource(fixture: ResolverFixture = {}): DataSource {
  return {
    isInitialized: true,
    query: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT "id", "canonical_role_id"')) {
        return Promise.resolve(
          fixture.roleRows ?? [{ id: roleId, canonical_role_id: null }],
        );
      }
      if (sql.includes('WITH RECURSIVE effective_roles')) {
        return Promise.resolve(
          fixture.effectiveRoles ?? [
            { id: roleId, current_version: 1, depth: 0 },
          ],
        );
      }
      if (sql.includes('AS fingerprint')) {
        return Promise.resolve([
          { fingerprint: fixture.fingerprint ?? 'catalog-v1' },
        ]);
      }
      if (sql.includes('FROM "role_permissions"')) {
        return Promise.resolve(
          fixture.grants ?? [
            { id: readId, key: 'artist:read', role_id: roleId },
          ],
        );
      }
      if (sql.includes('WITH RECURSIVE dependency_tree')) {
        return Promise.resolve(fixture.dependencies ?? []);
      }
      if (sql.includes('FROM "permission_conflicts"')) {
        return Promise.resolve(fixture.conflicts ?? []);
      }
      throw new Error(`Unexpected query: ${sql}`);
    }),
  } as unknown as DataSource;
}

async function detailed(
  fixture: ResolverFixture = {},
): Promise<EffectivePermissionResolution> {
  return new PermissionResolverService(makeDataSource(fixture)).resolveDetailed(
    member,
    () => ['legacy:read'],
  );
}

describe('PermissionResolverService dependencies and conflicts', () => {
  it('resolves a simple direct permission', async () => {
    await expect(detailed()).resolves.toMatchObject({
      permissions: ['artist:read'],
      inheritedPermissions: [],
      dependencyPermissions: [],
      conflicts: [],
    });
  });

  it('keeps inherited role permissions classified separately', async () => {
    await expect(
      detailed({
        effectiveRoles: [
          { id: roleId, current_version: 1, depth: 0 },
          { id: parentRoleId, current_version: 1, depth: 1 },
        ],
        grants: [
          { id: readId, key: 'artist:read', role_id: roleId },
          { id: updateId, key: 'artist:update', role_id: parentRoleId },
        ],
      }),
    ).resolves.toMatchObject({
      permissions: ['artist:read', 'artist:update'],
      inheritedPermissions: ['artist:update'],
    });
  });

  it('expands a direct dependency', async () => {
    await expect(
      detailed({
        dependencies: [
          {
            id: updateId,
            key: 'artist:update',
            depth: 1,
            cycle: false,
            invalid: false,
          },
        ],
      }),
    ).resolves.toMatchObject({
      permissions: ['artist:read', 'artist:update'],
      dependencyPermissions: ['artist:update'],
    });
  });

  it('expands transitive dependencies', async () => {
    await expect(
      detailed({
        dependencies: [
          {
            id: updateId,
            key: 'artist:update',
            depth: 1,
            cycle: false,
            invalid: false,
          },
          {
            id: approveId,
            key: 'artist:approve',
            depth: 2,
            cycle: false,
            invalid: false,
          },
        ],
      }),
    ).resolves.toMatchObject({
      dependencyPermissions: ['artist:approve', 'artist:update'],
    });
  });

  it('deduplicates repeated dependencies', async () => {
    const result = await detailed({
      dependencies: [
        {
          id: updateId,
          key: 'artist:update',
          depth: 1,
          cycle: false,
          invalid: false,
        },
        {
          id: updateId,
          key: 'artist:update',
          depth: 2,
          cycle: false,
          invalid: false,
        },
      ],
    });

    expect(result.dependencyPermissions).toEqual(['artist:update']);
  });

  it('fails closed on a dependency cycle', async () => {
    await expect(
      detailed({
        dependencies: [
          {
            id: updateId,
            key: 'artist:update',
            depth: 2,
            cycle: true,
            invalid: false,
          },
        ],
      }),
    ).resolves.toEqual({
      permissions: [],
      inheritedPermissions: [],
      dependencyPermissions: [],
      conflicts: [],
    });
  });

  it('fails closed above the dependency depth limit', async () => {
    await expect(
      detailed({
        dependencies: [
          {
            id: updateId,
            key: 'artist:update',
            depth: 33,
            cycle: false,
            invalid: false,
          },
        ],
      }),
    ).resolves.toMatchObject({ permissions: [] });
  });

  it('detects a simple symmetric SoD conflict', async () => {
    await expect(
      detailed({
        grants: [
          { id: readId, key: 'payment:create', role_id: roleId },
          { id: approveId, key: 'payment:approve', role_id: roleId },
        ],
        conflicts: [
          {
            permission_key: 'payment:approve',
            conflicts_with_key: 'payment:create',
          },
        ],
      }),
    ).resolves.toMatchObject({
      permissions: ['payment:approve', 'payment:create'],
      conflicts: [
        {
          permission: 'payment:approve',
          conflictsWith: 'payment:create',
        },
      ],
    });
  });

  it('reports multiple conflicts without removing permissions', async () => {
    const result = await detailed({
      grants: [
        { id: readId, key: 'payment:create', role_id: roleId },
        { id: updateId, key: 'payment:cancel', role_id: roleId },
        { id: approveId, key: 'payment:approve', role_id: roleId },
      ],
      conflicts: [
        {
          permission_key: 'payment:approve',
          conflicts_with_key: 'payment:create',
        },
        {
          permission_key: 'payment:cancel',
          conflicts_with_key: 'payment:create',
        },
      ],
    });

    expect(result.permissions).toHaveLength(3);
    expect(result.conflicts).toHaveLength(2);
  });

  it('combines inheritance and dependencies', async () => {
    await expect(
      detailed({
        effectiveRoles: [
          { id: roleId, current_version: 1, depth: 0 },
          { id: parentRoleId, current_version: 1, depth: 1 },
        ],
        grants: [
          { id: updateId, key: 'artist:update', role_id: parentRoleId },
        ],
        dependencies: [
          {
            id: readId,
            key: 'artist:read',
            depth: 1,
            cycle: false,
            invalid: false,
          },
        ],
      }),
    ).resolves.toMatchObject({
      permissions: ['artist:read', 'artist:update'],
      inheritedPermissions: ['artist:update'],
      dependencyPermissions: ['artist:read'],
    });
  });

  it('combines inheritance, dependencies, and conflicts', async () => {
    await expect(
      detailed({
        effectiveRoles: [
          { id: roleId, current_version: 1, depth: 0 },
          { id: parentRoleId, current_version: 1, depth: 1 },
        ],
        grants: [
          { id: approveId, key: 'payment:approve', role_id: parentRoleId },
        ],
        dependencies: [
          {
            id: readId,
            key: 'payment:create',
            depth: 1,
            cycle: false,
            invalid: false,
          },
        ],
        conflicts: [
          {
            permission_key: 'payment:approve',
            conflicts_with_key: 'payment:create',
          },
        ],
      }),
    ).resolves.toMatchObject({
      inheritedPermissions: ['payment:approve'],
      dependencyPermissions: ['payment:create'],
      conflicts: [
        {
          permission: 'payment:approve',
          conflictsWith: 'payment:create',
        },
      ],
    });
  });

  it('keeps tenant filters in the inherited role query', async () => {
    const ds = makeDataSource();
    const resolver = new PermissionResolverService(ds);

    await resolver.resolveDetailed(member, () => []);

    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('inheritance."tenant_id" = $2'),
      [roleId, tenantId],
    );
  });

  it('fails closed for an inactive dependency target', async () => {
    await expect(
      detailed({
        dependencies: [
          { id: updateId, key: null, depth: 1, cycle: false, invalid: true },
        ],
      }),
    ).resolves.toMatchObject({ permissions: [] });
  });

  it('invalidates cache when the permission catalog fingerprint changes', async () => {
    const ds = makeDataSource();
    const query = ds.query as jest.Mock;
    let fingerprint = 'catalog-v1';
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT "id", "canonical_role_id"')) {
        return [{ id: roleId, canonical_role_id: null }];
      }
      if (sql.includes('WITH RECURSIVE effective_roles')) {
        return [{ id: roleId, current_version: 1, depth: 0 }];
      }
      if (sql.includes('AS fingerprint')) return [{ fingerprint }];
      if (sql.includes('FROM "role_permissions"')) {
        return [
          {
            id: fingerprint === 'catalog-v1' ? readId : updateId,
            key:
              fingerprint === 'catalog-v1' ? 'artist:read' : 'artist:update',
            role_id: roleId,
          },
        ];
      }
      if (sql.includes('WITH RECURSIVE dependency_tree')) return [];
      throw new Error(`Unexpected query: ${sql}`);
    });
    const resolver = new PermissionResolverService(ds);

    await expect(resolver.resolve(member, () => [])).resolves.toEqual([
      'artist:read',
    ]);
    await expect(resolver.resolve(member, () => [])).resolves.toEqual([
      'artist:read',
    ]);
    fingerprint = 'catalog-v2';
    await expect(resolver.resolve(member, () => [])).resolves.toEqual([
      'artist:update',
    ]);
  });

  it('includes role_permissions in the cache fingerprint', async () => {
    const ds = makeDataSource();
    const resolver = new PermissionResolverService(ds);

    await resolver.resolve(member, () => []);

    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM "role_permissions" role_permission'),
    );
  });

  it('preserves the legacy fallback and the string[] contract', async () => {
    const resolver = new PermissionResolverService(
      makeDataSource({ grants: [] }),
    );

    await expect(resolver.resolve(member, () => ['legacy:read'])).resolves.toEqual([
      'legacy:read',
    ]);
    await expect(
      resolver.resolveDetailed(
        { role: 'viewer', role_id: null, tenant_id: tenantId },
        () => ['legacy:read'],
      ),
    ).resolves.toMatchObject({
      permissions: ['legacy:read'],
      inheritedPermissions: [],
      dependencyPermissions: [],
      conflicts: [],
    });
  });
});

interface InvalidationFixture {
  descendants?: Array<{ id: string; depth: number }>;
  permissionRoles?: Array<{ role_id: string; permission_depth: number }>;
  descendantError?: Error;
}

function makeInvalidationDataSource(
  fixture: InvalidationFixture = {},
): DataSource {
  return {
    isInitialized: true,
    query: jest
      .fn()
      .mockImplementation((sql: string, params?: [string | string[], string]) => {
        if (sql.includes('SELECT "id", "canonical_role_id"')) {
          return [{ id: params?.[0], canonical_role_id: null }];
        }
        if (sql.includes('WITH RECURSIVE effective_roles')) {
          return [{ id: params?.[0], current_version: 1, depth: 0 }];
        }
        if (sql.includes('AS fingerprint')) {
          return [{ fingerprint: 'catalog-v1' }];
        }
        if (sql.includes('FROM "role_permissions"')) {
          const resolvedRoleId = (params?.[0] as string[])[0];
          return [
            {
              id: readId,
              key: `permission:${resolvedRoleId}`,
              role_id: resolvedRoleId,
            },
          ];
        }
        if (sql.includes('WITH RECURSIVE dependency_tree')) return [];
        if (sql.includes('FROM "permission_conflicts"')) return [];
        if (sql.includes('WITH RECURSIVE affected_permissions')) {
          return fixture.permissionRoles ?? [];
        }
        if (sql.includes('WITH RECURSIVE role_descendants')) {
          if (fixture.descendantError) throw fixture.descendantError;
          return fixture.descendants ?? [];
        }
        throw new Error(`Unexpected query: ${sql}`);
      }),
  } as unknown as DataSource;
}

function grantQueryCount(ds: DataSource): number {
  return (ds.query as jest.Mock).mock.calls.filter(([sql]: [string]) =>
    sql.includes('SELECT DISTINCT p."id"'),
  ).length;
}

describe('PermissionResolverService transitive cache invalidation', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('invalidates one role and rebuilds its cache', async () => {
    const ds = makeInvalidationDataSource({
      descendants: [{ id: roleId, depth: 0 }],
    });
    const resolver = new PermissionResolverService(ds);

    await resolver.resolve(member, () => []);
    await resolver.resolve(member, () => []);
    expect(grantQueryCount(ds)).toBe(1);

    await expect(resolver.invalidateRole(roleId, tenantId)).resolves.toEqual(
      new Set([roleId]),
    );
    await resolver.resolve(member, () => []);
    expect(grantQueryCount(ds)).toBe(2);
  });

  it('invalidates an ancestor and all descendants', async () => {
    const childRoleId = '00000000-0000-0000-0000-000000000003';
    const ds = makeInvalidationDataSource({
      descendants: [
        { id: parentRoleId, depth: 0 },
        { id: roleId, depth: 1 },
        { id: childRoleId, depth: 2 },
      ],
    });
    const resolver = new PermissionResolverService(ds);

    const affected = await resolver.invalidateRole(parentRoleId, tenantId);

    expect(affected).toEqual(
      new Set([parentRoleId, roleId, childRoleId]),
    );
  });

  it('deduplicates descendants in a multiple-parent DAG', async () => {
    const sharedChild = '00000000-0000-0000-0000-000000000004';
    const ds = makeInvalidationDataSource({
      descendants: [
        { id: roleId, depth: 0 },
        { id: parentRoleId, depth: 1 },
        { id: sharedChild, depth: 2 },
        { id: sharedChild, depth: 2 },
      ],
    });
    const resolver = new PermissionResolverService(ds);

    const affected = await resolver.invalidateRole(roleId, tenantId);

    expect([...affected]).toEqual([roleId, parentRoleId, sharedChild]);
  });

  it('handles a complex DAG without duplicate invalidation', async () => {
    const role3 = '00000000-0000-0000-0000-000000000003';
    const role4 = '00000000-0000-0000-0000-000000000004';
    const ds = makeInvalidationDataSource({
      descendants: [
        { id: roleId, depth: 0 },
        { id: parentRoleId, depth: 1 },
        { id: role3, depth: 1 },
        { id: role4, depth: 2 },
      ],
    });
    const resolver = new PermissionResolverService(ds);

    await expect(resolver.invalidateRole(roleId, tenantId)).resolves.toEqual(
      new Set([roleId, parentRoleId, role3, role4]),
    );
  });

  it('returns only a role when it has no descendants', async () => {
    const resolver = new PermissionResolverService(
      makeInvalidationDataSource({
        descendants: [{ id: roleId, depth: 0 }],
      }),
    );

    await expect(resolver.invalidateRole(roleId, tenantId)).resolves.toEqual(
      new Set([roleId]),
    );
  });

  it('propagates role_permissions invalidation to descendants', async () => {
    const ds = makeInvalidationDataSource({
      descendants: [
        { id: roleId, depth: 0 },
        { id: parentRoleId, depth: 1 },
      ],
    });
    const resolver = new PermissionResolverService(ds);

    await expect(
      resolver.invalidateRolePermission(roleId, tenantId),
    ).resolves.toEqual(new Set([roleId, parentRoleId]));
  });

  it('invalidates parent, child, and child descendants for inheritance changes', async () => {
    const grandchild = '00000000-0000-0000-0000-000000000003';
    const ds = makeInvalidationDataSource({
      descendants: [
        { id: roleId, depth: 0 },
        { id: grandchild, depth: 1 },
      ],
    });
    const resolver = new PermissionResolverService(ds);

    await expect(
      resolver.invalidateRoleInheritance(roleId, parentRoleId, tenantId),
    ).resolves.toEqual(new Set([roleId, grandchild, parentRoleId]));
  });

  it('invalidates roles using dependency endpoints or reverse dependencies', async () => {
    const ds = makeInvalidationDataSource({
      permissionRoles: [
        { role_id: roleId, permission_depth: 0 },
        { role_id: parentRoleId, permission_depth: 2 },
      ],
      descendants: [
        { id: roleId, depth: 0 },
        { id: parentRoleId, depth: 0 },
      ],
    });
    const resolver = new PermissionResolverService(ds);

    await expect(
      resolver.invalidatePermissionDependencies([readId, updateId], tenantId),
    ).resolves.toEqual(new Set([roleId, parentRoleId]));
  });

  it('invalidates roles affected by permission conflicts', async () => {
    const ds = makeInvalidationDataSource({
      permissionRoles: [{ role_id: roleId, permission_depth: 1 }],
      descendants: [{ id: roleId, depth: 0 }],
    });
    const resolver = new PermissionResolverService(ds);

    await expect(
      resolver.invalidatePermissionConflicts([readId, approveId], tenantId),
    ).resolves.toEqual(new Set([roleId]));
  });

  it('passes tenant scope to graph and permission-impact queries', async () => {
    const ds = makeInvalidationDataSource({
      permissionRoles: [{ role_id: roleId, permission_depth: 0 }],
      descendants: [{ id: roleId, depth: 0 }],
    });
    const resolver = new PermissionResolverService(ds);

    await resolver.invalidatePermissionDependencies([readId], tenantId);

    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('WITH RECURSIVE affected_permissions'),
      [[readId], tenantId],
    );
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('WITH RECURSIVE role_descendants'),
      [[roleId], tenantId],
    );
  });

  it('clears all cache entries when graph depth exceeds 32', async () => {
    const ds = makeInvalidationDataSource({
      descendants: [{ id: roleId, depth: 33 }],
    });
    const resolver = new PermissionResolverService(ds);

    await resolver.resolve(member, () => []);
    expect(grantQueryCount(ds)).toBe(1);
    await expect(resolver.invalidateRole(roleId, tenantId)).resolves.toEqual(
      new Set(),
    );
    await resolver.resolve(member, () => []);
    expect(grantQueryCount(ds)).toBe(2);
  });

  it('clears all cache entries when dependency impact exceeds 32', async () => {
    const ds = makeInvalidationDataSource({
      permissionRoles: [{ role_id: roleId, permission_depth: 33 }],
    });
    const resolver = new PermissionResolverService(ds);

    await resolver.resolve(member, () => []);
    await resolver.invalidatePermissionDependencies([readId], tenantId);
    await resolver.resolve(member, () => []);

    expect(grantQueryCount(ds)).toBe(2);
  });

  it('fails safely and keeps the resolver functional', async () => {
    const ds = makeInvalidationDataSource({
      descendantError: new Error('database unavailable'),
    });
    const resolver = new PermissionResolverService(ds);

    await resolver.resolve(member, () => []);
    await expect(resolver.invalidateRole(roleId, tenantId)).resolves.toEqual(
      new Set(),
    );
    await expect(resolver.resolve(member, () => [])).resolves.toEqual([
      `permission:${roleId}`,
    ]);
  });

  it('reuses cache after an invalidated entry is rebuilt', async () => {
    const ds = makeInvalidationDataSource({
      descendants: [{ id: roleId, depth: 0 }],
    });
    const resolver = new PermissionResolverService(ds);

    await resolver.resolve(member, () => []);
    await resolver.invalidateRole(roleId, tenantId);
    await resolver.resolve(member, () => []);
    await resolver.resolve(member, () => []);

    expect(grantQueryCount(ds)).toBe(2);
  });

  it('emits structured invalidation observability without user data', async () => {
    const log = jest.spyOn(Logger.prototype, 'log');
    const resolver = new PermissionResolverService(
      makeInvalidationDataSource({
        descendants: [{ id: roleId, depth: 0 }],
      }),
    );

    await resolver.invalidateRolePermission(roleId, tenantId);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"reason":"role_permissions"'),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"affectedRoles":1'),
    );
  });
});
