import type { Request } from 'express';
import type { PermissionResolverService } from './permission-resolver.service';
import { RbacDecisionService } from './rbac-decision.service';
import type { RbacTelemetryService } from './rbac-telemetry.service';

function request(): Request {
  return {
    method: 'GET',
    path: '/artists',
    baseUrl: '/api/v1',
    url: '/artists',
    originalUrl: '/api/v1/artists',
    route: { path: '/artists' },
    requestId: 'request-1',
    traceId: 'trace-1',
    correlationId: 'trace-1',
    auth: {
      userId: 'user-1',
      sessionId: 'session-1',
      orgId: 'org-1',
      orgRole: 'viewer',
      claims: {},
    },
    tenant: { id: 'tenant-1', org_id: 'org-1' },
    currentMember: {
      id: 'membership-1',
      tenant_id: 'tenant-1',
      org_id: 'org-1',
      role: 'viewer',
      role_id: 'role-1',
    },
  } as unknown as Request;
}

describe('RbacDecisionService comparisons', () => {
  it.each([
    ['ALLOW', ['artist:read'], 'ALLOW_MATCH'],
    ['DENY', [], 'DENY_MATCH'],
    ['DENY', ['artist:read'], 'WOULD_ALLOW'],
    ['ALLOW', [], 'WOULD_DENY'],
  ] as const)(
    '%s versus persisted permissions produces %s',
    async (activeDecision, permissions, comparison) => {
      const resolver = {
        resolvePersisted: jest.fn().mockResolvedValue({
          permissions,
          available: true,
          cacheHit: true,
          source: 'persisted_role_permissions',
          reason: 'role_permissions_resolved',
        }),
      } as unknown as PermissionResolverService;
      const telemetry = {
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as RbacTelemetryService;
      const errorLog = { record: jest.fn().mockResolvedValue(undefined) } as any;
      const service = new RbacDecisionService(resolver, telemetry, errorLog);

      await service.evaluate({
        request: request(),
        requiredPermissions: ['artist:read'],
        active: {
          decision: activeDecision,
          source: 'legacy_role_hierarchy',
          reason: null,
          requiredRoles: ['viewer'],
          startedAt: Date.now(),
        },
      });

      expect(telemetry.record).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'request-1',
          traceId: 'trace-1',
          tenantId: 'tenant-1',
          membershipId: 'membership-1',
          permission: 'artist:read',
          activeDecision,
          comparison,
          wouldAllow: comparison === 'WOULD_ALLOW',
          wouldDeny: comparison === 'WOULD_DENY',
          authorityMode: 'SHADOW',
        }),
      );
    },
  );
});
