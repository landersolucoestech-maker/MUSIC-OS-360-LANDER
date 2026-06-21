import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { ADMIN_DATA_SOURCE } from '../../database/database.tokens';
import { getPersistedAuthorityMode } from './rbac-authority-mode';
import { Sentry } from '../../instrument';

/** The four explicit RBAC error classes the GO/NO-GO audit measures. */
export type RbacErrorType =
  | 'cache_error'
  | 'shadow_error'
  | 'guard_error'
  | 'permission_resolution_error';

export interface RbacErrorContext {
  errorType: RbacErrorType;
  errorSource: string; // e.g. 'JwtAuthGuard', 'PermissionResolver', 'RbacDistributedCache'
  request?: Request;
  tenantId?: string | null;
  userId?: string | null;
  error?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Dedicated, explicit error sink for the RBAC pipeline. Every unexpected failure
 * is recorded as its own row in `rbac_error_logs` plus a structured log, an
 * in-memory counter and a Sentry event. NEVER throws and NEVER alters the
 * authorization result — observability must not influence authority.
 */
@Injectable()
export class RbacErrorLogService {
  private readonly logger = new Logger(RbacErrorLogService.name);
  private readonly counters: Record<RbacErrorType, number> = {
    cache_error: 0,
    shadow_error: 0,
    guard_error: 0,
    permission_resolution_error: 0,
  };

  constructor(
    @Inject(ADMIN_DATA_SOURCE) private readonly ds: DataSource | null,
  ) {}

  /** Returns the in-memory error counters (process-local; DB is source of truth). */
  getCounters(): Readonly<Record<RbacErrorType, number>> {
    return { ...this.counters };
  }

  async record(ctx: RbacErrorContext): Promise<void> {
    this.counters[ctx.errorType] += 1;
    const message =
      ctx.error instanceof Error ? ctx.error.message : ctx.error != null ? String(ctx.error) : null;
    const stack = ctx.error instanceof Error ? ctx.error.stack ?? null : null;
    const requestId = ctx.request?.requestId ?? null;
    const traceId =
      ctx.request?.traceId ?? ctx.request?.correlationId ?? ctx.request?.requestId ?? null;
    const tenantId =
      ctx.tenantId ??
      this.str((ctx.request?.tenant as Record<string, unknown> | undefined)?.['id']);
    const userId = ctx.userId ?? ctx.request?.auth?.userId ?? null;
    const authorityMode = getPersistedAuthorityMode();

    // 1) structured log (always)
    this.logger.error(
      JSON.stringify({
        event: 'rbac_error',
        errorType: ctx.errorType,
        errorSource: ctx.errorSource,
        requestId,
        traceId,
        tenantId,
        userId,
        message,
        authorityMode,
        ...(ctx.metadata ? { metadata: ctx.metadata } : {}),
      }),
    );

    // 2) Sentry (best effort)
    try {
      Sentry.captureMessage(`rbac_error:${ctx.errorType}`, {
        level: 'error',
        tags: { errorSource: ctx.errorSource, authorityMode, ...(requestId ? { requestId } : {}) },
        extra: { message, tenantId, userId, ...(ctx.metadata ?? {}) },
      });
    } catch {
      /* Sentry is best effort. */
    }

    // 3) persist its own row (best effort; never blocks/altering authz)
    if (!this.ds?.isInitialized) return;
    try {
      await this.ds.query(
        `INSERT INTO rbac_error_logs (
           request_id, trace_id, tenant_id, user_id, error_type, error_source,
           message, stack, authority_mode, metadata
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
        [
          requestId,
          traceId,
          this.uuidOrNull(tenantId),
          this.uuidOrNull(userId),
          ctx.errorType,
          ctx.errorSource,
          message,
          stack,
          authorityMode,
          JSON.stringify(ctx.metadata ?? {}),
        ],
      );
    } catch (persistError) {
      this.logger.error(
        JSON.stringify({
          event: 'rbac_error_persistence_failed',
          message: persistError instanceof Error ? persistError.message : String(persistError),
        }),
      );
    }
  }

  private str(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private uuidOrNull(value: string | null | undefined): string | null {
    return typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
      ? value
      : null;
  }
}
