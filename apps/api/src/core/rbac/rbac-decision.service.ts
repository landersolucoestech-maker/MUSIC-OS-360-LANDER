import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PermissionResolverService } from './permission-resolver.service';
import { RbacTelemetryService } from './rbac-telemetry.service';
import { RbacErrorLogService } from './rbac-error-log.service';
import { getPersistedAuthorityMode } from './rbac-authority-mode';
import type {
  RbacActiveDecisionState,
  RbacComparisonResult,
  RbacDecision,
  RbacEvent,
} from '../../modules/rbac/contracts/rbac-event.contract';
import { Sentry } from '../../instrument';

interface EvaluateInput {
  request: Request;
  requiredPermissions: string[];
  active: RbacActiveDecisionState;
}

@Injectable()
export class RbacDecisionService {
  private readonly logger = new Logger(RbacDecisionService.name);

  constructor(
    private readonly resolver: PermissionResolverService,
    private readonly telemetry: RbacTelemetryService,
    private readonly errorLog: RbacErrorLogService,
  ) {}

  async evaluate(input: EvaluateInput): Promise<RbacDecision> {
    const { request, requiredPermissions, active } = input;
    const member = request.currentMember as Record<string, unknown> | undefined;
    const startedAt = active.startedAt;
    const persisted = await this.resolver.resolvePersisted({
      role:
        typeof member?.['role'] === 'string'
          ? (member['role'] as string)
          : null,
      role_id:
        typeof member?.['role_id'] === 'string'
          ? (member['role_id'] as string)
          : null,
      tenant_id:
        typeof member?.['tenant_id'] === 'string'
          ? (member['tenant_id'] as string)
          : null,
    });

    const granted = new Set(persisted.permissions);
    const shadowDecision: RbacDecision =
      persisted.available &&
      requiredPermissions.every((permission) => granted.has(permission))
        ? 'ALLOW'
        : 'DENY';
    const route = this.endpoint(request);
    const tenant = request.tenant as Record<string, unknown> | undefined;
    const auth = request.auth;

    try {
      for (const permission of requiredPermissions) {
      const [resource, action] = this.permissionParts(permission);
      const permissionShadowDecision: RbacDecision =
        persisted.available && granted.has(permission) ? 'ALLOW' : 'DENY';
      const comparison = this.compare(
        active.decision,
        permissionShadowDecision,
      );
      const event: RbacEvent = {
        requestId: request.requestId,
        traceId:
          request.traceId ??
          request.correlationId ??
          request.requestId,
        timestamp: new Date().toISOString(),
        tenantId:
          this.stringValue(tenant?.['id']) ??
          this.stringValue(member?.['tenant_id']),
        workspaceId:
          this.stringValue(tenant?.['org_id']) ??
          this.stringValue(member?.['org_id']),
        userId: auth?.userId ?? null,
        membershipId: this.stringValue(member?.['id']),
        roleId: this.stringValue(member?.['role_id']),
        roleSlug: this.stringValue(member?.['role']),
        resource,
        action,
        permission,
        endpoint: route,
        method: request.method ?? 'UNKNOWN',
        activeDecision: active.decision,
        shadowDecision: permissionShadowDecision,
        comparison,
        decisionSource: `${active.source}+${persisted.source}`,
        resolverReason: persisted.reason,
        wouldAllow: comparison === 'WOULD_ALLOW',
        wouldDeny: comparison === 'WOULD_DENY',
        latencyMs: Math.max(0, Date.now() - startedAt),
        cacheHit: persisted.cacheHit,
        authorityMode: getPersistedAuthorityMode(),
      };
      await this.telemetry.record(event);
      }
    } catch (error) {
      // shadow comparison / telemetry construction failed — record explicitly.
      void this.errorLog.record({
        errorType: 'shadow_error',
        errorSource: 'RbacDecisionService',
        request,
        error,
      });
    }

    if (!persisted.available) {
      this.captureResolverFailure(request, persisted.reason);
      void this.errorLog.record({
        errorType: 'permission_resolution_error',
        errorSource: 'PermissionResolver',
        request,
        error: new Error(persisted.reason ?? 'resolver unavailable'),
      });
    }
    return shadowDecision;
  }

  private compare(
    active: RbacDecision,
    shadow: RbacDecision,
  ): RbacComparisonResult {
    if (active === 'ALLOW' && shadow === 'ALLOW') return 'ALLOW_MATCH';
    if (active === 'DENY' && shadow === 'DENY') return 'DENY_MATCH';
    if (active === 'DENY' && shadow === 'ALLOW') return 'WOULD_ALLOW';
    return 'WOULD_DENY';
  }

  private endpoint(request: Request): string {
    const routePath =
      typeof request.route?.path === 'string'
        ? request.route.path
        : request.path;
    const base = request.baseUrl ?? '';
    return `${base}${routePath || request.originalUrl || request.url}`;
  }

  private permissionParts(permission: string): [string, string] {
    const separator = permission.indexOf(':');
    if (separator < 1) return [permission, 'unknown'];
    return [
      permission.slice(0, separator),
      permission.slice(separator + 1),
    ];
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private captureResolverFailure(request: Request, reason: string): void {
    this.logger.error(
      JSON.stringify({
        event: 'rbac_resolver_failure',
        requestId: request.requestId,
        traceId: request.traceId,
        reason,
      }),
    );
    try {
      Sentry.captureMessage('RBAC resolver failure', {
        level: 'error',
        tags: {
          requestId: request.requestId,
          traceId: request.traceId ?? request.correlationId ?? request.requestId,
        },
        extra: { reason },
      });
    } catch {
      // Authorization must not depend on the error tracker.
    }
  }
}
