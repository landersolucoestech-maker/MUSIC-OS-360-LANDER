import { Injectable } from '@nestjs/common';
import { RbacService } from '../../core/rbac/rbac.service';

interface AuthClaims {
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

@Injectable()
export class AuthContextService {
  constructor(private readonly rbac: RbacService) {}

  build(
    auth: { userId: string; orgId: string | null; orgRole: string | null; claims: Record<string, unknown> },
    tenant: Record<string, unknown> | undefined,
    member: Record<string, unknown> | undefined,
  ) {
    const claims = auth.claims as AuthClaims;
    const appMetadata = asObject(claims.app_metadata);
    const userMetadata = asObject(claims.user_metadata);
    const role = asString(member?.['role'], auth.orgRole ?? 'viewer');
    const tenantId = asString(tenant?.['id'], auth.orgId ?? '');
    const orgId = asString(tenant?.['org_id'], auth.orgId ?? tenantId);

    return {
      user: {
        id: auth.userId,
        email: asString(member?.['email'], claims.email ?? ''),
        fullName: asString(member?.['full_name'], asString(userMetadata['full_name'])),
        avatarUrl: asString(userMetadata['avatar_url']) || null,
      },
      workspace: {
        id: tenantId,
        orgId,
        name: asString(tenant?.['name'], 'MUSIC OS 360'),
        slug: asString(tenant?.['slug'], 'workspace'),
        active: asBoolean(tenant?.['active'], true),
        plan: asString(tenant?.['plan'], 'starter'),
        features: asObject(tenant?.['features']),
        settings: asObject(tenant?.['settings']),
      },
      membership: {
        id: asString(member?.['id']),
        authUserId: auth.userId,
        role,
        isActive: asBoolean(member?.['is_active'], true),
        permissions: this.rbac.getPermissions(role),
        hierarchyLevel: this.rbac.getHierarchyLevel(role),
      },
      claims: {
        orgId: auth.orgId,
        role: auth.orgRole,
        appMetadata,
      },
    };
  }
}
