import 'reflect-metadata';

jest.mock('jwks-rsa', () => jest.fn(() => ({ getSigningKey: jest.fn() })));

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantBootstrapResolver } from '../../database/tenant-bootstrap.resolver';
import { TenantGuard } from './tenant.guard';

const TENANT = {
  id: '10000000-0000-0000-0000-000000000002',
  org_id: '20000000-0000-0000-0000-000000000002',
  external_auth_org_id: null,
  name: 'Tenant A',
  slug: 'tenant-a',
  plan: 'starter',
  features: {},
  settings: {},
  active: true,
};

const MEMBER = {
  id: '30000000-0000-0000-0000-000000000002',
  org_id: TENANT.org_id,
  tenant_id: TENANT.id,
  auth_user_id: 'user-a',
  email: 'a@example.test',
  full_name: 'User A',
  role: 'owner',
  role_id: null,
  department_id: null,
  position_id: null,
  is_active: true,
};

function context(overrides: Record<string, unknown> = {}) {
  const request: Record<string, unknown> & {
    tenant?: unknown;
    currentMember?: unknown;
  } = {
    headers: { 'x-tenant-id': TENANT.id },
    auth: {
      userId: MEMBER.auth_user_id,
      sessionId: 'session-a',
      orgId: TENANT.org_id,
      orgRole: 'owner',
      claims: {},
    },
    ...overrides,
  };
  return {
    request,
    executionContext: {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext,
  };
}

function setup(
  tenant: typeof TENANT | null = TENANT,
  member: typeof MEMBER | null = MEMBER,
) {
  const resolver = {
    resolveTenant: jest.fn().mockResolvedValue(tenant),
    resolveMembership: jest.fn().mockResolvedValue(member),
  } as unknown as TenantBootstrapResolver;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  return { guard: new TenantGuard(resolver, reflector), resolver };
}

describe('TenantGuard bootstrap', () => {
  it('resolves tenant and membership without DATA_SOURCE and fills the request', async () => {
    const { guard, resolver } = setup();
    const { request, executionContext } = context();

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(resolver.resolveTenant).toHaveBeenCalledWith(TENANT.org_id);
    expect(resolver.resolveMembership).toHaveBeenCalledWith(TENANT.id, MEMBER.auth_user_id);
    expect(request.tenant).toEqual(TENANT);
    expect(request.currentMember).toEqual(MEMBER);
  });

  it('returns 401 for an unknown tenant identity', async () => {
    const { guard } = setup(null, null);
    const { executionContext } = context();
    await expect(guard.canActivate(executionContext)).rejects.toThrow(UnauthorizedException);
  });

  it('returns 403 for an invalid membership', async () => {
    const { guard } = setup(TENANT, null);
    const { executionContext } = context();
    await expect(guard.canActivate(executionContext)).rejects.toThrow(ForbiddenException);
  });

  it('returns 403 when X-Tenant-ID does not match the resolved tenant', async () => {
    const { guard } = setup();
    const { executionContext } = context({
      headers: { 'x-tenant-id': '40000000-0000-0000-0000-000000000002' },
    });
    await expect(guard.canActivate(executionContext)).rejects.toThrow(ForbiddenException);
  });

  it('returns 401 when the JWT has no organization identity', async () => {
    const { guard } = setup();
    const { executionContext } = context({
      auth: {
        userId: MEMBER.auth_user_id,
        sessionId: 'session-a',
        orgId: null,
        orgRole: 'owner',
        claims: {},
      },
    });
    await expect(guard.canActivate(executionContext)).rejects.toThrow(UnauthorizedException);
  });
});
