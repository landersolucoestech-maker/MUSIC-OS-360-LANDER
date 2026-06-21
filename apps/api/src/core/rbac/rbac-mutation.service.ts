import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.tokens';
import { PermissionResolverService } from './permission-resolver.service';

export interface CreateRoleMutation {
  tenantId: string | null;
  slug: string;
  name: string;
  description?: string | null;
  hierarchyLevel?: number;
  isSystem?: boolean;
  isAssignable?: boolean;
  actorId?: string | null;
}

export interface UpdateRoleMutation {
  name?: string;
  description?: string | null;
  isAssignable?: boolean;
  actorId?: string | null;
}

interface RoleMutationRow {
  id: string;
  tenant_id: string | null;
}

interface RoleInheritanceMutationRow {
  child_role_id: string;
  parent_role_id: string;
  tenant_id: string | null;
}

interface DependencyMutationRow {
  permission_id: string;
  depends_on_permission_id: string;
}

interface ConflictMutationRow {
  permission_id: string;
  conflicts_with_permission_id: string;
}

@Injectable()
export class RbacMutationService {
  private readonly logger = new Logger(RbacMutationService.name);

  constructor(
    @Inject(DATA_SOURCE) private readonly ds: DataSource,
    private readonly resolver: PermissionResolverService,
  ) {}

  private async invalidateBestEffort(
    mutationType: string,
    resourceType: string,
    invalidate: () => Promise<Set<string>>,
  ): Promise<void> {
    const startedAt = Date.now();
    try {
      const affectedRoles = await invalidate();
      this.logger.log(
        JSON.stringify({
          event: 'rbac_mutation_cache_invalidation',
          mutation_type: mutationType,
          resource_type: resourceType,
          affected_roles: affectedRoles.size,
          duration_ms: Date.now() - startedAt,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'rbac_mutation_cache_invalidation_failed',
          mutation_type: mutationType,
          resource_type: resourceType,
          duration_ms: Date.now() - startedAt,
          error: (error as Error).message,
        }),
      );
    }
  }

  async createRole(input: CreateRoleMutation): Promise<RoleMutationRow> {
    const rows = (await this.ds.query(
      `INSERT INTO "roles" (
         "tenant_id", "slug", "name", "description", "is_system",
         "is_assignable", "hierarchy_level", "created_by", "updated_by"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING "id", "tenant_id"`,
      [
        input.tenantId,
        input.slug,
        input.name,
        input.description ?? null,
        input.isSystem ?? false,
        input.isAssignable ?? true,
        input.hierarchyLevel ?? 0,
        input.actorId ?? null,
      ],
    )) as RoleMutationRow[];
    const role = rows[0];
    await this.invalidateBestEffort('create', 'role', () =>
      this.resolver.invalidateRole(role.id, role.tenant_id),
    );
    return role;
  }

  async updateRole(
    roleId: string,
    tenantId: string | null,
    input: UpdateRoleMutation,
  ): Promise<RoleMutationRow | null> {
    const rows = (await this.ds.query(
      `UPDATE "roles"
          SET "name" = COALESCE($3, "name"),
              "description" = CASE WHEN $4::boolean THEN $5 ELSE "description" END,
              "is_assignable" = COALESCE($6, "is_assignable"),
              "updated_by" = $7,
              "updated_at" = now(),
              "current_version" = "current_version" + 1
        WHERE "id" = $1
          AND "tenant_id" IS NOT DISTINCT FROM $2::uuid
          AND "deleted_at" IS NULL
        RETURNING "id", "tenant_id"`,
      [
        roleId,
        tenantId,
        input.name ?? null,
        Object.prototype.hasOwnProperty.call(input, 'description'),
        input.description ?? null,
        input.isAssignable ?? null,
        input.actorId ?? null,
      ],
    )) as RoleMutationRow[];
    return this.finishRoleMutation('update', rows[0]);
  }

  async archiveRole(
    roleId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<RoleMutationRow | null> {
    await this.invalidateBestEffort('archive', 'role', () =>
      this.resolver.invalidateRole(roleId, tenantId),
    );
    return this.setRoleTimestamp(
      roleId,
      tenantId,
      actorId,
      'archived_at',
      'now()',
      null,
    );
  }

  async restoreRole(
    roleId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<RoleMutationRow | null> {
    const rows = (await this.ds.query(
      `UPDATE "roles"
          SET "archived_at" = NULL,
              "deleted_at" = NULL,
              "updated_by" = $3,
              "updated_at" = now(),
              "current_version" = "current_version" + 1
        WHERE "id" = $1
          AND "tenant_id" IS NOT DISTINCT FROM $2::uuid
        RETURNING "id", "tenant_id"`,
      [roleId, tenantId, actorId],
    )) as RoleMutationRow[];
    return this.finishRoleMutation('restore', rows[0]);
  }

  async softDeleteRole(
    roleId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<RoleMutationRow | null> {
    await this.invalidateBestEffort('soft_delete', 'role', () =>
      this.resolver.invalidateRole(roleId, tenantId),
    );
    return this.setRoleTimestamp(
      roleId,
      tenantId,
      actorId,
      'deleted_at',
      'now()',
      null,
    );
  }

  async deleteRole(
    roleId: string,
    tenantId: string | null,
  ): Promise<RoleMutationRow | null> {
    await this.invalidateBestEffort('delete', 'role', () =>
      this.resolver.invalidateRole(roleId, tenantId),
    );
    const rows = (await this.ds.query(
      `DELETE FROM "roles"
        WHERE "id" = $1
          AND "tenant_id" IS NOT DISTINCT FROM $2::uuid
        RETURNING "id", "tenant_id"`,
      [roleId, tenantId],
    )) as RoleMutationRow[];
    return rows[0] ?? null;
  }

  private async setRoleTimestamp(
    roleId: string,
    tenantId: string | null,
    actorId: string | null,
    column: 'archived_at' | 'deleted_at',
    value: 'now()',
    mutationType: string | null,
  ): Promise<RoleMutationRow | null> {
    const rows = (await this.ds.query(
      `UPDATE "roles"
          SET "${column}" = ${value},
              "updated_by" = $3,
              "updated_at" = now(),
              "current_version" = "current_version" + 1
        WHERE "id" = $1
          AND "tenant_id" IS NOT DISTINCT FROM $2::uuid
        RETURNING "id", "tenant_id"`,
      [roleId, tenantId, actorId],
    )) as RoleMutationRow[];
    if (!mutationType) return rows[0] ?? null;
    return this.finishRoleMutation(mutationType, rows[0]);
  }

  private async finishRoleMutation(
    mutationType: string,
    role?: RoleMutationRow,
  ): Promise<RoleMutationRow | null> {
    if (!role) return null;
    await this.invalidateBestEffort(mutationType, 'role', () =>
      this.resolver.invalidateRole(role.id, role.tenant_id),
    );
    return role;
  }

  async grantRolePermission(
    roleId: string,
    permissionId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<boolean> {
    const rows = (await this.ds.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id", "created_by")
       SELECT role."id", $2, $4
         FROM "roles" role
        WHERE role."id" = $1
          AND role."tenant_id" IS NOT DISTINCT FROM $3::uuid
          AND role."deleted_at" IS NULL
          AND role."archived_at" IS NULL
       ON CONFLICT ("role_id", "permission_id") DO NOTHING
       RETURNING "role_id"`,
      [roleId, permissionId, tenantId, actorId],
    )) as Array<{ role_id: string }>;
    if (rows.length === 0) return false;
    await this.invalidateBestEffort('grant', 'role_permission', () =>
      this.resolver.invalidateRolePermission(roleId, tenantId),
    );
    return true;
  }

  async restoreRolePermission(
    roleId: string,
    permissionId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<boolean> {
    return this.grantRolePermission(
      roleId,
      permissionId,
      tenantId,
      actorId,
    );
  }

  async revokeRolePermission(
    roleId: string,
    permissionId: string,
    tenantId: string | null,
  ): Promise<boolean> {
    const rows = (await this.ds.query(
      `DELETE FROM "role_permissions" role_permission
        USING "roles" role
        WHERE role_permission."role_id" = role."id"
          AND role_permission."role_id" = $1
          AND role_permission."permission_id" = $2
          AND role."tenant_id" IS NOT DISTINCT FROM $3::uuid
        RETURNING role_permission."role_id"`,
      [roleId, permissionId, tenantId],
    )) as Array<{ role_id: string }>;
    if (rows.length === 0) return false;
    await this.invalidateBestEffort('revoke', 'role_permission', () =>
      this.resolver.invalidateRolePermission(roleId, tenantId),
    );
    return true;
  }

  async createRoleInheritance(
    childRoleId: string,
    parentRoleId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<RoleInheritanceMutationRow> {
    const rows = (await this.ds.query(
      `WITH restored AS (
         UPDATE "role_inheritance"
            SET "deleted_at" = NULL, "updated_by" = $4, "updated_at" = now()
          WHERE "child_role_id" = $1
            AND "parent_role_id" = $2
            AND "tenant_id" IS NOT DISTINCT FROM $3::uuid
            AND "deleted_at" IS NOT NULL
          RETURNING "child_role_id", "parent_role_id", "tenant_id"
       ), inserted AS (
         INSERT INTO "role_inheritance" (
           "child_role_id", "parent_role_id", "tenant_id", "created_by", "updated_by"
         )
         SELECT $1, $2, $3, $4, $4
          WHERE NOT EXISTS (SELECT 1 FROM restored)
         ON CONFLICT ("child_role_id", "parent_role_id")
           WHERE "deleted_at" IS NULL DO UPDATE SET "updated_by" = EXCLUDED."updated_by"
         RETURNING "child_role_id", "parent_role_id", "tenant_id"
       )
       SELECT * FROM restored
       UNION ALL
       SELECT * FROM inserted
       LIMIT 1`,
      [childRoleId, parentRoleId, tenantId, actorId],
    )) as RoleInheritanceMutationRow[];
    const edge = rows[0];
    await this.finishInheritanceMutation('create', edge);
    return edge;
  }

  async restoreRoleInheritance(
    childRoleId: string,
    parentRoleId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<RoleInheritanceMutationRow> {
    return this.createRoleInheritance(
      childRoleId,
      parentRoleId,
      tenantId,
      actorId,
    );
  }

  async removeRoleInheritance(
    childRoleId: string,
    parentRoleId: string,
    tenantId: string | null,
    actorId: string | null = null,
  ): Promise<boolean> {
    const rows = (await this.ds.query(
      `UPDATE "role_inheritance"
          SET "deleted_at" = now(), "updated_by" = $4, "updated_at" = now()
        WHERE "child_role_id" = $1
          AND "parent_role_id" = $2
          AND "tenant_id" IS NOT DISTINCT FROM $3::uuid
          AND "deleted_at" IS NULL
        RETURNING "child_role_id", "parent_role_id", "tenant_id"`,
      [childRoleId, parentRoleId, tenantId, actorId],
    )) as RoleInheritanceMutationRow[];
    if (!rows[0]) return false;
    await this.finishInheritanceMutation('delete', rows[0]);
    return true;
  }

  private async finishInheritanceMutation(
    mutationType: string,
    edge: RoleInheritanceMutationRow,
  ): Promise<void> {
    await this.invalidateBestEffort(mutationType, 'role_inheritance', () =>
      this.resolver.invalidateRoleInheritance(
        edge.child_role_id,
        edge.parent_role_id,
        edge.tenant_id,
      ),
    );
  }

  async createPermissionDependency(
    permissionId: string,
    dependsOnPermissionId: string,
  ): Promise<DependencyMutationRow> {
    const rows = (await this.ds.query(
      `INSERT INTO "permission_dependencies" (
         "permission_id", "depends_on_permission_id"
       )
       VALUES ($1, $2)
       ON CONFLICT ("permission_id", "depends_on_permission_id")
         DO UPDATE SET "permission_id" = EXCLUDED."permission_id"
       RETURNING "permission_id", "depends_on_permission_id"`,
      [permissionId, dependsOnPermissionId],
    )) as DependencyMutationRow[];
    await this.finishDependencyMutation('create', rows[0]);
    return rows[0];
  }

  async restorePermissionDependency(
    permissionId: string,
    dependsOnPermissionId: string,
  ): Promise<DependencyMutationRow> {
    return this.createPermissionDependency(permissionId, dependsOnPermissionId);
  }

  async updatePermissionDependency(
    id: string,
    permissionId: string,
    dependsOnPermissionId: string,
  ): Promise<DependencyMutationRow | null> {
    const previous = (await this.ds.query(
      `SELECT "permission_id", "depends_on_permission_id"
         FROM "permission_dependencies"
        WHERE "id" = $1`,
      [id],
    )) as DependencyMutationRow[];
    const rows = (await this.ds.query(
      `UPDATE "permission_dependencies"
          SET "permission_id" = $2, "depends_on_permission_id" = $3
        WHERE "id" = $1
        RETURNING "permission_id", "depends_on_permission_id"`,
      [id, permissionId, dependsOnPermissionId],
    )) as DependencyMutationRow[];
    if (!rows[0]) return null;
    await this.invalidateBestEffort('update', 'permission_dependency', () =>
      this.resolver.invalidatePermissionDependencies(
        this.permissionIds(previous[0], rows[0]),
      ),
    );
    return rows[0];
  }

  async deletePermissionDependency(id: string): Promise<boolean> {
    const rows = (await this.ds.query(
      `DELETE FROM "permission_dependencies"
        WHERE "id" = $1
        RETURNING "permission_id", "depends_on_permission_id"`,
      [id],
    )) as DependencyMutationRow[];
    if (!rows[0]) return false;
    await this.finishDependencyMutation('delete', rows[0]);
    return true;
  }

  private async finishDependencyMutation(
    mutationType: string,
    dependency: DependencyMutationRow,
  ): Promise<void> {
    await this.invalidateBestEffort(
      mutationType,
      'permission_dependency',
      () =>
        this.resolver.invalidatePermissionDependencies(
          this.permissionIds(dependency),
        ),
    );
  }

  async createPermissionConflict(
    permissionId: string,
    conflictsWithPermissionId: string,
  ): Promise<ConflictMutationRow> {
    const [left, right] = [permissionId, conflictsWithPermissionId].sort();
    const rows = (await this.ds.query(
      `INSERT INTO "permission_conflicts" (
         "permission_id", "conflicts_with_permission_id"
       )
       VALUES ($1, $2)
       ON CONFLICT ("permission_id", "conflicts_with_permission_id")
         DO UPDATE SET "permission_id" = EXCLUDED."permission_id"
       RETURNING "permission_id", "conflicts_with_permission_id"`,
      [left, right],
    )) as ConflictMutationRow[];
    await this.finishConflictMutation('create', rows[0]);
    return rows[0];
  }

  async restorePermissionConflict(
    permissionId: string,
    conflictsWithPermissionId: string,
  ): Promise<ConflictMutationRow> {
    return this.createPermissionConflict(
      permissionId,
      conflictsWithPermissionId,
    );
  }

  async updatePermissionConflict(
    id: string,
    permissionId: string,
    conflictsWithPermissionId: string,
  ): Promise<ConflictMutationRow | null> {
    const previous = (await this.ds.query(
      `SELECT "permission_id", "conflicts_with_permission_id"
         FROM "permission_conflicts"
        WHERE "id" = $1`,
      [id],
    )) as ConflictMutationRow[];
    const [left, right] = [permissionId, conflictsWithPermissionId].sort();
    const rows = (await this.ds.query(
      `UPDATE "permission_conflicts"
          SET "permission_id" = $2, "conflicts_with_permission_id" = $3
        WHERE "id" = $1
        RETURNING "permission_id", "conflicts_with_permission_id"`,
      [id, left, right],
    )) as ConflictMutationRow[];
    if (!rows[0]) return null;
    await this.invalidateBestEffort('update', 'permission_conflict', () =>
      this.resolver.invalidatePermissionConflicts(
        this.permissionIds(previous[0], rows[0]),
      ),
    );
    return rows[0];
  }

  async deletePermissionConflict(id: string): Promise<boolean> {
    const rows = (await this.ds.query(
      `DELETE FROM "permission_conflicts"
        WHERE "id" = $1
        RETURNING "permission_id", "conflicts_with_permission_id"`,
      [id],
    )) as ConflictMutationRow[];
    if (!rows[0]) return false;
    await this.finishConflictMutation('delete', rows[0]);
    return true;
  }

  private async finishConflictMutation(
    mutationType: string,
    conflict: ConflictMutationRow,
  ): Promise<void> {
    await this.invalidateBestEffort(mutationType, 'permission_conflict', () =>
      this.resolver.invalidatePermissionConflicts(
        this.permissionIds(conflict),
      ),
    );
  }

  private permissionIds(
    ...rows: Array<
      DependencyMutationRow | ConflictMutationRow | undefined
    >
  ): string[] {
    return Array.from(
      new Set(
        rows.flatMap((row) =>
          row
            ? [
                row.permission_id,
                'depends_on_permission_id' in row
                  ? row.depends_on_permission_id
                  : row.conflicts_with_permission_id,
              ]
            : [],
        ),
      ),
    );
  }
}
