import { Optional,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ADMIN_DATA_SOURCE } from '../../database/database.tokens';
import { MetricsService } from '../metrics/metrics.service';
import { Sentry } from '../../instrument';
import type { RbacEvent } from '../../modules/rbac/contracts/rbac-event.contract';

@Injectable()
export class RbacTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RbacTelemetryService.name);
  private retentionTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(ADMIN_DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly metrics: MetricsService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private getConfigNumber(key: string, fallback: number): number {
    return this.config?.get<number>(key, fallback) ?? Number(process.env[key] ?? fallback);
  }

  private getConfigString(key: string): string | undefined {
    return this.config?.get<string>(key) ?? process.env[key];
  }

  onModuleInit(): void {
    const intervalHours = this.getConfigNumber(
      'RBAC_DECISION_RETENTION_INTERVAL_HOURS',
      6,
    );
    this.retentionTimer = setInterval(
      () => void this.pruneExpired(),
      intervalHours * 60 * 60 * 1_000,
    );
    this.retentionTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.retentionTimer) clearInterval(this.retentionTimer);
  }

  async record(event: RbacEvent): Promise<void> {
    this.metrics.recordRbacDecision(event);
    this.logger.log(JSON.stringify({ event: 'rbac_decision', ...event }));
    this.captureSentry(event);

    if (!this.ds?.isInitialized) {
      this.logger.warn('RBAC telemetry database unavailable');
      return;
    }

    try {
      await this.ds.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO rbac_decision_logs (
             request_id, trace_id, tenant_id, workspace_id, user_id,
             membership_id, role_id, role_slug, resource, action, permission,
             endpoint, method, active_decision, shadow_decision,
             comparison_result, decision_source, resolver_reason,
             would_allow, would_deny, latency_ms, cache_hit, authority_mode,
             created_at
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
             $19,$20,$21,$22,$23,$24
           )`,
          [
            event.requestId,
            event.traceId,
            event.tenantId,
            event.workspaceId,
            event.userId,
            event.membershipId,
            event.roleId,
            event.roleSlug,
            event.resource,
            event.action,
            event.permission,
            event.endpoint,
            event.method,
            event.activeDecision,
            event.shadowDecision,
            event.comparison,
            event.decisionSource,
            event.resolverReason,
            event.wouldAllow,
            event.wouldDeny,
            event.latencyMs,
            event.cacheHit,
            event.authorityMode,
            event.timestamp,
          ],
        );

        if (
          this.getConfigString('RBAC_AUDIT_MIRROR_ENABLED') !== 'false'
        ) {
          const auditActions = [
            `rbac.${event.activeDecision.toLowerCase()}`,
            event.wouldAllow
              ? 'rbac.would_allow'
              : event.wouldDeny
                ? 'rbac.would_deny'
                : null,
            event.cacheHit ? 'rbac.cache_hit' : 'rbac.cache_miss',
          ].filter((action): action is string => action !== null);
          for (const auditAction of auditActions) {
            await manager.query(
              `INSERT INTO audit_logs (
                 tenant_id, org_id, user_id, actor_role, action, entity,
                 entity_id, request_id, correlation_id, http_method, http_path,
                 metadata, created_at
               ) VALUES (
                 $1,$2,$3,$4,$5,'rbac_decision',$6,$7,$8,$9,$10,$11::jsonb,$12
               )`,
              [
                event.tenantId,
                event.workspaceId,
                event.userId,
                event.roleSlug,
                auditAction,
                event.roleId,
                event.requestId,
                event.traceId,
                event.method,
                event.endpoint,
                JSON.stringify({
                  resource: event.resource,
                  action: event.action,
                  permission: event.permission,
                  activeDecision: event.activeDecision,
                  shadowDecision: event.shadowDecision,
                  comparison: event.comparison,
                  authorityMode: event.authorityMode,
                  cacheHit: event.cacheHit,
                  latencyMs: event.latencyMs,
                }),
                event.timestamp,
              ],
            );
          }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        JSON.stringify({
          event: 'rbac_telemetry_persistence_failed',
          requestId: event.requestId,
          message,
        }),
      );
      try {
        Sentry.captureMessage('RBAC telemetry persistence failed', {
          level: 'error',
          extra: { requestId: event.requestId, message },
        });
      } catch {
        // Telemetry must never alter the authorization result.
      }
    }
  }

  private async pruneExpired(): Promise<void> {
    if (!this.ds?.isInitialized) return;
    const retentionDays = this.getConfigNumber(
      'RBAC_DECISION_RETENTION_DAYS',
      30,
    );
    try {
      const result = (await this.ds.query(
        `DELETE FROM rbac_decision_logs
          WHERE created_at < now() - ($1::text || ' days')::interval`,
        [retentionDays],
      )) as [unknown[], number] | unknown;
      this.logger.log(
        JSON.stringify({
          event: 'rbac_retention',
          retentionDays,
          result: Array.isArray(result) ? result[1] ?? 0 : 0,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'rbac_retention_failed',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  private captureSentry(event: RbacEvent): void {
    if (
      !event.wouldAllow &&
      !event.wouldDeny &&
      event.activeDecision !== 'DENY'
    ) {
      return;
    }
    try {
      Sentry.withScope((scope) => {
        scope.setTag('rbac.comparison', event.comparison);
        scope.setTag('rbac.resource', event.resource);
        scope.setTag('rbac.action', event.action);
        scope.setTag('rbac.role', event.roleSlug ?? 'unknown');
        scope.setTag('tenantId', event.tenantId ?? 'unknown');
        scope.setTag('requestId', event.requestId);
        scope.setTag('traceId', event.traceId);
        if (event.userId) scope.setUser({ id: event.userId });
        scope.setContext('rbac', {
          endpoint: event.endpoint,
          permission: event.permission,
          activeDecision: event.activeDecision,
          shadowDecision: event.shadowDecision,
          authorityMode: event.authorityMode,
        });
        const eventName = event.wouldDeny
          ? 'would_deny'
          : event.wouldAllow
            ? 'would_allow'
            : 'authorization_failure';
        Sentry.captureMessage(eventName, 'warning');
      });
    } catch {
      // Sentry is best effort.
    }
  }
}
